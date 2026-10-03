/** Accumulate monotonic play time only during active periods; no ticking interval. */
export class PlayClock {
  private accumulated = 0;
  private startedAt: number | null = null;

  setActive(active: boolean, now: number): void {
    if (active && this.startedAt === null) this.startedAt = now;
    else if (!active && this.startedAt !== null) {
      this.accumulated += Math.max(0, now - this.startedAt);
      this.startedAt = null;
    }
  }

  elapsed(now: number): number {
    return this.accumulated + (this.startedAt === null ? 0 : Math.max(0, now - this.startedAt));
  }
}

export function formatPlayTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
