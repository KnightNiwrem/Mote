import { GameHost } from "@/game/GameHost";
import "./index.css";

export function App() {
  return (
    <main className="min-h-screen w-full bg-[#101820] px-4 py-5 text-[#f8fafc] sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-4">
        <header className="flex shrink-0 items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold leading-none">Mote</h1>
            <p className="mt-1 text-sm text-[#badbcc]">Overworld foundation</p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#7dd3fc]">
            Phase 1
          </p>
        </header>
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-[#2f6b56] bg-black shadow-2xl shadow-black/30">
          <GameHost />
        </div>
      </section>
    </main>
  );
}

export default App;
