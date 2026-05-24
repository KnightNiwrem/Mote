import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { setAudioOptions } from "@/game/audio";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
} from "@/game/data/items";
import { MOTE_MINDS } from "@/game/data/minds";
import { GameHost } from "@/game/GameHost";
import {
  DEFAULT_CONTROL_BINDINGS,
  dispatchGameControl,
  GAME_CONTROL_EVENT,
  GAME_RUNTIME_EVENT,
  type GameControlInput,
  type GameRuntimeEvent,
} from "@/game/input";
import {
  createCircleMenuRows,
  getCircleAssignableMindOptions,
} from "@/game/systems/circleMenu";
import {
  applyInventoryItem,
  canUseInventoryItem,
  getInventoryCategoryLabel,
  getInventoryEntries,
} from "@/game/systems/inventory";
import {
  createCircleMenuModel,
  createInventoryMenuModel,
  createPauseMenuModel,
  createTitleMenuModel,
} from "@/game/systems/menu";
import { assignAcquiredMindToCircle } from "@/game/systems/mindBody";
import { loadGameOptions, saveGameOptions } from "@/game/systems/options";
import {
  formatSlotLabel,
  initialPauseState,
  isPauseMenuItemId,
  type PauseMenuItemId,
  pauseReducer,
} from "@/game/systems/pause";
import {
  advanceQuestObjective,
  getCurrentObjective,
  getQuestJournalEntries,
} from "@/game/systems/quests";
import {
  createInitialSaveGame,
  createSaveSlotMetadata,
  deleteSaveSlot,
  getActiveSaveSlotId,
  listSaveSlots,
  readSaveSlot,
  setActiveSaveSlotId,
  writeSaveSlot,
} from "@/game/systems/save";
import type { ItemCategory } from "@/game/types/game";
import type { GameOptions } from "@/game/types/options";
import type { SaveGame, SaveSlotId, SaveSlotState } from "@/game/types/save";
import { VirtualControls } from "@/game/VirtualControls";
import { cn } from "@/lib/utils";
import "./index.css";

type ShellView = "title" | "load" | "new-game" | "options";

type TitleOverwrite = {
  slotId: SaveSlotId;
  mode: "new-game";
};

const titleButtonClass =
  "justify-start border-[#67e8f9] bg-[#0d1d18] text-[#f8fafc] hover:bg-[#173f32]";
const panelClass =
  "rounded-md border border-[#2f6b56] bg-[#0d1d18] text-[#f8fafc] shadow-lg shadow-black/20";

export function App() {
  const [shellView, setShellView] = useState<ShellView>("title");
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameSessionId, setGameSessionId] = useState(0);
  const [slots, setSlots] = useState<SaveSlotState[]>(() => listSaveSlots());
  const [activeSlotId, setActiveSlotIdState] = useState<SaveSlotId | null>(() =>
    getActiveSaveSlotId(),
  );
  const [latestSave, setLatestSave] = useState<SaveGame | null>(null);
  const [canPause, setCanPause] = useState(false);
  const [pauseState, dispatchPause] = useReducer(
    pauseReducer,
    initialPauseState,
  );
  const [options, setOptions] = useState<GameOptions>(() => loadGameOptions());
  const [titleOverwrite, setTitleOverwrite] = useState<TitleOverwrite | null>(
    null,
  );
  const [inventoryFeedback, setInventoryFeedback] = useState<string | null>(
    null,
  );
  const [circleFeedback, setCircleFeedback] = useState<string | null>(null);

  const latestSlot = useMemo(() => getLatestValidSlot(slots), [slots]);
  const activeSlot = activeSlotId
    ? slots.find((slot) => slot.slotId === activeSlotId)
    : null;
  const saveLabel =
    activeSlot?.status === "valid"
      ? `${formatSlotLabel(activeSlot.slotId)} - ${activeSlot.record.metadata.mapName}`
      : "No active save";
  const currentObjective = latestSave
    ? getCurrentObjective(latestSave)
    : "Start a new game.";

  useEffect(() => {
    setAudioOptions(options);
    saveGameOptions(options);
  }, [options]);

  useEffect(() => {
    const handleRuntimeEvent = (event: Event) => {
      const detail = (event as CustomEvent<GameRuntimeEvent>).detail;

      if (detail.type === "busy") {
        setCanPause(false);
        return;
      }

      setCanPause(detail.canPause);
      setLatestSave(detail.save);
    };

    window.addEventListener(GAME_RUNTIME_EVENT, handleRuntimeEvent);
    return () => {
      window.removeEventListener(GAME_RUNTIME_EVENT, handleRuntimeEvent);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    dispatchGameControl({ type: "pause", paused: pauseState.isPaused });
  }, [isPlaying, pauseState.isPaused]);

  const refreshSlots = useCallback(() => {
    setSlots(listSaveSlots());
    setActiveSlotIdState(getActiveSaveSlotId());
  }, []);

  const startExistingSlot = (slotId: SaveSlotId) => {
    const slot = readSaveSlot(slotId);

    if (slot.status !== "valid") {
      refreshSlots();
      return;
    }

    setActiveSaveSlotId(slotId);
    setActiveSlotIdState(slotId);
    setLatestSave(slot.record.save);
    setCanPause(false);
    dispatchPause({ type: "close" });
    setIsPlaying(true);
    setGameSessionId((current) => current + 1);
    refreshSlots();
  };

  const startNewGame = (slotId: SaveSlotId) => {
    const save = createInitialSaveGame();
    writeSaveSlot(slotId, save);
    setActiveSlotIdState(slotId);
    setLatestSave(save);
    setCanPause(false);
    dispatchPause({ type: "close" });
    setTitleOverwrite(null);
    setIsPlaying(true);
    setGameSessionId((current) => current + 1);
    refreshSlots();
  };

  const requestNewGame = () => {
    const emptySlot = slots.find((slot) => slot.status === "empty");

    if (emptySlot) {
      startNewGame(emptySlot.slotId);
      return;
    }

    setShellView("new-game");
  };

  const handleSlotNewGame = (slot: SaveSlotState) => {
    if (slot.status === "empty") {
      startNewGame(slot.slotId);
      return;
    }

    setTitleOverwrite({ slotId: slot.slotId, mode: "new-game" });
  };

  const handleManualSave = (slotId: SaveSlotId) => {
    if (!latestSave) {
      return;
    }

    writeSaveSlot(slotId, latestSave);
    setActiveSlotIdState(slotId);
    dispatchPause({ type: "saved", slotId });
    refreshSlots();
  };

  const writeGameplaySave = useCallback(
    (save: SaveGame) => {
      const slotId = activeSlotId ?? getActiveSaveSlotId() ?? "slot-1";

      writeSaveSlot(slotId, save);
      setActiveSlotIdState(slotId);
      setLatestSave(save);
      dispatchGameControl({ type: "sync-save", save });
      refreshSlots();
    },
    [activeSlotId, refreshSlots],
  );

  const handleUseInventoryItem = (itemId: string) => {
    if (!latestSave) {
      setInventoryFeedback("Save state is not ready.");
      return;
    }

    const result = applyInventoryItem(latestSave, itemId, { context: "menu" });
    setInventoryFeedback(result.feedback);

    if (result.success) {
      writeGameplaySave(result.save);
    }
  };

  const handleAssignCircleMind = (slotIndex: number, mindId: string) => {
    if (!latestSave) {
      setCircleFeedback("Save state is not ready.");
      return;
    }

    try {
      const save = assignAcquiredMindToCircle(latestSave, slotIndex, mindId);
      const mindName = MOTE_MINDS[mindId]?.name ?? mindId;
      const progressedSave = advanceQuestObjective(save, {
        type: "advance",
        trigger: "circle-managed",
      });

      writeGameplaySave(progressedSave);
      setCircleFeedback(`Assigned ${mindName} to slot ${slotIndex + 1}.`);
    } catch (error) {
      setCircleFeedback(
        error instanceof Error ? error.message : "Could not assign that mind.",
      );
    }
  };

  const requestPauseSave = (slot: SaveSlotState) => {
    if (slot.status === "empty") {
      handleManualSave(slot.slotId);
      return;
    }

    dispatchPause({ type: "request-save", slot });
  };

  const confirmPauseOverwrite = () => {
    const slotId = pauseState.pendingOverwriteSlotId;

    if (!slotId) {
      return;
    }

    handleManualSave(slotId);
    dispatchPause({ type: "confirm-overwrite" });
  };

  const openPause = () => {
    dispatchPause({ type: "open", canPause });
  };

  const activatePauseMenuItem = useCallback(
    (itemId: PauseMenuItemId) => {
      if (itemId === "motes" && latestSave) {
        writeGameplaySave(
          advanceQuestObjective(latestSave, {
            type: "advance",
            trigger: "circle-managed",
          }),
        );
      }

      dispatchPause({ type: "activate-menu-item", itemId });
    },
    [latestSave, writeGameplaySave],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPlaying || event.repeat) {
        return;
      }

      const key = event.key.toLowerCase();

      if (pauseState.isPaused) {
        if (event.key === "Escape" || key === "p") {
          event.preventDefault();
          dispatchPause({ type: "close" });
          return;
        }

        if (event.key === "ArrowDown" || key === "s") {
          event.preventDefault();
          dispatchPause({ type: "move-menu", delta: 1 });
          return;
        }

        if (event.key === "ArrowUp" || key === "w") {
          event.preventDefault();
          dispatchPause({ type: "move-menu", delta: -1 });
          return;
        }

        if (event.key === "Enter" || event.key === " " || key === "e") {
          event.preventDefault();
          activatePauseMenuItem(pauseState.selectedMenuItemId);
          return;
        }

        return;
      }

      if (event.key !== "Escape" && key !== "p") {
        return;
      }

      event.preventDefault();
      dispatchPause({ type: "open", canPause });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canPause,
    activatePauseMenuItem,
    isPlaying,
    pauseState.isPaused,
    pauseState.selectedMenuItemId,
  ]);

  useEffect(() => {
    const handleGameControl = (event: Event) => {
      if (!isPlaying || !pauseState.isPaused) {
        return;
      }

      const input = (event as CustomEvent<GameControlInput>).detail;

      if (input.type === "direction-start") {
        if (input.direction === "down" || input.direction === "right") {
          dispatchPause({ type: "move-menu", delta: 1 });
        } else {
          dispatchPause({ type: "move-menu", delta: -1 });
        }
        return;
      }

      if (input.type === "action") {
        activatePauseMenuItem(pauseState.selectedMenuItemId);
      }
    };

    window.addEventListener(GAME_CONTROL_EVENT, handleGameControl);
    return () => {
      window.removeEventListener(GAME_CONTROL_EVENT, handleGameControl);
    };
  }, [
    activatePauseMenuItem,
    isPlaying,
    pauseState.isPaused,
    pauseState.selectedMenuItemId,
  ]);

  return (
    <main className="min-h-screen w-full bg-[#101820] px-4 py-4 text-[#f8fafc] sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col gap-3">
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold leading-none">Mote</h1>
            <p className="mt-1 text-sm text-[#badbcc]">Chapter 1 shell build</p>
          </div>
          {isPlaying ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded border border-[#2f6b56] bg-[#0d1d18] px-2 py-1 text-[#badbcc]">
                {saveLabel}
              </span>
              <span className="rounded border border-[#4f8f79] bg-[#132820] px-2 py-1 text-[#f8fafc]">
                Objective: {currentObjective}
              </span>
              <Button
                className="border-[#4f8f79] bg-[#132820] text-[#f8fafc] hover:bg-[#1f513f]"
                disabled={!canPause && !pauseState.isPaused}
                onClick={() =>
                  pauseState.isPaused
                    ? dispatchPause({ type: "close" })
                    : openPause()
                }
                size="sm"
                type="button"
                variant="outline"
              >
                {pauseState.isPaused ? "Return" : "Pause"}
              </Button>
            </div>
          ) : null}
        </header>

        {isPlaying ? (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#2f6b56] bg-black shadow-2xl shadow-black/30">
              <GameHost key={gameSessionId} />
              {pauseState.isPaused ? (
                <PauseOverlay
                  activeSlotId={activeSlotId}
                  circleFeedback={circleFeedback}
                  confirmOverwrite={confirmPauseOverwrite}
                  inventoryFeedback={inventoryFeedback}
                  latestSave={latestSave}
                  onCancelOverwrite={() =>
                    dispatchPause({ type: "cancel-overwrite" })
                  }
                  onCircleFeedback={setCircleFeedback}
                  onInventoryFeedback={setInventoryFeedback}
                  onOptionsChange={setOptions}
                  onRequestSave={requestPauseSave}
                  onAssignCircleMind={handleAssignCircleMind}
                  onActivateMenuItem={activatePauseMenuItem}
                  onUseInventoryItem={handleUseInventoryItem}
                  options={options}
                  pauseState={pauseState}
                  slots={slots}
                />
              ) : null}
            </div>
            <ControlsPanel />
            <VirtualControls
              controlDisplay={options.controlDisplay}
              onMenu={() =>
                pauseState.isPaused
                  ? dispatchPause({ type: "close" })
                  : openPause()
              }
            />
          </>
        ) : (
          <TitleShell
            canContinue={Boolean(latestSlot)}
            confirmTitleOverwrite={() => {
              if (titleOverwrite) {
                startNewGame(titleOverwrite.slotId);
              }
            }}
            deleteSlot={(slotId) => {
              deleteSaveSlot(slotId);
              refreshSlots();
            }}
            latestSlot={latestSlot}
            onBack={() => {
              setShellView("title");
              setTitleOverwrite(null);
            }}
            onContinue={() => {
              if (latestSlot) {
                startExistingSlot(latestSlot.slotId);
              }
            }}
            onLoadSlot={startExistingSlot}
            onNewGame={requestNewGame}
            onOptionsChange={setOptions}
            onRequestSlotNewGame={handleSlotNewGame}
            options={options}
            setShellView={setShellView}
            shellView={shellView}
            slots={slots}
            titleOverwrite={titleOverwrite}
          />
        )}
      </section>
    </main>
  );
}

function TitleShell({
  canContinue,
  confirmTitleOverwrite,
  deleteSlot,
  latestSlot,
  onBack,
  onContinue,
  onLoadSlot,
  onNewGame,
  onOptionsChange,
  onRequestSlotNewGame,
  options,
  setShellView,
  shellView,
  slots,
  titleOverwrite,
}: {
  canContinue: boolean;
  confirmTitleOverwrite: () => void;
  deleteSlot: (slotId: SaveSlotId) => void;
  latestSlot: Extract<SaveSlotState, { status: "valid" }> | null;
  onBack: () => void;
  onContinue: () => void;
  onLoadSlot: (slotId: SaveSlotId) => void;
  onNewGame: () => void;
  onOptionsChange: (options: GameOptions) => void;
  onRequestSlotNewGame: (slot: SaveSlotState) => void;
  options: GameOptions;
  setShellView: (view: ShellView) => void;
  shellView: ShellView;
  slots: SaveSlotState[];
  titleOverwrite: TitleOverwrite | null;
}) {
  const titleMenu = createTitleMenuModel(canContinue);
  const titleActions: Record<string, () => void> = {
    continue: onContinue,
    "new-game": onNewGame,
    load: () => setShellView("load"),
    options: () => setShellView("options"),
  };

  return (
    <div className="grid min-h-[620px] gap-4 rounded-lg border border-[#2f6b56] bg-[#0a1412] p-4 shadow-2xl shadow-black/30 md:grid-cols-[minmax(220px,0.42fr)_1fr]">
      <section className="flex flex-col justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-[#67e8f9]">
            Motehaven
          </p>
          <h2 className="mt-3 text-5xl font-semibold leading-none text-[#f8fafc]">
            Mote
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#badbcc]">
            Start in the Garden, build a Circle, and clear the Precision Trial.
          </p>
        </div>
        <div className="grid gap-2">
          {titleMenu.items.map((item) => (
            <Button
              className={titleButtonClass}
              disabled={item.disabled}
              key={item.id}
              onClick={titleActions[item.id]}
              type="button"
              variant="outline"
            >
              {item.label}
            </Button>
          ))}
        </div>
      </section>

      <section className={cn(panelClass, "p-4")}>
        {shellView === "title" ? (
          <TitleSummary latestSlot={latestSlot} slots={slots} />
        ) : null}
        {shellView === "load" ? (
          <SlotList
            actionLabel="Load"
            deleteSlot={deleteSlot}
            onBack={onBack}
            onSlotAction={(slot) => {
              if (slot.status === "valid") {
                onLoadSlot(slot.slotId);
              }
            }}
            slots={slots}
          />
        ) : null}
        {shellView === "new-game" ? (
          <SlotList
            actionLabel="New Game"
            deleteSlot={deleteSlot}
            onBack={onBack}
            onSlotAction={onRequestSlotNewGame}
            slots={slots}
          />
        ) : null}
        {shellView === "options" ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Options</h2>
              <Button
                className="border-[#4f8f79] bg-[#132820] text-[#f8fafc] hover:bg-[#1f513f]"
                onClick={onBack}
                size="sm"
                type="button"
                variant="outline"
              >
                Back
              </Button>
            </div>
            <OptionsPanel onChange={onOptionsChange} options={options} />
          </div>
        ) : null}
        {titleOverwrite ? (
          <ConfirmPanel
            message={`Overwrite ${formatSlotLabel(titleOverwrite.slotId)} with a new game?`}
            onCancel={onBack}
            onConfirm={confirmTitleOverwrite}
          />
        ) : null}
      </section>
    </div>
  );
}

function TitleSummary({
  latestSlot,
  slots,
}: {
  latestSlot: Extract<SaveSlotState, { status: "valid" }> | null;
  slots: SaveSlotState[];
}) {
  return (
    <div className="grid gap-4">
      <h2 className="text-lg font-semibold">Save Slots</h2>
      <div className="grid gap-3">
        {slots.map((slot) => (
          <SaveSlotCard key={slot.slotId} slot={slot} />
        ))}
      </div>
      <p className="text-sm text-[#badbcc]">
        Continue selects{" "}
        {latestSlot ? formatSlotLabel(latestSlot.slotId) : "the newest save"}.
      </p>
    </div>
  );
}

function SlotList({
  actionLabel,
  deleteSlot,
  onBack,
  onSlotAction,
  slots,
}: {
  actionLabel: string;
  deleteSlot: (slotId: SaveSlotId) => void;
  onBack: () => void;
  onSlotAction: (slot: SaveSlotState) => void;
  slots: SaveSlotState[];
}) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{actionLabel}</h2>
        <Button
          className="border-[#4f8f79] bg-[#132820] text-[#f8fafc] hover:bg-[#1f513f]"
          onClick={onBack}
          size="sm"
          type="button"
          variant="outline"
        >
          Back
        </Button>
      </div>
      <div className="grid gap-3">
        {slots.map((slot) => (
          <SaveSlotCard
            actionLabel={actionLabel}
            key={slot.slotId}
            onAction={() => onSlotAction(slot)}
            onDelete={
              slot.status === "corrupt"
                ? () => deleteSlot(slot.slotId)
                : undefined
            }
            slot={slot}
          />
        ))}
      </div>
    </div>
  );
}

function PauseOverlay({
  activeSlotId,
  circleFeedback,
  confirmOverwrite,
  inventoryFeedback,
  latestSave,
  onCancelOverwrite,
  onAssignCircleMind,
  onCircleFeedback,
  onInventoryFeedback,
  onOptionsChange,
  onRequestSave,
  onActivateMenuItem,
  onUseInventoryItem,
  options,
  pauseState,
  slots,
}: {
  activeSlotId: SaveSlotId | null;
  circleFeedback: string | null;
  confirmOverwrite: () => void;
  inventoryFeedback: string | null;
  latestSave: SaveGame | null;
  onCancelOverwrite: () => void;
  onAssignCircleMind: (slotIndex: number, mindId: string) => void;
  onCircleFeedback: (feedback: string | null) => void;
  onInventoryFeedback: (feedback: string | null) => void;
  onOptionsChange: (options: GameOptions) => void;
  onRequestSave: (slot: SaveSlotState) => void;
  onActivateMenuItem: (itemId: PauseMenuItemId) => void;
  onUseInventoryItem: (itemId: string) => void;
  options: GameOptions;
  pauseState: ReturnType<typeof pauseReducer>;
  slots: SaveSlotState[];
}) {
  const pauseMenu = createPauseMenuModel(pauseState.selectedMenuItemId);
  const activePanel =
    pauseState.panel === "root" && pauseState.selectedMenuItemId !== "return"
      ? pauseState.selectedMenuItemId
      : pauseState.panel;

  return (
    <div className="absolute inset-0 z-10 grid grid-cols-[112px_minmax(0,1fr)] gap-2 bg-[#08110f]/90 p-2 text-[#f8fafc] sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-3 sm:p-3">
      <nav
        className={cn(
          panelClass,
          "grid content-start gap-1 p-1 sm:gap-2 sm:p-3",
        )}
      >
        {pauseMenu.items.map((item) => (
          <Button
            className={cn(
              "h-7 justify-start border-[#4f8f79] bg-[#132820] px-2 text-xs text-[#f8fafc] hover:bg-[#1f513f] sm:h-8 sm:px-3 sm:text-sm",
              pauseState.selectedMenuItemId === item.id &&
                "border-[#fbbf24] text-[#fef3c7]",
              activePanel === item.id && "bg-[#1f513f]",
              item.id === "return" &&
                "border-[#67e8f9] bg-[#0d1d18] hover:bg-[#173f32]",
            )}
            key={item.id}
            onClick={() => {
              if (!isPauseMenuItemId(item.id)) {
                return;
              }

              onActivateMenuItem(item.id);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {item.label}
          </Button>
        ))}
      </nav>
      <section
        className={cn(panelClass, "min-w-0 overflow-auto p-2 sm:p-3")}
        data-pause-panel={activePanel}
      >
        {activePanel === "root" ? <PauseRoot latestSave={latestSave} /> : null}
        {activePanel === "motes" ? (
          <MotesPanel
            feedback={circleFeedback}
            latestSave={latestSave}
            onAssignMind={onAssignCircleMind}
            onFeedback={onCircleFeedback}
          />
        ) : null}
        {activePanel === "inventory" ? (
          <InventoryPanel
            feedback={inventoryFeedback}
            latestSave={latestSave}
            onFeedback={onInventoryFeedback}
            onUseItem={onUseInventoryItem}
          />
        ) : null}
        {activePanel === "quests" ? (
          <QuestsPanel latestSave={latestSave} />
        ) : null}
        {activePanel === "save" ? (
          <SavePanel
            activeSlotId={activeSlotId}
            confirmOverwrite={confirmOverwrite}
            latestSave={latestSave}
            onCancelOverwrite={onCancelOverwrite}
            onRequestSave={onRequestSave}
            pauseState={pauseState}
            slots={slots}
          />
        ) : null}
        {activePanel === "options" ? (
          <OptionsPanel onChange={onOptionsChange} options={options} />
        ) : null}
      </section>
    </div>
  );
}

function PauseRoot({ latestSave }: { latestSave: SaveGame | null }) {
  const metadata = latestSave ? createSaveSlotMetadata(latestSave) : null;

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Pause</h2>
      <p className="text-sm text-[#badbcc]">
        {metadata
          ? `${metadata.chapterLabel} - ${metadata.mapName}`
          : "Loading save state."}
      </p>
    </div>
  );
}

function MotesPanel({
  feedback,
  latestSave,
  onAssignMind,
  onFeedback,
}: {
  feedback: string | null;
  latestSave: SaveGame | null;
  onAssignMind: (slotIndex: number, mindId: string) => void;
  onFeedback: (feedback: string | null) => void;
}) {
  const rows = latestSave ? createCircleMenuRows(latestSave) : [];
  const mindOptions = latestSave
    ? getCircleAssignableMindOptions(latestSave)
    : [];
  const circleMenu = createCircleMenuModel(
    rows.map((row) => ({
      id: `slot-${row.index + 1}`,
      label: row.label,
      disabled: row.state === "empty",
    })),
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Circle</h2>
          <p className="text-sm text-[#badbcc]">Caretaker Circle</p>
        </div>
      </div>
      {feedback ? (
        <p className="rounded border border-[#fbbf24] bg-[#2b2110] p-2 text-sm text-[#fef3c7]">
          {feedback}
        </p>
      ) : null}
      <div className="grid gap-2">
        {rows.length > 0 ? null : (
          <p className="text-sm text-[#badbcc]">No Circle data loaded.</p>
        )}
        {rows.map((row, index) =>
          row.state === "occupied" ? (
            <div
              className="grid gap-2 rounded border border-[#2f6b56] bg-[#101820] p-2 text-sm sm:grid-cols-[1fr_190px]"
              key={circleMenu.items[index]?.id ?? row.label}
            >
              <div>
                <p className="font-medium">
                  {row.index + 1}. {row.bodyName}
                  {row.activeOrder === 1 ? (
                    <span className="ml-2 rounded bg-[#2b2110] px-2 py-0.5 text-xs text-[#fef3c7]">
                      Active
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[#badbcc]">
                  HP {row.currentHp}/{row.maxHp} | Lv {row.level} | Bond{" "}
                  {row.bond} | Order {row.activeOrder}
                </p>
                <p className="mt-1 text-[#badbcc]">
                  {row.mindName} | {row.compatibility}
                </p>
              </div>
              <label className="grid gap-1">
                <span className="text-xs uppercase text-[#6b8f83]">
                  Assigned Mind
                </span>
                <select
                  className="rounded border border-[#4f8f79] bg-[#0a1412] px-2 py-2 text-[#f8fafc]"
                  onChange={(event) => {
                    onFeedback(null);
                    onAssignMind(row.index, event.currentTarget.value);
                  }}
                  value={row.mindId}
                >
                  {mindOptions.map((mind) => (
                    <option key={mind.mindId} value={mind.mindId}>
                      {mind.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div
              className="rounded border border-[#1f513f] bg-[#0a1412] p-2 text-sm text-[#6b8f83]"
              key={circleMenu.items[index]?.id ?? row.label}
            >
              {row.index + 1}. Empty | Order -
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function InventoryPanel({
  feedback,
  latestSave,
  onFeedback,
  onUseItem,
}: {
  feedback: string | null;
  latestSave: SaveGame | null;
  onFeedback: (feedback: string | null) => void;
  onUseItem: (itemId: string) => void;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<ItemCategory>("care");
  const entries = latestSave
    ? getInventoryEntries(latestSave.inventory, selectedCategory)
    : [];
  const categoryMenu = createInventoryMenuModel(
    INVENTORY_CATEGORIES.map((category) => ({
      id: category,
      label: getInventoryCategoryLabel(category),
      disabled: !latestSave,
    })),
  );

  return (
    <div className="grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">Inventory</h2>
        <p className="text-sm text-[#badbcc]">Caretaker satchel</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {categoryMenu.items.map((item) => (
          <Button
            className={cn(
              "border-[#4f8f79] bg-[#132820] text-[#f8fafc] hover:bg-[#1f513f]",
              selectedCategory === item.id && "border-[#fbbf24] text-[#fef3c7]",
            )}
            disabled={item.disabled}
            key={item.id}
            onClick={() => {
              onFeedback(null);
              setSelectedCategory(item.id as ItemCategory);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            {item.label}
          </Button>
        ))}
      </div>
      {feedback ? (
        <p className="rounded border border-[#fbbf24] bg-[#2b2110] p-2 text-sm text-[#fef3c7]">
          {feedback}
        </p>
      ) : null}
      {entries.length > 0 && latestSave ? (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <div
              className="grid gap-2 rounded border border-[#2f6b56] bg-[#101820] p-3 text-sm sm:grid-cols-[1fr_auto]"
              key={entry.itemId}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{entry.name}</p>
                  <span className="rounded bg-[#0a1412] px-2 py-0.5 text-xs text-[#fbbf24]">
                    x{entry.count}
                  </span>
                </div>
                <p className="mt-1 text-[#badbcc]">{entry.description}</p>
                {!entry.canUse ? (
                  <p className="mt-1 text-xs text-[#6b8f83]">
                    Not usable from the menu.
                  </p>
                ) : null}
              </div>
              <Button
                className="border-[#67e8f9] bg-[#0d1d18] text-[#f8fafc] hover:bg-[#173f32]"
                disabled={
                  !canUseInventoryItem(latestSave, entry.itemId, "menu")
                }
                onClick={() => onUseItem(entry.itemId)}
                size="sm"
                type="button"
                variant="outline"
              >
                Use
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#badbcc]">
          No {INVENTORY_CATEGORY_LABELS[selectedCategory].toLowerCase()} in the
          inventory.
        </p>
      )}
    </div>
  );
}

function QuestsPanel({ latestSave }: { latestSave: SaveGame | null }) {
  const entries = latestSave ? getQuestJournalEntries(latestSave) : [];

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Quests</h2>
      {entries.length > 0 ? (
        <div className="grid gap-2">
          {entries.map((entry) => (
            <div
              className="rounded border border-[#2f6b56] bg-[#101820] p-3 text-sm"
              key={entry.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{entry.title}</p>
                <span className="rounded bg-[#0a1412] px-2 py-0.5 text-xs text-[#fbbf24]">
                  {entry.status}
                </span>
                <span className="rounded bg-[#0a1412] px-2 py-0.5 text-xs text-[#badbcc]">
                  {entry.category}
                </span>
              </div>
              <p className="mt-2 text-[#f8fafc]">{entry.currentObjective}</p>
              <p className="mt-1 text-[#badbcc]">{entry.journalText}</p>
              <p className="mt-1 text-xs text-[#6b8f83]">
                Reward: {entry.rewardText}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#badbcc]">No quest state loaded.</p>
      )}
    </div>
  );
}

function SavePanel({
  activeSlotId,
  confirmOverwrite,
  latestSave,
  onCancelOverwrite,
  onRequestSave,
  pauseState,
  slots,
}: {
  activeSlotId: SaveSlotId | null;
  confirmOverwrite: () => void;
  latestSave: SaveGame | null;
  onCancelOverwrite: () => void;
  onRequestSave: (slot: SaveSlotState) => void;
  pauseState: ReturnType<typeof pauseReducer>;
  slots: SaveSlotState[];
}) {
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Save</h2>
      {pauseState.notice ? (
        <p className="rounded border border-[#fbbf24] bg-[#2b2110] p-2 text-sm text-[#fef3c7]">
          {pauseState.notice}
        </p>
      ) : null}
      {latestSave ? (
        <div className="grid gap-2">
          {slots.map((slot) => (
            <SaveSlotCard
              actionLabel={activeSlotId === slot.slotId ? "Save Here" : "Save"}
              isActive={activeSlotId === slot.slotId}
              key={slot.slotId}
              onAction={() => onRequestSave(slot)}
              slot={slot}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-[#badbcc]">Save state is not ready.</p>
      )}
      {pauseState.pendingOverwriteSlotId ? (
        <ConfirmPanel
          message={`Overwrite ${formatSlotLabel(pauseState.pendingOverwriteSlotId)}?`}
          onCancel={onCancelOverwrite}
          onConfirm={confirmOverwrite}
        />
      ) : null}
    </div>
  );
}

function OptionsPanel({
  onChange,
  options,
}: {
  onChange: (options: GameOptions) => void;
  options: GameOptions;
}) {
  return (
    <div className="grid gap-4 text-sm">
      <RangeControl
        label="Sound Volume"
        onChange={(soundVolume) => onChange({ ...options, soundVolume })}
        value={options.soundVolume}
      />
      <RangeControl
        label="Music Volume"
        onChange={(musicVolume) => onChange({ ...options, musicVolume })}
        value={options.musicVolume}
      />
      <label className="grid gap-1">
        <span className="text-[#badbcc]">Text Speed</span>
        <select
          className="rounded border border-[#4f8f79] bg-[#101820] px-2 py-2 text-[#f8fafc]"
          onChange={(event) =>
            onChange({
              ...options,
              textSpeed: event.currentTarget.value as GameOptions["textSpeed"],
            })
          }
          value={options.textSpeed}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal</option>
          <option value="fast">Fast</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-[#badbcc]">Control Display</span>
        <select
          className="rounded border border-[#4f8f79] bg-[#101820] px-2 py-2 text-[#f8fafc]"
          onChange={(event) =>
            onChange({
              ...options,
              controlDisplay: event.currentTarget
                .value as GameOptions["controlDisplay"],
            })
          }
          value={options.controlDisplay}
        >
          <option value="auto">Auto</option>
          <option value="always">Always</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-[#badbcc]">
        <input
          checked={options.reducedMotion}
          className="size-4 accent-[#67e8f9]"
          onChange={(event) =>
            onChange({ ...options, reducedMotion: event.currentTarget.checked })
          }
          type="checkbox"
        />
        Reduced Motion
      </label>
    </div>
  );
}

function RangeControl({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex items-center justify-between gap-2 text-[#badbcc]">
        {label}
        <span className="text-[#f8fafc]">{Math.round(value * 100)}%</span>
      </span>
      <input
        max="1"
        min="0"
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        step="0.05"
        type="range"
        value={value}
      />
    </label>
  );
}

function SaveSlotCard({
  actionLabel,
  isActive = false,
  onAction,
  onDelete,
  slot,
}: {
  actionLabel?: string;
  isActive?: boolean;
  onAction?: () => void;
  onDelete?: () => void;
  slot: SaveSlotState;
}) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded border bg-[#101820] p-3 text-sm sm:grid-cols-[1fr_auto]",
        isActive ? "border-[#fbbf24]" : "border-[#2f6b56]",
      )}
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{formatSlotLabel(slot.slotId)}</p>
          {isActive ? (
            <span className="rounded bg-[#2b2110] px-2 py-0.5 text-xs text-[#fef3c7]">
              Active
            </span>
          ) : null}
        </div>
        {slot.status === "valid" ? (
          <div className="mt-2 grid gap-1 text-[#badbcc]">
            <p>
              {slot.record.metadata.playerName} | {slot.record.metadata.mapName}
            </p>
            <p>{slot.record.metadata.chapterLabel}</p>
            <p>
              {formatTimestamp(slot.record.metadata.updatedAt)} | Bodies{" "}
              {slot.record.metadata.acquiredBodyCount} | Marks{" "}
              {slot.record.metadata.trialMarks.length > 0
                ? slot.record.metadata.trialMarks.join(", ")
                : "None"}
            </p>
          </div>
        ) : null}
        {slot.status === "empty" ? (
          <p className="mt-2 text-[#6b8f83]">Empty slot</p>
        ) : null}
        {slot.status === "corrupt" ? (
          <p className="mt-2 text-[#fecaca]">Corrupt save data</p>
        ) : null}
      </div>
      {actionLabel || onDelete ? (
        <div className="flex flex-wrap items-start gap-2 sm:justify-end">
          {actionLabel ? (
            <Button
              className="border-[#67e8f9] bg-[#0d1d18] text-[#f8fafc] hover:bg-[#173f32]"
              disabled={slot.status === "corrupt" && actionLabel === "Load"}
              onClick={onAction}
              size="sm"
              type="button"
              variant="outline"
            >
              {actionLabel}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              className="border-[#fca5a5] bg-[#2a1212] text-[#fee2e2] hover:bg-[#3a1818]"
              onClick={onDelete}
              size="sm"
              type="button"
              variant="outline"
            >
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConfirmPanel({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 rounded border border-[#fbbf24] bg-[#2b2110] p-3">
      <p className="text-sm text-[#fef3c7]">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="border-[#fbbf24] bg-[#3a2a10] text-[#fef3c7] hover:bg-[#4a3614]"
          onClick={onConfirm}
          size="sm"
          type="button"
          variant="outline"
        >
          Confirm Overwrite
        </Button>
        <Button
          className="border-[#4f8f79] bg-[#132820] text-[#f8fafc] hover:bg-[#1f513f]"
          onClick={onCancel}
          size="sm"
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ControlsPanel() {
  return (
    <section
      aria-label="Controls"
      className="grid gap-2 rounded-md border border-[#2f6b56] bg-[#0d1d18] p-3 text-xs text-[#badbcc] sm:grid-cols-2"
    >
      {DEFAULT_CONTROL_BINDINGS.map((binding) => (
        <p className="leading-snug" key={binding.action}>
          {binding.action}: {binding.keyboard} / {binding.touch}
        </p>
      ))}
    </section>
  );
}

function getLatestValidSlot(
  slots: readonly SaveSlotState[],
): Extract<SaveSlotState, { status: "valid" }> | null {
  const validSlots = slots.filter((slot) => slot.status === "valid");

  if (validSlots.length === 0) {
    return null;
  }

  return validSlots.reduce((latest, slot) =>
    Date.parse(slot.record.metadata.updatedAt) >
    Date.parse(latest.record.metadata.updatedAt)
      ? slot
      : latest,
  );
}

function formatTimestamp(value: string): string {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(timestamp);
}

export default App;
