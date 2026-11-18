import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge taught about the library's own theme scale. `uc-*` colors are already recognized,
 * but the custom `uc` radius (`rounded-uc`) must be registered so it conflicts with `rounded-*`.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: [
        "uc",
      ],
    },
  },
});

/**
 * Joins class names and resolves Tailwind CSS conflicts, so the last class wins.
 *
 * Every component builds its classes as `cn(defaults, className)`, which lets a
 * consumer override any default utility (e.g. `bg-uc-muted` → `bg-red-50`).
 *
 * @example
 * cn("px-2 text-sm", isActive && "font-medium", "px-4"); // "text-sm font-medium px-4"
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
