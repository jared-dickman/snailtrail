import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities - extracted from LocationModal/LocationList
export function formatDate(date?: Date | string): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDaysUntil(date?: Date | string): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isOverdue(date?: Date | string): boolean {
  const days = getDaysUntil(date);
  return days !== null && days < 0;
}

export function isDueSoon(date?: Date | string, threshold = 2): boolean {
  const days = getDaysUntil(date);
  return days !== null && days >= 0 && days <= threshold;
}
