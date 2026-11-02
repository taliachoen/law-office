import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// מחבר שמות class ופותר התנגשויות של Tailwind (הכלל האחרון מנצח).
// פונקציה מקומית מעל חבילות ותיקות ומוכרות, במקום חבילה חיצונית חדשה.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
