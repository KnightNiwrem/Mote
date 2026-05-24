import * as Phaser from "phaser";
import { CHARACTER_TEXTURE_KEYS, ensurePolishTextures } from "@/game/art";
import {
  type GameSound,
  playGameSound,
  primeAudio,
  startMusicLoop,
} from "@/game/audio";
import { MOTE_BODIES } from "@/game/data/bodies";
import { CUTSCENES, type CutsceneId } from "@/game/data/cutscenes";
import type { DialogueId } from "@/game/data/dialogue";
import {
  type Direction,
  type GridPosition,
  TILE_IDS,
  TILE_SIZE,
  type TileId,
  WORLD_MAPS,
  type WorldMap,
  type WorldMapId,
  type WorldNpc,
} from "@/game/data/maps";
import { MOTE_MINDS } from "@/game/data/minds";
import type { TrialId } from "@/game/data/trials";
import {
  dispatchGameRuntimeEvent,
  GAME_CONTROL_EVENT,
  type GameControlInput,
} from "@/game/input";
import {
  applyGardenAction,
  COMPANION_NAME,
  type CompanionState,
  createInitialCompanionState,
  GARDEN_ACTIONS,
  type GardenActionDefinition,
  getCompanionDialogue,
} from "@/game/systems/companion";
import { type CutsceneCommand, runCutscene } from "@/game/systems/cutscenes";
import {
  advanceDialogue,
  type DialogueCommand,
  type DialogueVariables,
  type DialogueView,
  getDialogueStartView,
} from "@/game/systems/dialogue";
import { rollWildEncounter } from "@/game/systems/encounters";
import {
  assignMindToCircleSlot,
  getAvailableMindIds,
  getBondGainModifier,
  getCircleSlotCompatibility,
} from "@/game/systems/mindBody";
import {
  getOccupiedCircleSlots,
  updateCircleSlot,
} from "@/game/systems/moteCircle";
import {
  canMoveTo,
  findNpcFacing,
  findTransitionAt,
  getNextTile,
} from "@/game/systems/movement";
import { advanceQuestObjective } from "@/game/systems/quests";
import {
  createInitialSaveGame,
  loadOrCreateSaveGame,
  saveGame,
} from "@/game/systems/save";
import type { SaveGame } from "@/game/types/save";
import { fadeInScene, fadeToScene } from "./transitions";

type InteractionMode =
  | "none"
  | "dialogue"
  | "garden-menu"
  | "garden-result"
  | "circle-menu";

type GardenMenuItem = GardenActionDefinition | { id: "circle"; label: string };

type WorldSceneData = {
  mapId?: WorldMapId;
  playerTile?: GridPosition;
};

type MovementKeys = {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  enter: Phaser.Input.Keyboard.Key;
};

const TILESET_TEXTURE_KEY = "motehaven-overworld-tiles";
const TILESET_NAME = "motehaven-overworld";
const GARDEN_MENU_ITEMS: readonly GardenMenuItem[] = [
  ...GARDEN_ACTIONS,
  { id: "circle", label: "Circle" },
];

const tilePalette: Record<
  TileId,
  { base: string; accent: string; highlight: string }
> = {
  [TILE_IDS.grass]: {
    base: "#2f6b56",
    accent: "#367a61",
    highlight: "#4f8f79",
  },
  [TILE_IDS.path]: {
    base: "#8d7448",
    accent: "#b7925d",
    highlight: "#d6b981",
  },
  [TILE_IDS.hedge]: {
    base: "#173f32",
    accent: "#25624c",
    highlight: "#3a8064",
  },
  [TILE_IDS.water]: {
    base: "#225f8f",
    accent: "#2f7db8",
    highlight: "#67e8f9",
  },
  [TILE_IDS.flowers]: {
    base: "#356c42",
    accent: "#d96aa0",
    highlight: "#fde68a",
  },
};

export class WorldScene extends Phaser.Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: MovementKeys | null = null;
  private worldMap: WorldMap = WORLD_MAPS.garden;
  private player: Phaser.GameObjects.Sprite | null = null;
  private playerTile: GridPosition = WORLD_MAPS.garden.start;
  private facing: Direction = "down";
  private moving = false;
  private touchActionQueued = false;
  private touchDirection: Direction | null = null;
  private dialogueBox: Phaser.GameObjects.Container | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private dialogueHintText: Phaser.GameObjects.Text | null = null;
  private gardenMenu: Phaser.GameObjects.Container | null = null;
  private gardenMenuItems: Phaser.GameObjects.Text[] = [];
  private promptText: Phaser.GameObjects.Text | null = null;
  private selectedGardenActionIndex = 0;
  private selectedCircleIndex = 0;
  private interactionMode: InteractionMode = "none";
  private companionState: CompanionState = createInitialCompanionState();
  private currentSave: SaveGame = createInitialSaveGame();
  private activeDialogueId: DialogueId | null = null;
  private activeDialogueNodeId: string | null = null;
  private activeDialogueVariables: DialogueVariables = {};
  private activeDialogueView: DialogueView | null = null;
  private activeDialogueChoiceIds: string[] = [];
  private selectedDialogueChoiceIndex = 0;
  private activeCutsceneCommands: CutsceneCommand[] = [];
  private activeCutsceneCommandIndex = 0;
  private cutsceneWaiting = false;
  private pausedByShell = false;
  private lastRuntimeStateKey = "";

  constructor() {
    super("World");
  }

  init(data: WorldSceneData) {
    this.currentSave = loadOrCreateSaveGame();
    const mapId = data.mapId ?? this.currentSave.player.currentMapId;

    this.worldMap = WORLD_MAPS[mapId];
    this.playerTile = data.playerTile ?? this.currentSave.player.position;
    this.facing = "down";
    this.moving = false;
    this.touchActionQueued = false;
    this.touchDirection = null;
    this.selectedGardenActionIndex = 0;
    this.selectedCircleIndex = 0;
    this.interactionMode = "none";
    this.activeDialogueId = null;
    this.activeDialogueNodeId = null;
    this.activeDialogueVariables = {};
    this.activeDialogueView = null;
    this.activeDialogueChoiceIds = [];
    this.selectedDialogueChoiceIndex = 0;
    this.activeCutsceneCommands = [];
    this.activeCutsceneCommandIndex = 0;
    this.cutsceneWaiting = false;
    this.pausedByShell = false;
    this.lastRuntimeStateKey = "";
    this.companionState = this.createCompanionStateFromSave();
    this.persistProgress();
  }

  create() {
    this.cameras.main.setBackgroundColor("#101820");

    startMusicLoop(getMusicMode(this.worldMap.id));
    fadeInScene(this);
    ensurePolishTextures(this);
    this.ensureTilesetTexture();
    this.renderTilemap();
    this.renderNpcs();
    this.createPlayer();
    this.createControls();
    this.createUi();
    this.configureCamera();
    this.publishRuntimeState(true);
  }

  override update() {
    this.publishRuntimeState();

    if (this.pausedByShell) {
      return;
    }

    if (this.cutsceneWaiting) {
      return;
    }

    if (this.isInteractPressed()) {
      if (this.interactionMode === "garden-menu") {
        this.applySelectedGardenAction();
        return;
      }

      if (this.interactionMode === "circle-menu") {
        this.showCompanionMenu();
        return;
      }

      if (this.interactionMode !== "none") {
        this.advanceActiveDialogue();
        return;
      }

      const npc = findNpcFacing(this.worldMap, this.playerTile, this.facing);
      if (npc) {
        if (npc.kind === "wild-mote") {
          this.startWildBattle(npc.battleBodyId ?? "reedling");
        } else if (npc.dialogueId) {
          this.startDialogue(npc.dialogueId);
        } else {
          this.showDialogue(npc);
        }
        return;
      }
    }

    if (this.interactionMode === "garden-menu") {
      this.updateGardenMenuInput();
      return;
    }

    if (this.interactionMode === "circle-menu") {
      this.updateCircleMenuInput();
      return;
    }

    if (
      this.interactionMode === "dialogue" &&
      this.activeDialogueChoiceIds.length > 0
    ) {
      this.updateDialogueChoiceInput();
      return;
    }

    if (this.interactionMode !== "none" || this.moving) {
      return;
    }

    const direction = this.getRequestedDirection();
    if (!direction) {
      this.updatePrompt();
      return;
    }

    this.tryMove(direction);
  }

  private ensureTilesetTexture() {
    if (this.textures.exists(TILESET_TEXTURE_KEY)) {
      return;
    }

    const tileCount = Object.keys(tilePalette).length;
    const texture = this.textures.createCanvas(
      TILESET_TEXTURE_KEY,
      tileCount * TILE_SIZE,
      TILE_SIZE,
    );

    if (!texture) {
      return;
    }

    for (const [rawTileId, colors] of Object.entries(tilePalette)) {
      const tileId = Number(rawTileId);
      const x = tileId * TILE_SIZE;
      const context = texture.context;

      context.fillStyle = colors.base;
      context.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
      context.fillStyle = colors.accent;
      context.fillRect(x + 1, 1, 4, 2);
      context.fillRect(x + 10, 9, 4, 3);
      context.fillStyle = colors.highlight;

      if (tileId === TILE_IDS.path) {
        context.fillRect(x + 3, 6, 2, 1);
        context.fillRect(x + 11, 3, 2, 1);
        context.fillRect(x + 7, 12, 3, 1);
      } else if (tileId === TILE_IDS.hedge) {
        context.fillRect(x + 2, 3, 2, 2);
        context.fillRect(x + 8, 5, 2, 2);
        context.fillRect(x + 13, 2, 1, 3);
      } else if (tileId === TILE_IDS.water) {
        context.fillRect(x + 1, 5, 5, 1);
        context.fillRect(x + 8, 11, 6, 1);
      } else if (tileId === TILE_IDS.flowers) {
        context.fillRect(x + 4, 5, 2, 2);
        context.fillRect(x + 11, 10, 2, 2);
      } else {
        context.fillRect(x + 6, 4, 1, 3);
        context.fillRect(x + 13, 12, 1, 2);
      }
    }

    texture.refresh();
  }

  private renderTilemap() {
    const map = this.make.tilemap({
      data: this.worldMap.tiles,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage(
      TILESET_NAME,
      TILESET_TEXTURE_KEY,
      TILE_SIZE,
      TILE_SIZE,
    );

    if (!tileset) {
      return;
    }

    const layer = map.createLayer(0, tileset, 0, 0);
    layer.setDepth(0);
  }

  private renderNpcs() {
    for (const npc of this.worldMap.npcs) {
      const position = tileToWorldCenter(npc.position);
      this.add
        .ellipse(position.x, position.y + 7, 12, 4, 0x0d1d18, 0.35)
        .setDepth(4);
      this.add
        .sprite(position.x, position.y, getNpcTextureKey(npc))
        .setDepth(5);
    }
  }

  private createGardenMenu() {
    const panel = this.add
      .rectangle(260, 78, 104, 90, 0x101820, 0.96)
      .setStrokeStyle(1, 0xe879f9);

    this.gardenMenuItems = GARDEN_MENU_ITEMS.map((item, index) =>
      this.add.text(214, 42 + index * 15, item.label, {
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: "9px",
      }),
    );

    this.gardenMenu = this.add
      .container(0, 0, [panel, ...this.gardenMenuItems])
      .setDepth(31)
      .setScrollFactor(0)
      .setVisible(false);
  }

  private updateGardenMenuItems() {
    for (const [index, text] of this.gardenMenuItems.entries()) {
      const action = GARDEN_MENU_ITEMS[index];

      if (!action) {
        continue;
      }

      const isSelected = index === this.selectedGardenActionIndex;
      text.setText(`${isSelected ? ">" : " "} ${action.label}`);
      text.setColor(isSelected ? "#f5d0fe" : "#f8fafc");
    }
  }

  private updateGardenMenuInput() {
    if (this.isMenuDirectionPressed("up")) {
      this.moveGardenMenuSelection(-1);
    } else if (this.isMenuDirectionPressed("down")) {
      this.moveGardenMenuSelection(1);
    }
  }

  private updateDialogueChoiceInput() {
    if (this.isMenuDirectionPressed("up")) {
      this.moveDialogueChoiceSelection(-1);
    } else if (this.isMenuDirectionPressed("down")) {
      this.moveDialogueChoiceSelection(1);
    }
  }

  private moveDialogueChoiceSelection(delta: number) {
    const choiceCount = this.activeDialogueChoiceIds.length;

    if (choiceCount === 0) {
      return;
    }

    this.selectedDialogueChoiceIndex =
      (this.selectedDialogueChoiceIndex + delta + choiceCount) % choiceCount;
    playGameSound("select");

    if (this.activeDialogueView?.type === "choice") {
      this.showDialogueView(this.activeDialogueView);
    }
  }

  private moveGardenMenuSelection(delta: number) {
    const actionCount = GARDEN_MENU_ITEMS.length;
    this.selectedGardenActionIndex =
      (this.selectedGardenActionIndex + delta + actionCount) % actionCount;
    playGameSound("select");
    this.updateGardenMenuItems();
  }

  private isMenuDirectionPressed(direction: Direction): boolean {
    const cursor = this.cursors?.[direction];
    const keyByDirection: Record<Direction, Phaser.Input.Keyboard.Key | null> =
      {
        up: this.keys?.w ?? null,
        down: this.keys?.s ?? null,
        left: this.keys?.a ?? null,
        right: this.keys?.d ?? null,
      };
    const key = keyByDirection[direction];

    return Boolean(
      (cursor && Phaser.Input.Keyboard.JustDown(cursor)) ||
        (key && Phaser.Input.Keyboard.JustDown(key)),
    );
  }

  private applySelectedGardenAction() {
    const selectedAction = GARDEN_MENU_ITEMS[this.selectedGardenActionIndex];

    if (!selectedAction) {
      return;
    }

    if (selectedAction.id === "circle") {
      playGameSound("confirm");
      this.showCircleMenu();
      return;
    }

    this.companionState = applyGardenAction(
      this.companionState,
      selectedAction.id,
      this.getActiveBondGainModifier(),
    );
    this.currentSave = advanceQuestObjective(this.currentSave, {
      type: "advance",
      trigger: "garden-action",
      targetId: selectedAction.id,
    });
    this.persistProgress();
    playGameSound("confirm");
    this.gardenMenu?.setVisible(false);
    this.interactionMode = "garden-result";
    this.dialogueHintText?.setText("A");
    this.dialogueText?.setText(
      `${COMPANION_NAME}: ${selectedAction.message}\nBond ${this.companionState.bond}  Energy ${this.companionState.energy}`,
    );
  }

  private showCircleMenu() {
    this.currentSave = advanceQuestObjective(this.currentSave, {
      type: "advance",
      trigger: "circle-managed",
    });
    this.persistProgress();
    this.selectedCircleIndex = 0;
    this.interactionMode = "circle-menu";
    this.gardenMenu?.setVisible(false);
    this.dialogueHintText?.setText("A Back");
    this.dialogueBox?.setVisible(true);
    this.promptText?.setVisible(false);
    this.updateCircleMenuUi();
  }

  private updateCircleMenuInput() {
    if (this.isMenuDirectionPressed("up")) {
      this.moveCircleSelection(-1);
    } else if (this.isMenuDirectionPressed("down")) {
      this.moveCircleSelection(1);
    } else if (this.isMenuDirectionPressed("left")) {
      this.cycleSelectedCircleMind(-1);
    } else if (this.isMenuDirectionPressed("right")) {
      this.cycleSelectedCircleMind(1);
    }
  }

  private moveCircleSelection(delta: number) {
    const occupiedSlots = this.getManageableCircleSlots();

    if (occupiedSlots.length === 0) {
      return;
    }

    this.selectedCircleIndex =
      (this.selectedCircleIndex + delta + occupiedSlots.length) %
      occupiedSlots.length;
    playGameSound("select");
    this.updateCircleMenuUi();
  }

  private cycleSelectedCircleMind(delta: number) {
    const occupiedSlots = this.getManageableCircleSlots();
    const selected = occupiedSlots[this.selectedCircleIndex];
    const availableMindIds = getAvailableMindIds(
      this.currentSave.acquiredMinds,
    );

    if (!selected || availableMindIds.length === 0) {
      return;
    }

    const currentMindIndex = Math.max(
      0,
      availableMindIds.indexOf(selected.slot.mindId),
    );
    const nextMindId =
      availableMindIds[
        (currentMindIndex + delta + availableMindIds.length) %
          availableMindIds.length
      ];

    if (!nextMindId) {
      return;
    }

    this.currentSave = {
      ...this.currentSave,
      acquiredMinds: availableMindIds,
      circle: updateCircleSlot(
        this.currentSave.circle,
        selected.index,
        (slot) =>
          slot.state === "occupied"
            ? assignMindToCircleSlot(slot, nextMindId)
            : slot,
      ),
    };
    saveGame(this.currentSave);
    this.companionState = this.createCompanionStateFromSave();
    playGameSound("select");
    this.updateCircleMenuUi();
  }

  private updateCircleMenuUi() {
    const occupiedSlots = this.getManageableCircleSlots();

    if (occupiedSlots.length === 0) {
      this.dialogueText?.setText("Circle is empty.");
      return;
    }

    this.selectedCircleIndex = clamp(
      this.selectedCircleIndex,
      0,
      occupiedSlots.length - 1,
    );

    const lines = occupiedSlots.slice(0, 4).map(({ slot }, index) => {
      const body = MOTE_BODIES[slot.bodyId];
      const mind = MOTE_MINDS[slot.mindId];
      const marker = index === this.selectedCircleIndex ? ">" : " ";
      const bodyName = body?.name ?? slot.bodyId;
      const mindName = mind?.name ?? slot.mindId;

      return `${marker}${bodyName}/${mindName} ${getCircleSlotCompatibility(slot)}`;
    });

    this.dialogueText?.setText(lines.join("\n"));
  }

  private showCompanionMenu() {
    this.selectedGardenActionIndex = 0;
    this.interactionMode = "garden-menu";
    this.dialogueText?.setText(
      `${COMPANION_NAME}: ${getCompanionDialogue(this.companionState)}\nBond ${this.companionState.bond}  Full ${this.companionState.fullness}`,
    );
    this.dialogueHintText?.setText("A Select");
    this.dialogueBox?.setVisible(true);
    this.gardenMenu?.setVisible(true);
    this.promptText?.setVisible(false);
    playGameSound("talk");
    this.updateGardenMenuItems();
  }

  private createPlayer() {
    const position = tileToWorldCenter(this.playerTile);

    this.player = this.add
      .sprite(position.x, position.y, CHARACTER_TEXTURE_KEYS.player)
      .setDepth(10);
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

  private createUi() {
    this.add
      .text(8, 8, this.worldMap.name, {
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: "10px",
        stroke: "#101820",
        strokeThickness: 3,
      })
      .setDepth(20)
      .setScrollFactor(0);

    this.promptText = this.add
      .text(160, 156, "Talk", {
        color: "#f8fafc",
        fontFamily: "monospace",
        fontSize: "8px",
        backgroundColor: "#101820",
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(20)
      .setScrollFactor(0)
      .setVisible(false);

    const box = this.add
      .rectangle(160, 148, 300, 48, 0x101820, 0.94)
      .setStrokeStyle(1, 0x7dd3fc);
    this.dialogueText = this.add.text(22, 130, "", {
      color: "#f8fafc",
      fontFamily: "monospace",
      fontSize: "9px",
      lineSpacing: 3,
      wordWrap: { width: 276 },
    });
    const closeText = this.add.text(250, 166, "A", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });
    this.dialogueHintText = closeText;

    this.dialogueBox = this.add
      .container(0, 0, [box, this.dialogueText, closeText])
      .setDepth(30)
      .setScrollFactor(0)
      .setVisible(false);
    this.createGardenMenu();
  }

  private configureCamera() {
    if (!this.player) {
      return;
    }

    this.cameras.main.setBounds(
      0,
      0,
      this.worldMap.width * TILE_SIZE,
      this.worldMap.height * TILE_SIZE,
    );
    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
  }

  private getRequestedDirection(): Direction | null {
    if (this.cursors?.left.isDown || this.keys?.a.isDown) {
      return "left";
    }
    if (this.cursors?.right.isDown || this.keys?.d.isDown) {
      return "right";
    }
    if (this.cursors?.up.isDown || this.keys?.w.isDown) {
      return "up";
    }
    if (this.cursors?.down.isDown || this.keys?.s.isDown) {
      return "down";
    }

    return this.touchDirection;
  }

  private isInteractPressed(): boolean {
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

  private tryMove(direction: Direction) {
    primeAudio();
    this.facing = direction;
    this.updatePrompt();

    const nextTile = getNextTile(this.playerTile, direction);
    if (!canMoveTo(this.worldMap, nextTile) || !this.player) {
      return;
    }

    this.moving = true;
    this.playerTile = nextTile;
    const nextPosition = tileToWorldCenter(nextTile);
    playGameSound("step");

    this.tweens.add({
      targets: this.player,
      x: nextPosition.x,
      y: nextPosition.y,
      duration: 130,
      ease: "Linear",
      onComplete: () => {
        this.moving = false;
        if (this.handleTransition()) {
          return;
        }

        if (this.tryStartWildEncounter()) {
          return;
        }

        this.persistProgress();
        this.updatePrompt();
      },
    });
  }

  private handleTransition(): boolean {
    const transition = findTransitionAt(this.worldMap, this.playerTile);

    if (!transition) {
      return false;
    }

    playGameSound("transition");
    this.publishBusyState();
    fadeToScene(this, "World", {
      mapId: transition.toMapId,
      playerTile: transition.toPosition,
    } satisfies WorldSceneData);
    return true;
  }

  private tryStartWildEncounter(): boolean {
    const encounter = rollWildEncounter(this.worldMap, this.playerTile);

    if (!encounter) {
      return false;
    }

    this.startWildBattle(encounter.bodyId);
    return true;
  }

  private createCompanionStateFromSave(): CompanionState {
    const initialState = createInitialCompanionState();
    const companionSlot = getOccupiedCircleSlots(this.currentSave.circle)[0];

    return {
      ...initialState,
      bond: companionSlot?.bond ?? initialState.bond,
    };
  }

  private getActiveBondGainModifier(): number {
    const companionSlot = getOccupiedCircleSlots(this.currentSave.circle)[0];
    const mind = companionSlot ? MOTE_MINDS[companionSlot.mindId] : null;

    return mind ? getBondGainModifier(mind) : 0;
  }

  private getManageableCircleSlots() {
    return this.currentSave.circle.flatMap((slot, index) =>
      slot.state === "occupied" ? [{ slot, index }] : [],
    );
  }

  private persistProgress() {
    this.currentSave = {
      ...this.currentSave,
      player: {
        ...this.currentSave.player,
        currentMapId: this.worldMap.id,
        position: this.playerTile,
      },
      circle: updateCircleSlot(this.currentSave.circle, 0, (slot) =>
        slot.state === "occupied"
          ? { ...slot, bond: this.companionState.bond }
          : slot,
      ),
    };

    saveGame(this.currentSave);
    this.publishRuntimeState(true);
  }

  private updatePrompt() {
    const npc = findNpcFacing(this.worldMap, this.playerTile, this.facing);

    if (npc) {
      this.promptText?.setText(getNpcPrompt(npc));
    }

    this.promptText?.setVisible(
      Boolean(npc) && this.interactionMode === "none",
    );
  }

  private showDialogue(npc: WorldNpc) {
    playGameSound("talk");
    this.showDialogueText(npc.name, npc.dialogue[0] ?? "", "A");
  }

  private startDialogue(dialogueId: DialogueId) {
    const { nodeId, view } = getDialogueStartView(dialogueId, this.currentSave);

    this.activeDialogueId = dialogueId;
    this.activeDialogueNodeId = nodeId;
    this.activeDialogueVariables = {};
    this.activeDialogueView = null;
    this.activeDialogueChoiceIds = [];
    this.selectedDialogueChoiceIndex = 0;
    playGameSound("talk");
    this.showDialogueView(view);
  }

  private advanceActiveDialogue() {
    if (!this.activeDialogueId || !this.activeDialogueNodeId) {
      this.hideDialogue();
      return;
    }

    const result = advanceDialogue({
      dialogueId: this.activeDialogueId,
      nodeId: this.activeDialogueNodeId,
      save: this.currentSave,
      choiceId: this.activeDialogueChoiceIds[this.selectedDialogueChoiceIndex],
      variables: this.activeDialogueVariables,
    });

    this.currentSave = result.save;
    this.persistProgress();

    if (result.ended) {
      const commands = result.commands;
      const shouldContinueCutscene = this.activeCutsceneCommands.length > 0;

      this.hideDialogue();
      this.handleDialogueCommands(commands);
      if (shouldContinueCutscene) {
        this.activeCutsceneCommandIndex += 1;
        this.presentNextCutsceneCommand();
      }
      return;
    }

    this.activeDialogueNodeId = result.nextNodeId;
    this.activeDialogueChoiceIds = [];
    this.selectedDialogueChoiceIndex = 0;
    this.showDialogueView(result.view);

    if (result.commands.length > 0) {
      this.handleDialogueCommands(result.commands);
    }
  }

  private showDialogueView(view: DialogueView) {
    this.activeDialogueView = view;

    if (view.type === "line") {
      this.activeDialogueChoiceIds = [];
      this.showDialogueText(view.speaker, view.text, "A");
      return;
    }

    if (view.type === "choice") {
      this.activeDialogueChoiceIds = view.choices.map((choice) => choice.id);
      this.selectedDialogueChoiceIndex = clamp(
        this.selectedDialogueChoiceIndex,
        0,
        Math.max(0, view.choices.length - 1),
      );
      this.showDialogueText(
        "Choice",
        [
          view.prompt,
          ...view.choices.map(
            (choice, index) =>
              `${index === this.selectedDialogueChoiceIndex ? ">" : " "} ${
                choice.label
              }`,
          ),
        ].join("\n"),
        "A Select",
      );
      return;
    }

    this.hideDialogue();
  }

  private showDialogueText(speaker: string, message: string, hint: string) {
    this.interactionMode = "dialogue";
    this.dialogueText?.setText(
      message.startsWith(`${speaker}:`) ? message : `${speaker}: ${message}`,
    );
    this.dialogueHintText?.setText(hint);
    this.dialogueBox?.setVisible(true);
    this.promptText?.setVisible(false);
  }

  private startWildBattle(enemyBodyId: string) {
    this.persistProgress();
    playGameSound("encounter");
    this.publishBusyState();
    fadeToScene(this, "Battle", {
      returnMapId: this.worldMap.id,
      returnTile: this.playerTile,
      enemyBodyId,
    });
  }

  private startTrialBattle(trialId: TrialId) {
    this.persistProgress();
    playGameSound("encounter");
    this.publishBusyState();
    fadeToScene(this, "Battle", {
      returnMapId: this.worldMap.id,
      returnTile: this.playerTile,
      battleKind: "trial",
      trialId,
    });
  }

  private hideDialogue() {
    this.interactionMode = "none";
    this.activeDialogueId = null;
    this.activeDialogueNodeId = null;
    this.activeDialogueVariables = {};
    this.activeDialogueView = null;
    this.activeDialogueChoiceIds = [];
    this.selectedDialogueChoiceIndex = 0;
    this.dialogueBox?.setVisible(false);
    this.gardenMenu?.setVisible(false);
    this.updatePrompt();
  }

  private handleDialogueCommands(commands: readonly DialogueCommand[]) {
    for (const command of commands) {
      if (command.type === "openMenu") {
        if (command.menu === "garden") {
          this.showCompanionMenu();
        } else if (command.menu === "circle") {
          this.showCircleMenu();
        } else if (command.menu === "inventory" || command.menu === "quests") {
          this.persistProgress();
          dispatchGameRuntimeEvent({
            type: "open-pause-menu",
            panel: command.menu,
            save: this.currentSave,
          });
        }
      } else if (command.type === "startBattle") {
        if (command.battleKind === "trial" && command.trialId) {
          this.startTrialBattle(command.trialId);
        } else if (command.battleKind === "wild" && command.enemyBodyId) {
          this.startWildBattle(command.enemyBodyId);
        }
      } else if (command.type === "startCutscene") {
        this.runAndPresentCutscene(command.cutsceneId);
      }
    }
  }

  private runAndPresentCutscene(cutsceneId: string) {
    if (!isCutsceneId(cutsceneId)) {
      return;
    }

    const result = runCutscene(this.currentSave, cutsceneId);
    this.currentSave = result.save;
    this.persistProgress();
    this.startCutscenePresentation(result.commands);
  }

  private startCutscenePresentation(commands: readonly CutsceneCommand[]) {
    this.activeCutsceneCommands = [...commands];
    this.activeCutsceneCommandIndex = 0;
    this.cutsceneWaiting = false;
    this.presentNextCutsceneCommand();
  }

  private presentNextCutsceneCommand() {
    while (
      this.activeCutsceneCommandIndex < this.activeCutsceneCommands.length
    ) {
      const command =
        this.activeCutsceneCommands[this.activeCutsceneCommandIndex];

      if (!command) {
        break;
      }

      if (command.type === "sound") {
        playCutsceneSound(command.soundId);
        this.activeCutsceneCommandIndex += 1;
        continue;
      }

      if (command.type === "wait") {
        this.cutsceneWaiting = true;
        this.showDialogueText("System", "...", "");
        this.time.delayedCall(command.ms, () => {
          this.cutsceneWaiting = false;
          this.activeCutsceneCommandIndex += 1;
          this.presentNextCutsceneCommand();
        });
        return;
      }

      if (command.type === "say") {
        this.startDialogue(command.dialogueId as DialogueId);
        return;
      }

      if (command.type === "battle") {
        this.finishCutscenePresentation();
        if (command.battleKind === "trial" && command.trialId) {
          this.startTrialBattle(command.trialId);
        } else if (command.battleKind === "wild" && command.enemyBodyId) {
          this.startWildBattle(command.enemyBodyId);
        }
        return;
      }

      this.activeCutsceneCommandIndex += 1;
    }

    this.finishCutscenePresentation();
  }

  private finishCutscenePresentation() {
    this.activeCutsceneCommands = [];
    this.activeCutsceneCommandIndex = 0;
    this.cutsceneWaiting = false;
    if (!this.activeDialogueId) {
      this.hideDialogue();
    }
  }

  private readonly handleGameControl = (event: Event) => {
    const input = (event as CustomEvent<GameControlInput>).detail;

    switch (input.type) {
      case "pause":
        this.pausedByShell = input.paused;
        this.touchDirection = null;
        this.publishRuntimeState(true);
        break;
      case "sync-save":
        this.currentSave = input.save;
        this.companionState = this.createCompanionStateFromSave();
        this.publishRuntimeState(true);
        break;
      case "direction-start":
        if (this.pausedByShell) {
          return;
        }

        primeAudio();
        if (
          (this.interactionMode === "garden-menu" ||
            this.interactionMode === "circle-menu") &&
          (input.direction === "up" || input.direction === "down")
        ) {
          if (this.interactionMode === "garden-menu") {
            this.moveGardenMenuSelection(input.direction === "up" ? -1 : 1);
          } else {
            this.moveCircleSelection(input.direction === "up" ? -1 : 1);
          }
          return;
        }

        if (
          this.interactionMode === "dialogue" &&
          this.activeDialogueChoiceIds.length > 0 &&
          (input.direction === "up" || input.direction === "down")
        ) {
          this.moveDialogueChoiceSelection(input.direction === "up" ? -1 : 1);
          return;
        }

        if (
          this.interactionMode === "circle-menu" &&
          (input.direction === "left" || input.direction === "right")
        ) {
          this.cycleSelectedCircleMind(input.direction === "left" ? -1 : 1);
          return;
        }

        this.touchDirection = input.direction;
        break;
      case "direction-end":
        if (this.touchDirection === input.direction) {
          this.touchDirection = null;
        }
        break;
      case "action":
        if (this.pausedByShell) {
          return;
        }

        primeAudio();
        this.touchActionQueued = true;
        break;
    }
  };

  private publishRuntimeState(force = false) {
    const canPause =
      !this.pausedByShell && !this.moving && this.interactionMode === "none";
    const runtimeStateKey = [
      canPause,
      this.moving,
      this.interactionMode,
      this.currentSave.player.currentMapId,
      this.currentSave.player.position.x,
      this.currentSave.player.position.y,
      this.currentSave.acquiredBodies.join(","),
      this.currentSave.acquiredMinds.join(","),
      Object.entries(this.currentSave.inventory)
        .map(([key, count]) => `${key}:${count}`)
        .join(","),
      Object.entries(this.currentSave.questFlags)
        .map(([key, value]) => `${key}:${String(value)}`)
        .join(","),
      Object.entries(this.currentSave.quests)
        .map(
          ([key, value]) =>
            `${key}:${value.state}:${value.trackedObjectiveId ?? ""}:${
              value.rewardsClaimed ? "claimed" : "pending"
            }`,
        )
        .join(","),
    ].join("|");

    if (!force && runtimeStateKey === this.lastRuntimeStateKey) {
      return;
    }

    this.lastRuntimeStateKey = runtimeStateKey;
    dispatchGameRuntimeEvent({
      type: "free-roam",
      canPause,
      save: this.currentSave,
    });
  }

  private publishBusyState() {
    this.lastRuntimeStateKey = "busy";
    dispatchGameRuntimeEvent({
      type: "busy",
      canPause: false,
    });
  }
}

function tileToWorldCenter(position: GridPosition): GridPosition {
  return {
    x: position.x * TILE_SIZE + TILE_SIZE / 2,
    y: position.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getNpcPrompt(npc: WorldNpc): string {
  if (npc.kind === "companion") {
    return "Care";
  }

  if (npc.kind === "wild-mote") {
    return "Battle";
  }

  if (npc.kind === "trial-rival") {
    return "Trial";
  }

  return "Talk";
}

function isCutsceneId(cutsceneId: string): cutsceneId is CutsceneId {
  return cutsceneId in CUTSCENES;
}

function playCutsceneSound(soundId: string) {
  const soundById: Record<string, GameSound> = {
    signal: "confirm",
  };
  const sound = soundById[soundId];

  if (sound) {
    playGameSound(sound);
  }
}

function getNpcTextureKey(npc: WorldNpc): string {
  if (npc.kind === "companion") {
    return "mote-glowbud";
  }

  if (npc.kind === "wild-mote" && npc.battleBodyId) {
    return MOTE_BODIES[npc.battleBodyId]?.spriteKey ?? "mote-reedling";
  }

  if (npc.kind === "trial-rival") {
    return CHARACTER_TEXTURE_KEYS.rival;
  }

  return CHARACTER_TEXTURE_KEYS.guide;
}

function getMusicMode(mapId: WorldMapId) {
  if (mapId === "garden") {
    return "garden";
  }

  return mapId === "optima-trial-arena" ? "trial" : "route";
}
