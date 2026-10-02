import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Delay for the index-th item of a staggered entrance animation, capped so the
 * whole list has settled within about a second. Uncapped, a long list keeps
 * fading items in for seconds, and iOS Safari treats content appearing right
 * after a tap as a hover reveal and swallows the tap: navigation then needs two.
 */
export function staggerDelay(index: number, stepMs: number): number {
    return Math.min(index, 8) * stepMs
}
