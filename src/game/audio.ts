export type GameSound =
  | "step"
  | "talk"
  | "select"
  | "confirm"
  | "encounter"
  | "hit"
  | "win"
  | "transition";

export type MusicMode = "garden" | "route" | "battle" | "trial";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type Tone = {
  frequency: number;
  duration: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
};

const soundTones: Record<GameSound, readonly Tone[]> = {
  step: [{ frequency: 120, duration: 0.035, type: "triangle", gain: 0.04 }],
  talk: [
    { frequency: 420, duration: 0.035, type: "square", gain: 0.035 },
    {
      frequency: 510,
      duration: 0.035,
      delay: 0.04,
      type: "square",
      gain: 0.03,
    },
  ],
  select: [{ frequency: 660, duration: 0.045, type: "triangle", gain: 0.04 }],
  confirm: [
    { frequency: 540, duration: 0.04, type: "triangle", gain: 0.04 },
    {
      frequency: 760,
      duration: 0.055,
      delay: 0.05,
      type: "triangle",
      gain: 0.04,
    },
  ],
  encounter: [
    { frequency: 180, duration: 0.08, type: "sawtooth", gain: 0.035 },
    {
      frequency: 260,
      duration: 0.08,
      delay: 0.08,
      type: "sawtooth",
      gain: 0.035,
    },
    {
      frequency: 390,
      duration: 0.1,
      delay: 0.16,
      type: "sawtooth",
      gain: 0.035,
    },
  ],
  hit: [
    { frequency: 210, duration: 0.05, type: "square", gain: 0.05 },
    {
      frequency: 145,
      duration: 0.07,
      delay: 0.045,
      type: "square",
      gain: 0.04,
    },
  ],
  win: [
    { frequency: 523.25, duration: 0.08, type: "triangle", gain: 0.045 },
    {
      frequency: 659.25,
      duration: 0.08,
      delay: 0.09,
      type: "triangle",
      gain: 0.045,
    },
    {
      frequency: 783.99,
      duration: 0.12,
      delay: 0.18,
      type: "triangle",
      gain: 0.045,
    },
  ],
  transition: [
    { frequency: 330, duration: 0.06, type: "sine", gain: 0.03 },
    { frequency: 247, duration: 0.1, delay: 0.06, type: "sine", gain: 0.03 },
  ],
};

const musicPatterns: Record<MusicMode, readonly number[]> = {
  garden: [261.63, 329.63, 392, 329.63, 293.66, 349.23, 392, 349.23],
  route: [293.66, 392, 440, 392, 329.63, 392, 493.88, 440],
  battle: [220, 261.63, 329.63, 261.63, 246.94, 293.66, 349.23, 293.66],
  trial: [246.94, 329.63, 369.99, 329.63, 277.18, 369.99, 415.3, 369.99],
};

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicTimer: number | null = null;
let musicStep = 0;
let activeMusicMode: MusicMode | null = null;

export function primeAudio() {
  const context = getAudioContext();

  if (context?.state === "suspended") {
    void context.resume();
  }
}

export function playGameSound(sound: GameSound) {
  const context = getAudioContext();

  if (!context) {
    return;
  }

  primeAudio();
  const now = context.currentTime;

  for (const tone of soundTones[sound]) {
    scheduleTone(context, {
      ...tone,
      delay: (tone.delay ?? 0) + now,
    });
  }
}

export function startMusicLoop(mode: MusicMode) {
  if (activeMusicMode === mode) {
    return;
  }

  stopMusicLoop();
  activeMusicMode = mode;
  musicStep = 0;

  const tick = () => {
    const context = getAudioContext();

    if (!context || !activeMusicMode) {
      return;
    }

    const pattern = musicPatterns[activeMusicMode];
    const note = pattern[musicStep % pattern.length] ?? 261.63;
    const bass = note / 2;
    musicStep += 1;

    scheduleTone(context, {
      frequency: note,
      duration: 0.18,
      delay: context.currentTime,
      type: "triangle",
      gain: 0.018,
    });
    scheduleTone(context, {
      frequency: bass,
      duration: 0.24,
      delay: context.currentTime,
      type: "sine",
      gain: 0.012,
    });
  };

  tick();

  if (typeof window !== "undefined") {
    musicTimer = window.setInterval(tick, mode === "garden" ? 520 : 420);
  }
}

export function stopMusicLoop() {
  if (musicTimer !== null && typeof window !== "undefined") {
    window.clearInterval(musicTimer);
  }

  musicTimer = null;
  activeMusicMode = null;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext && audioContext.state !== "closed") {
    return audioContext;
  }

  const audioWindow = window as AudioWindow;
  const AudioContextConstructor =
    audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext = new AudioContextConstructor();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0.28;
  masterGain.connect(audioContext.destination);

  return audioContext;
}

function scheduleTone(context: AudioContext, tone: Tone) {
  if (!masterGain) {
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const startTime = tone.delay ?? context.currentTime;
  const endTime = startTime + tone.duration;

  oscillator.type = tone.type ?? "sine";
  oscillator.frequency.setValueAtTime(tone.frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.04, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
  oscillator.connect(gain);
  gain.connect(masterGain);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
}
