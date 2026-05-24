import { useEffect, useState } from "react";
import { GameHost } from "@/game/GameHost";
import { DEFAULT_CONTROL_BINDINGS, formatControlBinding } from "@/game/input";
import { clearSaveGame, loadSaveGame } from "@/game/systems/save";
import { VirtualControls } from "@/game/VirtualControls";
import "./index.css";

export function App() {
  const [saveLabel, setSaveLabel] = useState("Auto Slot - New game");

  useEffect(() => {
    const save = loadSaveGame();

    if (!save) {
      return;
    }

    setSaveLabel(
      `Auto Slot - ${save.player.currentMapId.replaceAll("-", " ")} (${save.acquiredBodies.length} bodies)`,
    );
  }, []);

  return (
    <main className="min-h-screen w-full bg-[#101820] px-4 py-4 text-[#f8fafc] sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col gap-3">
        <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold leading-none">Mote</h1>
            <p className="mt-1 text-sm text-[#badbcc]">
              Vertical slice polish build
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded border border-[#2f6b56] bg-[#0d1d18] px-2 py-1 text-[#badbcc]">
              {saveLabel}
            </span>
            <button
              className="rounded border border-[#4f8f79] px-2 py-1 font-medium text-[#f8fafc] hover:bg-[#132820]"
              onClick={() => {
                clearSaveGame();
                window.location.reload();
              }}
              type="button"
            >
              New Game
            </button>
          </div>
        </header>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#2f6b56] bg-black shadow-2xl shadow-black/30">
          <GameHost />
        </div>
        <section
          aria-label="Controls"
          className="grid gap-2 rounded-md border border-[#2f6b56] bg-[#0d1d18] p-3 text-xs text-[#badbcc] sm:grid-cols-2"
        >
          {DEFAULT_CONTROL_BINDINGS.map((binding) => (
            <p className="leading-snug" key={binding.action}>
              {formatControlBinding(binding)}
            </p>
          ))}
        </section>
        <VirtualControls />
      </section>
    </main>
  );
}

export default App;
