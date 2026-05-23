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
import {
  canMoveTo,
  findNpcFacing,
  findTransitionAt,
  getNextTile,
} from "@/game/systems/movement";

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
  private dialogueBox: Phaser.GameObjects.Container | null = null;
  private dialogueText: Phaser.GameObjects.Text | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super("World");
  }

  init(data: WorldSceneData) {
    const mapId = data.mapId ?? "garden";

    this.worldMap = WORLD_MAPS[mapId];
    this.playerTile = data.playerTile ?? this.worldMap.start;
    this.facing = "down";
    this.moving = false;
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
      if (this.dialogueBox?.visible) {
        this.hideDialogue();
        return;
      }

      const npc = findNpcFacing(this.worldMap, this.playerTile, this.facing);
      if (npc) {
        this.showDialogue(npc);
        return;
      }
    }

    if (this.dialogueBox?.visible || this.moving) {
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
      this.add
        .rectangle(position.x, position.y, 12, 14, 0x7dd3fc)
        .setStrokeStyle(1, 0x123047)
        .setDepth(5);
    }
  }

  private createPlayer() {
    const position = tileToWorldCenter(this.playerTile);

    this.player = this.add
      .rectangle(position.x, position.y, 12, 14, PLAYER_COLOR)
      .setStrokeStyle(1, 0x3d2f12)
      .setDepth(10);
  }

  private createControls() {
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
      .text(160, 156, "E / Space: Talk", {
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
    const closeText = this.add.text(250, 166, "E", {
      color: "#badbcc",
      fontFamily: "monospace",
      fontSize: "8px",
    });

    this.dialogueBox = this.add
      .container(0, 0, [box, this.dialogueText, closeText])
      .setDepth(30)
      .setScrollFactor(0)
      .setVisible(false);
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

    return null;
  }

  private isInteractPressed(): boolean {
    const space = this.cursors?.space;

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
        this.handleTransition();
        this.updatePrompt();
      },
    });
  }

  private handleTransition() {
    const transition = findTransitionAt(this.worldMap, this.playerTile);

    if (!transition) {
      return;
    }

    this.scene.restart({
      mapId: transition.toMapId,
      playerTile: transition.toPosition,
    } satisfies WorldSceneData);
  }

  private updatePrompt() {
    const hasNpc = Boolean(
      findNpcFacing(this.worldMap, this.playerTile, this.facing),
    );

    this.promptText?.setVisible(hasNpc && !this.dialogueBox?.visible);
  }

  private showDialogue(npc: WorldNpc) {
    this.dialogueText?.setText(`${npc.name}: ${npc.dialogue[0]}`);
    this.dialogueBox?.setVisible(true);
    this.promptText?.setVisible(false);
  }

  private hideDialogue() {
    this.dialogueBox?.setVisible(false);
    this.updatePrompt();
  }
}

function tileToWorldCenter(position: GridPosition): GridPosition {
  return {
    x: position.x * TILE_SIZE + TILE_SIZE / 2,
    y: position.y * TILE_SIZE + TILE_SIZE / 2,
  };
}
