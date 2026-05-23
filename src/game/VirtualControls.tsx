import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Direction } from "@/game/data/maps";
import { dispatchGameControl } from "@/game/input";
import { cn } from "@/lib/utils";

type DirectionButtonProps = {
  direction: Direction;
  children: ReactNode;
  className?: string;
  label: string;
};

const controlButtonClass =
  "size-14 touch-none select-none rounded-full border-[#4f8f79] bg-[#132820] text-[#f8fafc] shadow-lg shadow-black/30 active:scale-95 active:bg-[#1f513f]";

export function VirtualControls() {
  return (
    <div className="flex w-full items-center justify-between gap-6 pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-3 grid-rows-3 gap-2">
        <DirectionButton
          className="col-start-2 row-start-1"
          direction="up"
          label="Move up"
        >
          <ArrowUp />
        </DirectionButton>
        <DirectionButton
          className="col-start-1 row-start-2"
          direction="left"
          label="Move left"
        >
          <ArrowLeft />
        </DirectionButton>
        <div className="col-start-2 row-start-2 size-14 rounded-full border border-[#2f6b56] bg-[#0d1d18]" />
        <DirectionButton
          className="col-start-3 row-start-2"
          direction="right"
          label="Move right"
        >
          <ArrowRight />
        </DirectionButton>
        <DirectionButton
          className="col-start-2 row-start-3"
          direction="down"
          label="Move down"
        >
          <ArrowDown />
        </DirectionButton>
      </div>

      <Button
        aria-label="Interact"
        className={cn(controlButtonClass, "size-20 text-2xl font-semibold")}
        onContextMenu={(event) => event.preventDefault()}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dispatchGameControl({ type: "action" });
        }}
        variant="outline"
      >
        A
      </Button>
    </div>
  );
}

function DirectionButton({
  children,
  className,
  direction,
  label,
}: DirectionButtonProps) {
  return (
    <Button
      aria-label={label}
      className={cn(controlButtonClass, className)}
      onContextMenu={(event) => event.preventDefault()}
      onPointerCancel={(event) => {
        event.preventDefault();
        dispatchGameControl({ type: "direction-end", direction });
      }}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        dispatchGameControl({ type: "direction-start", direction });
      }}
      onPointerLeave={(event) => {
        if (event.buttons === 1) {
          dispatchGameControl({ type: "direction-end", direction });
        }
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        dispatchGameControl({ type: "direction-end", direction });
      }}
      variant="outline"
    >
      {children}
    </Button>
  );
}
