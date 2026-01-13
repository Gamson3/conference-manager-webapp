"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function openNativeDatePicker(input: HTMLInputElement | null): void {
  if (!input) return;
  if (input.disabled) return;

  // Chromium supports `showPicker()`.
  // Call it directly on the element; extracting the function can throw “Illegal invocation”.
  const showPicker = (input as HTMLInputElement & { showPicker?: () => void }).showPicker;
  if (typeof showPicker === "function") {
    try {
      showPicker.call(input);
      return;
    } catch {
      // Fall through to focus/click.
    }
  }

  // Fallback: focus + click (some browsers open the picker on click).
  try {
    input.focus();
    input.click();
  } catch {
    // no-op
  }
}

export type DateInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  function DateInput(
    { value, onChange, className, disabled, ...props }: DateInputProps,
    forwardedRef
  ): React.JSX.Element {
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inputRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef]
    );

    return (
      <div className="relative">
        <input
          ref={setRefs}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            "cm-date-input",
            "h-10 w-full rounded-md border border-input bg-transparent px-3 pr-10 text-sm shadow-xs",
            "transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />

        <button
          type="button"
          aria-label="Open calendar"
          disabled={disabled}
          onClick={() => openNativeDatePicker(inputRef.current)}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center px-3",
            "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50"
          )}
        >
          <Calendar className="h-4 w-4" />
        </button>
      </div>
    );
  }
);
