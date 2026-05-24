export type TextSpeed = "slow" | "normal" | "fast";

export type ControlDisplay = "auto" | "always" | "hidden";

export type GameOptions = {
  soundVolume: number;
  musicVolume: number;
  textSpeed: TextSpeed;
  reducedMotion: boolean;
  controlDisplay: ControlDisplay;
};
