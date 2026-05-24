import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Menu } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Direction } from "@/game/data/maps";
import { dispatchGameControl } from "@/game/input";
import type { ControlDisplay } from "@/game/types/options";
import { cn } from "@/lib/utils";

type DirectionButtonProps = {
  direction: Direction;
  children: ReactNode;
  className?: string;
  label: string;
};

const controlButtonClass =
  "size-14 touch-none select-none rounded-full border-[#4f8f79] bg-[#132820] text-[#f8fafc] shadow-lg shadow-black/30 active:scale-95 active:bg-[#1f513f]";

type VirtualControlsProps = {
  controlDisplay?: ControlDisplay;
  disabled?: boolean;
  onMenu?: () => void;
};

export function VirtualControls({
  controlDisplay = "auto",
  disabled = false,
  onMenu,
}: VirtualControlsProps) {
  if (controlDisplay === "hidden") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-6 pb-[env(safe-area-inset-bottom)]",
        controlDisplay === "auto" && "md:hidden",
      )}
    >
      <div className="grid grid-cols-3 grid-rows-3 gap-2">
        <DirectionButton
          className="col-start-2 row-start-1"
          disabled={disabled}
          direction="up"
          label="Move up"
        >
          <ArrowUp />
        </DirectionButton>
        <DirectionButton
          className="col-start-1 row-start-2"
          disabled={disabled}
          direction="left"
          label="Move left"
        >
          <ArrowLeft />
        </DirectionButton>
        <div className="col-start-2 row-start-2 size-14 rounded-full border border-[#2f6b56] bg-[#0d1d18]" />
        <DirectionButton
          className="col-start-3 row-start-2"
          disabled={disabled}
          direction="right"
          label="Move right"
        >
          <ArrowRight />
        </DirectionButton>
        <DirectionButton
          className="col-start-2 row-start-3"
          disabled={disabled}
          direction="down"
          label="Move down"
        >
          <ArrowDown />
        </DirectionButton>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button
          aria-label="Menu"
          className={controlButtonClass}
          disabled={disabled}
          onClick={onMenu}
          type="button"
          variant="outline"
        >
          <Menu />
        </Button>
        <Button
          aria-label="Interact"
          className={cn(controlButtonClass, "size-20 text-2xl font-semibold")}
          disabled={disabled}
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
    </div>
  );
}

function DirectionButton({
  children,
  className,
  disabled,
  direction,
  label,
}: DirectionButtonProps & { disabled?: boolean }) {
  return (
    <Button
      aria-label={label}
      className={cn(controlButtonClass, className)}
      disabled={disabled}
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
