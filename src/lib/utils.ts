import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function dataUrl(path: string) {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}data/${path.replace(/^\//, "")}`;
}

export function sampleRandom<T>(items: T[], count: number): T[] {
  const n = Math.min(Math.max(0, count), items.length);
  const copy = items.slice();
  for (let i = 0; i < n; i += 1) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    const a = copy[i];
    const b = copy[j];
    if (a !== undefined && b !== undefined) {
      copy[i] = b;
      copy[j] = a;
    }
  }
  return copy.slice(0, n);
}
