import * as Phaser from "phaser";
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
import { GAME_CONTROL_EVENT, type GameControlInput } from "@/game/input";
import {
  applyGardenAction,
  COMPANION_NAME,
  type CompanionState,
  createInitialCompanionState,
  GARDEN_ACTIONS,
  getCompanionDialogue,
} from "@/game/systems/companion";
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
import {
  createInitialSaveGame,
  loadOrCreateSaveGame,
  saveGame,
} from "@/game/systems/save";
import type { SaveGame } from "@/game/types/save";

type InteractionMode = "none" | "dialogue" | "garden-menu" | "garden-result";

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

const TILESET_TEXTURE_KEY = "placeholder-overworld-tiles";
const TILESET_NAME = "placeholder-overworld";
const PLAYER_COLOR = 0xf4d35e;

const tilePalette: Record<TileId, { base: string; accent: string }> = {
  [TILE_IDS.grass]: { base: "#2f6b56", accent: "#367a61" },
  [TILE_IDS.path]: { base: "#9b7b4f", accent: "#b7925d" },
  [TILE_IDS.hedge]: { base: "#173f32", accent: "#25624c" },
  [TILE_IDS.water]: { base: "#225f8f", accent: "#2f7db8" },
  [TILE_IDS.flowers]: { base: "#356c42", accent: "#d96aa0" },
};

export class WorldScene extends Phaser.Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private keys: MovementKeys | null = null;
  private worldMap: WorldMap = WORLD_MAPS.garden;
  private player: Phaser.GameObjects.Rectangle | null = null;
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
  private interactionMode: InteractionMode = "none";
  private companionState: CompanionState = createInitialCompanionState();
  private currentSave: SaveGame = createInitialSaveGame();

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
    this.interactionMode = "none";
    this.companionState = this.createCompanionStateFromSave();
    this.persistProgress();
  }

  create() {
    this.cameras.main.setBackgroundColor("#101820");

    this.ensureTilesetTexture();
    this.renderTilemap();
    this.renderNpcs();
    this.createPlayer();
    this.createControls();
    this.createUi();
    this.configureCamera();
  }

  override update() {
    if (this.isInteractPressed()) {
      if (this.interactionMode === "garden-menu") {
        this.applySelectedGardenAction();
        return;
      }

      if (this.interactionMode !== "none") {
        this.hideDialogue();
        return;
      }

      const npc = findNpcFacing(this.worldMap, this.playerTile, this.facing);
      if (npc) {
        if (npc.kind === "companion") {
          this.showCompanionMenu();
        } else if (npc.kind === "wild-mote") {
          this.startWildBattle(npc);
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

      texture.context.fillStyle = colors.base;
      texture.context.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
      texture.context.fillStyle = colors.accent;
      texture.context.fillRect(x + 2, 2, 3, 3);
      texture.context.fillRect(x + 10, 9, 4, 4);
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
      const fillColor =
        npc.kind === "companion"
          ? 0xe879f9
          : npc.kind === "wild-mote"
            ? 0xa7f3d0
            : 0x7dd3fc;
      const strokeColor =
        npc.kind === "companion"
          ? 0x4a154b
          : npc.kind === "wild-mote"
            ? 0x14532d
            : 0x123047;

      this.add
        .rectangle(position.x, position.y, 12, 14, fillColor)
        .setStrokeStyle(1, strokeColor)
        .setDepth(5);

      if (npc.kind === "companion") {
        this.add
          .circle(position.x + 3, position.y - 2, 2, 0xfdf4ff)
          .setDepth(6);
      }
    }
  }

  private createGardenMenu() {
    const panel = this.add
      .rectangle(260, 72, 104, 78, 0x101820, 0.96)
      .setStrokeStyle(1, 0xe879f9);

    this.gardenMenuItems = GARDEN_ACTIONS.map((action, index) =>
      this.add.text(214, 42 + index * 15, action.label, {
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
      const action = GARDEN_ACTIONS[index];

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

  private moveGardenMenuSelection(delta: number) {
    const actionCount = GARDEN_ACTIONS.length;
    this.selectedGardenActionIndex =
      (this.selectedGardenActionIndex + delta + actionCount) % actionCount;
    this.updateGardenMenuItems();
  }

  private isMenuDirectionPressed(direction: "up" | "down"): boolean {
    const cursor = direction === "up" ? this.cursors?.up : this.cursors?.down;
    const key = direction === "up" ? this.keys?.w : this.keys?.s;

    return Boolean(
      (cursor && Phaser.Input.Keyboard.JustDown(cursor)) ||
        (key && Phaser.Input.Keyboard.JustDown(key)),
    );
  }

  private applySelectedGardenAction() {
    const selectedAction = GARDEN_ACTIONS[this.selectedGardenActionIndex];

    if (!selectedAction) {
      return;
    }

    this.companionState = applyGardenAction(
      this.companionState,
      selectedAction.id,
    );
    this.persistProgress();
    this.gardenMenu?.setVisible(false);
    this.interactionMode = "garden-result";
    this.dialogueHintText?.setText("A");
    this.dialogueText?.setText(
      `${COMPANION_NAME}: ${selectedAction.message}\nBond ${this.companionState.bond}  Energy ${this.companionState.energy}`,
    );
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
    this.updateGardenMenuItems();
  }

  private createPlayer() {
    const position = tileToWorldCenter(this.playerTile);

    this.player = this.add
      .rectangle(position.x, position.y, 12, 14, PLAYER_COLOR)
      .setStrokeStyle(1, 0x3d2f12)
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
      return true;
    }

    return Boolean(
      (space && Phaser.Input.Keyboard.JustDown(space)) ||
        (this.keys?.e && Phaser.Input.Keyboard.JustDown(this.keys.e)) ||
        (this.keys?.enter && Phaser.Input.Keyboard.JustDown(this.keys.enter)),
    );
  }

  private tryMove(direction: Direction) {
    this.facing = direction;
    this.updatePrompt();

    const nextTile = getNextTile(this.playerTile, direction);
    if (!canMoveTo(this.worldMap, nextTile) || !this.player) {
      return;
    }

    this.moving = true;
    this.playerTile = nextTile;
    const nextPosition = tileToWorldCenter(nextTile);

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

    this.scene.restart({
      mapId: transition.toMapId,
      playerTile: transition.toPosition,
    } satisfies WorldSceneData);
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
    this.interactionMode = "dialogue";
    this.dialogueText?.setText(`${npc.name}: ${npc.dialogue[0]}`);
    this.dialogueHintText?.setText("A");
    this.dialogueBox?.setVisible(true);
    this.promptText?.setVisible(false);
  }

  private startWildBattle(npc: WorldNpc) {
    this.persistProgress();
    this.scene.start("Battle", {
      returnMapId: this.worldMap.id,
      returnTile: this.playerTile,
      enemyBodyId: npc.battleBodyId ?? "reedling",
    });
  }

  private hideDialogue() {
    this.interactionMode = "none";
    this.dialogueBox?.setVisible(false);
    this.gardenMenu?.setVisible(false);
    this.updatePrompt();
  }

  private readonly handleGameControl = (event: Event) => {
    const input = (event as CustomEvent<GameControlInput>).detail;

    switch (input.type) {
      case "direction-start":
        if (
          this.interactionMode === "garden-menu" &&
          (input.direction === "up" || input.direction === "down")
        ) {
          this.moveGardenMenuSelection(input.direction === "up" ? -1 : 1);
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
        this.touchActionQueued = true;
        break;
    }
  };
}

function tileToWorldCenter(position: GridPosition): GridPosition {
  return {
    x: position.x * TILE_SIZE + TILE_SIZE / 2,
    y: position.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

function getNpcPrompt(npc: WorldNpc): string {
  if (npc.kind === "companion") {
    return "Care";
  }

  if (npc.kind === "wild-mote") {
    return "Battle";
  }

  return "Talk";
}
