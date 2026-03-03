Src lib input
import { writable } from 'svelte/store';

export const leftPressed = writable(false);
export const rightPressed = writable(false);

export function handleKeyDown(e) {
  if (e.key === 'ArrowLeft') leftPressed.set(true);
  if (e.key === 'ArrowRight') rightPressed.set(true);
}

export function handleKeyUp(e) {
  if (e.key === 'ArrowLeft') leftPressed.set(false);
  if (e.key === 'ArrowRight') rightPressed.set(false);
}