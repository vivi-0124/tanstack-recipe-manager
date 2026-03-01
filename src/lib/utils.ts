import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert full-width digits (and common full-width symbols) to half-width equivalents.
 * e.g. "１２３" -> "123", "３．５" -> "3.5"
 */
export function toHalfWidth(str: string): string {
  return str.replace(/[\uFF10-\uFF19\uFF0E\uFF0F]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  )
}
