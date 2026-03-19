import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeParseDate(dateValue: string | Date): Date {
  if (dateValue instanceof Date) return dateValue;
  const str = String(dateValue);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(str + "T12:00:00");
  }
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(str)) {
    const dateOnly = str.slice(0, 10);
    return new Date(dateOnly + "T12:00:00");
  }
  return new Date(str);
}
