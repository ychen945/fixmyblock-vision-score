import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_POOL = Array.from({ length: 70 }, (_, i) => i + 1);

const hashSeed = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getAvatarUrl = (seed?: string | null, existing?: string | null) => {
  if (existing) return existing;
  const source = seed?.trim() || "neighbor";
  const hash = hashSeed(source);
  const index = hash % AVATAR_POOL.length;
  return `https://i.pravatar.cc/150?img=${AVATAR_POOL[index]}`;
};
