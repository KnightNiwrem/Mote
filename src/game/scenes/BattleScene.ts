import * as Phaser from "phaser";
import { ensurePolishTextures } from "@/game/art";
import { playGameSound, primeAudio, startMusicLoop } from "@/game/audio";
import { GAME_VIEWPORT } from "@/game/config";
import { MOTE_BODIES } from "@/game/data/bodies";
import type { Direction, GridPosition, WorldMapId } from "@/game/data/maps";
import { MOTE_MOVES } from "@/game/data/moves";
import { FIRST_TRIAL_ID, TRIALS, type TrialId } from "@/game/data/trials";
import { GAME_CONTROL_EVENT, type GameControlInput } from "@/game/input";
import {
  applyBattleResultToSave,
  assignAcquiredBodyToCircle,
  createTrialBattleState,
  createWildBattleState,
  getNewlyAcquiredBodyId,
  resolveBattleTurn,
} from "@/game/systems/battle";
import { getOccupiedCircleSlots } from "@/game/systems/moteCircle";
import {
  createInitialSaveGame,
  loadOrCreateSaveGame,
  saveGame,
} from "@/game/systems/save";
import { applyTrialBattleResultToSave } from "@/game/systems/trials";
import type { BattleState } from "@/game/types/battle";
import type { OccupiedCircleSlot, SaveGame } from "@/game/types/save";
import { fadeInScene, fadeToScene } from "./transitions";

type BattleSceneData = {
  returnMapId?: WorldMapId;
  returnTile?: GridPosition;
  enemyBodyId?: string;
  battleKind?: "wild" | "trial";
  trialId?: TrialId;
};

type BattleKeys = {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  enter: Phaser.Input.Keyboard.Key;
};

const BATTLE_PANEL_COLOR = 0x101820;
const HP_BAR_WIDTH = 70;

export class BattleScene extends Phaser.Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: BattleKeys | null = null;
  private battleState: BattleState | null = null;
  private currentSave: SaveGame = createInitialSaveGame();
  private returnMapId: WorldMapId = "motehaven-path";
  private returnTile: GridPosition = { x: 2, y: 8 };
  private selectedMoveIndex = 0;
  private playerMoveIds: string[] = [];
  private touchActionQueued = false;
  private queuedMenuDirection: Direction | null = null;
  private resultSaved = false;
  private acquiredBodyPromptId: string | null = null;
  private selectedAssignmentOption = 0;
  private postBattleMessage: string | null = null;
  private battleKind: "wild" | "trial" = "wild";
  private trialId: TrialId = FIRST_TRIAL_ID;
  private playerNameText: Phaser.GameObjects.Text | null = null;
  private enemyNameText: Phaser.GameObjects.Text | null = null;
  private playerHpText: Phaser.GameObjects.Text | null = null;
  private enemyHpText: Phaser.GameObjects.Text | null = null;
  private playerHpFill: Phaser.GameObjects.Rectangle | null = null;
  private enemyHpFill: Phaser.GameObjects.Rectangle | null = null;
  private logText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private moveTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super("Battle");
  }

  init(data: BattleSceneData) {
    this.currentSave = loadOrCreateSaveGame();
    this.returnMapId = data.returnMapId ?? this.currentSave.player.currentMapId;
    this.returnTile = data.returnTile ?? this.currentSave.player.position;
    this.selectedMoveIndex = 0;
    this.touchActionQueued = false;
    this.queuedMenuDirection = null;
    this.resultSaved = false;
    this.acquiredBodyPromptId = null;
    this.selectedAssignmentOption = 0;
    this.postBattleMessage = null;
    this.battleKind = data.battleKind ?? "wild";
    this.trialId = data.trialId ?? FIRST_TRIAL_ID;
    this.moveTexts = [];

    const playerSlot = getFirstBattleSlot(this.currentSave);
    this.battleState =
      this.battleKind === "trial"
        ? createTrialBattleState({
            playerSlot,
            trialId: this.trialId,
          })
        : createWildBattleState({
            playerSlot,
            enemyBodyId: data.enemyBodyId,
          });
    this.playerMoveIds = this.battleState.player.moves.slice(0, 4);
  }

  create() {
    this.cameras.main.setBackgroundColor("#183329");
    ensurePolishTextures(this);
    startMusicLoop(this.battleKind === "trial" ? "trial" : "battle");
    fadeInScene(this);
    this.createControls();
    this.createBackdrop();
    this.createCombatants();
    this.createUi();
    this.updateBattleUi();
  }

  override update() {
    if (!this.battleState) {
      return;
    }

    if (this.battleState.outcome !== "active") {
      if (this.acquiredBodyPromptId) {
        const direction = this.consumeMenuDirection();
        if (direction) {
          this.moveAssignmentSelection(direction);
        }

        if (this.isActionPressed()) {
          this.confirmAssignmentPrompt();
        }

        return;
      }

      if (this.isActionPressed()) {
        this.returnToWorld();
      }
      return;
    }

    const direction = this.consumeMenuDirection();
    if (direction) {
      this.moveSelection(direction);
    }

    if (this.isActionPressed()) {
      this.selectMove();
    }
  }

  private createBackdrop() {
    this.add
      .rectangle(
        GAME_VIEWPORT.width / 2,
        GAME_VIEWPORT.height / 2,
        GAME_VIEWPORT.width,
        GAME_VIEWPORT.height,
        0x1f513f,
      )
      .setDepth(0);
    this.add
      .ellipse(224, 70, 92, 22, 0x2f6b56, 0.9)
      .setStrokeStyle(1, 0x9b7b4f)
      .setDepth(1);
    this.add
      .ellipse(80, 108, 100, 24, 0x2f6b56, 0.9)
      .setStrokeStyle(1, 0x9b7b4f)
      .setDepth(1);
  }

  private createCombatants() {
    if (!this.battleState) {
      return;
    }

    this.add.ellipse(224, 64, 34, 8, 0x0d1d18, 0.35).setDepth(1);
    this.add
      .sprite(224, 52, getBodyTextureKey(this.battleState.enemy.bodyId))
      .setScale(1.35)
      .setDepth(2);
    this.add.ellipse(80, 102, 34, 8, 0x0d1d18, 0.35).setDepth(1);
    this.add
      .sprite(80, 90, getBodyTextureKey(this.battleState.player.bodyId))
      .setScale(1.45)
      .setDepth(2);
  }

  private createUi() {
    this.enemyNameText = this.add.text(16, 14, "", {
      color: "#f8fafc",
      fontFamily: "monospace",
      fontSize: "9px",
      stroke: "#101820",
      strokeThickness: 2,
    });
    this.enemyHpText = this.add.text(16, 28, "", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });
    this.enemyHpFill = this.createHpBar(16, 42);

    this.playerNameText = this.add.text(176, 76, "", {
      color: "#f8fafc",
      fontFamily: "monospace",
      fontSize: "9px",
      stroke: "#101820",
      strokeThickness: 2,
    });
    this.playerHpText = this.add.text(176, 90, "", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });
    this.playerHpFill = this.createHpBar(176, 104);

    const panel = this.add
      .rectangle(160, 151, 304, 52, BATTLE_PANEL_COLOR, 0.96)
      .setStrokeStyle(1, 0x7dd3fc);

    this.logText = this.add.text(18, 130, "", {
      color: "#f8fafc",
      fontFamily: "monospace",
      fontSize: "8px",
      lineSpacing: 2,
      wordWrap: { width: 132 },
    });
    this.hintText = this.add.text(238, 168, "A Select", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });

    this.moveTexts = this.playerMoveIds.map((_, index) =>
      this.add.text(
        166 + (index % 2) * 70,
        128 + Math.floor(index / 2) * 17,
        "",
        {
          color: "#f8fafc",
          fontFamily: "monospace",
          fontSize: "8px",
        },
      ),
    );

    this.add
      .container(0, 0, [panel, this.logText, this.hintText, ...this.moveTexts])
      .setDepth(10)
      .setScrollFactor(0);
  }

  private createHpBar(x: number, y: number): Phaser.GameObjects.Rectangle {
    this.add
      .rectangle(x, y, HP_BAR_WIDTH, 5, 0x0d1d18)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x0f172a);

    return this.add
      .rectangle(x, y, HP_BAR_WIDTH, 5, 0x34d399)
      .setOrigin(0, 0.5);
  }

  private createControls() {
    window.addEventListener(GAME_CONTROL_EVENT, this.handleGameControl);
    this.events.once("shutdown", () => {
      window.removeEventListener(GAME_CONTROL_EVENT, this.handleGameControl);
    });

    if (!this.input.keyboard) {
      return;
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = {
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      enter: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };
  }

  private updateBattleUi() {
    if (!this.battleState) {
      return;
    }

    const { player, enemy } = this.battleState;
    this.enemyNameText?.setText(enemy.name);
    this.enemyHpText?.setText(`HP ${enemy.currentHp}/${enemy.maxHp}`);
    this.enemyHpFill?.setDisplaySize(getHpBarWidth(enemy), 5);
    this.playerNameText?.setText(player.name);
    this.playerHpText?.setText(`HP ${player.currentHp}/${player.maxHp}`);
    this.playerHpFill?.setDisplaySize(getHpBarWidth(player), 5);
    this.logText?.setText(this.battleState.log.slice(-2).join("\n"));

    if (this.acquiredBodyPromptId) {
      this.updateAssignmentPromptUi(this.acquiredBodyPromptId);
      return;
    }

    if (this.postBattleMessage) {
      this.logText?.setText(this.postBattleMessage);
    }

    for (const [index, text] of this.moveTexts.entries()) {
      const moveId = this.playerMoveIds[index];
      const move = moveId ? MOTE_MOVES[moveId] : null;
      const marker = index === this.selectedMoveIndex ? ">" : " ";

      text.setText(
        move && this.battleState.outcome === "active"
          ? `${marker} ${move.name}`
          : "",
      );
      text.setColor(index === this.selectedMoveIndex ? "#f5d0fe" : "#f8fafc");
    }

    if (this.battleState.outcome === "active") {
      this.hintText?.setText("A Select");
    } else {
      this.hintText?.setText("A Return");
    }
  }

  private moveSelection(direction: Direction) {
    const deltaByDirection: Record<Direction, number> = {
      up: -2,
      down: 2,
      left: -1,
      right: 1,
    };
    const nextIndex = clamp(
      this.selectedMoveIndex + deltaByDirection[direction],
      0,
      this.playerMoveIds.length - 1,
    );

    if (nextIndex !== this.selectedMoveIndex) {
      this.selectedMoveIndex = nextIndex;
      playGameSound("select");
      this.updateBattleUi();
    }
  }

  private moveAssignmentSelection(direction: Direction) {
    if (direction !== "left" && direction !== "right") {
      return;
    }

    this.selectedAssignmentOption = this.selectedAssignmentOption === 0 ? 1 : 0;
    playGameSound("select");
    this.updateBattleUi();
  }

  private selectMove() {
    if (!this.battleState) {
      return;
    }

    const moveId = this.playerMoveIds[this.selectedMoveIndex];
    if (!moveId) {
      return;
    }

    const result = resolveBattleTurn(this.battleState, moveId);
    this.battleState = result.state;
    playGameSound("hit");

    if (this.battleState.outcome !== "active" && !this.resultSaved) {
      const acquiredBodyId =
        this.battleKind === "wild"
          ? getNewlyAcquiredBodyId(this.currentSave, this.battleState)
          : null;
      this.currentSave =
        this.battleKind === "trial"
          ? applyTrialBattleResultToSave(
              this.currentSave,
              this.battleState,
              this.trialId,
            )
          : applyBattleResultToSave(this.currentSave, this.battleState);
      saveGame(this.currentSave);
      this.resultSaved = true;
      this.acquiredBodyPromptId = acquiredBodyId;
      this.selectedAssignmentOption = 0;
      this.postBattleMessage =
        this.battleKind === "trial"
          ? getTrialResultMessage(this.battleState, this.trialId)
          : null;
      playGameSound(this.battleState.outcome === "player-win" ? "win" : "hit");
    }

    this.updateBattleUi();
  }

  private confirmAssignmentPrompt() {
    const bodyId = this.acquiredBodyPromptId;

    if (!bodyId) {
      return;
    }

    const bodyName = getBodyName(bodyId);

    if (this.selectedAssignmentOption === 0) {
      try {
        this.currentSave = assignAcquiredBodyToCircle(this.currentSave, bodyId);
        saveGame(this.currentSave);
        this.postBattleMessage = `${bodyName} joined the Circle with a Base Mind.`;
      } catch {
        this.postBattleMessage = `${bodyName} is saved in body inventory.`;
      }
    } else {
      this.postBattleMessage = `${bodyName} is saved in body inventory.`;
    }

    playGameSound("confirm");
    this.acquiredBodyPromptId = null;
    this.updateBattleUi();
  }

  private updateAssignmentPromptUi(bodyId: string) {
    this.logText?.setText(
      `New body acquired: ${getBodyName(bodyId)}.\nAssign to Circle?`,
    );
    this.hintText?.setText("A Confirm");

    for (const [index, text] of this.moveTexts.entries()) {
      if (index > 1) {
        text.setText("");
        continue;
      }

      const label = index === 0 ? "Assign" : "Keep";
      const marker = index === this.selectedAssignmentOption ? ">" : " ";
      text.setText(`${marker} ${label}`);
      text.setColor(
        index === this.selectedAssignmentOption ? "#f5d0fe" : "#f8fafc",
      );
    }
  }

  private consumeMenuDirection(): Direction | null {
    if (this.queuedMenuDirection) {
      const direction = this.queuedMenuDirection;
      this.queuedMenuDirection = null;
      return direction;
    }

    if (
      this.cursors?.left &&
      Phaser.Input.Keyboard.JustDown(this.cursors.left)
    ) {
      return "left";
    }
    if (
      this.cursors?.right &&
      Phaser.Input.Keyboard.JustDown(this.cursors.right)
    ) {
      return "right";
    }
    if (this.cursors?.up && Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
      return "up";
    }
    if (
      this.cursors?.down &&
      Phaser.Input.Keyboard.JustDown(this.cursors.down)
    ) {
      return "down";
    }
    if (this.keys?.a && Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      return "left";
    }
    if (this.keys?.d && Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      return "right";
    }
    if (this.keys?.w && Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      return "up";
    }
    if (this.keys?.s && Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      return "down";
    }

    return null;
  }

  private isActionPressed(): boolean {
    const space = this.cursors?.space;
    if (this.touchActionQueued) {
      this.touchActionQueued = false;
      primeAudio();
      return true;
    }

    const pressed = Boolean(
      (space && Phaser.Input.Keyboard.JustDown(space)) ||
        (this.keys?.e && Phaser.Input.Keyboard.JustDown(this.keys.e)) ||
        (this.keys?.enter && Phaser.Input.Keyboard.JustDown(this.keys.enter)),
    );

    if (pressed) {
      primeAudio();
    }

    return pressed;
  }

  private returnToWorld() {
    playGameSound("transition");
    fadeToScene(this, "World", {
      mapId: this.returnMapId,
      playerTile: this.returnTile,
    });
  }

  private readonly handleGameControl = (event: Event) => {
    const input = (event as CustomEvent<GameControlInput>).detail;

    switch (input.type) {
      case "direction-start":
        this.queuedMenuDirection = input.direction;
        break;
      case "direction-end":
        break;
      case "action":
        primeAudio();
        this.touchActionQueued = true;
        break;
    }
  };
}

function getFirstBattleSlot(save: SaveGame): OccupiedCircleSlot {
  const slot = getOccupiedCircleSlots(save.circle)[0];

  if (slot) {
    return slot;
  }

  const fallbackSlot = getOccupiedCircleSlots(
    createInitialSaveGame().circle,
  )[0];

  if (!fallbackSlot) {
    throw new Error("Expected initial save to include an occupied Circle slot");
  }

  return fallbackSlot;
}

function getHpBarWidth(combatant: {
  currentHp: number;
  maxHp: number;
}): number {
  return Math.max(
    0,
    Math.round((combatant.currentHp / combatant.maxHp) * HP_BAR_WIDTH),
  );
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getBodyName(bodyId: string): string {
  return MOTE_BODIES[bodyId]?.name ?? bodyId;
}

function getBodyTextureKey(bodyId: string): string {
  return MOTE_BODIES[bodyId]?.spriteKey ?? "mote-glowbud";
}

function getTrialResultMessage(
  battleState: BattleState,
  trialId: TrialId,
): string {
  const trial = TRIALS[trialId];

  if (battleState.outcome === "player-win") {
    return `${trial.victoryMessage}\n${trial.sovereignHint}`;
  }

  return "Cal Venn: Output below threshold. Return when your Circle is sharper.";
}
