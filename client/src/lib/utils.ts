// client/src/lib/utils.ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes conditionally with clsx, then de-duplicate with twMerge.
 * Usage: cn("p-2", condition && "bg-red-500", "p-2 md:p-4")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}
