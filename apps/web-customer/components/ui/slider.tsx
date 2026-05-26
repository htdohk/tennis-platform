import { cn } from "@/lib/utils";
import * as React from "react";

interface SliderProps extends Omit<React.ComponentProps<"input">, "type" | "defaultValue"> {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
}

function Slider({
  className,
  min = 1,
  max = 5,
  step = 0.5,
  value,
  onValueChange,
  ...props
}: SliderProps) {
  return (
    <div className={cn("relative w-full", className)} style={{ touchAction: "none" }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
        {...props}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {Array.from({ length: (max - min) / step + 1 }).map((_, i) => {
          const v = min + i * step;
          return (
            <span key={v} className="relative">
              {v % 1 === 0 ? (
                <span
                  className={cn(
                    "absolute -translate-x-1/2",
                    v === value ? "text-black font-medium" : ""
                  )}
                >
                  {v.toFixed(1)}
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="text-center mt-4 font-medium text-lg">
        段位: {value.toFixed(1)}
      </div>
    </div>
  );
}

export { Slider };
