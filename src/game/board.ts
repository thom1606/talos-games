export type Point = { x: number; y: number };
export type Cell = Point & {
  mine: boolean;
  adjacent: number;
  revealed: boolean;
  revealedAt: number;
  flagged: boolean;
  wave: number;
};

export const keyOf = ({ x, y }: Point): string => `${x},${y}`;
export function neighbors({ x, y }: Point): Point[] {
  const result: Point[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) result.push({ x: x + dx, y: y + dy });
    }
  }
  return result;
}

/** Coordinates determine mines independently of the order in which you explore. */
export class InfiniteBoard {
  readonly cells = new Map<string, Cell>();
  lost = false;
  exploded: Point | null = null;
  revealedCount = 0;
  flagCount = 0;
  revision = 0;
  private pending: Point[] = [];
  private queued = new Set<string>();
  private origin: Point = { x: 0, y: 0 };
  readonly seed: number;

  constructor(seed: number = crypto.getRandomValues(new Uint32Array(1))[0]!) {
    this.seed = seed;
    this.reveal({ x: 0, y: 0 });
  }

  isMine({ x, y }: Point): boolean {
    // A clear 3 × 3 pocket makes the opening zero and guarantees a useful start.
    if (Math.abs(x) <= 1 && Math.abs(y) <= 1) return false;
    let hash = this.seed ^ 0x811c9dc5;
    const coordinate = `${x}:${y}`;
    for (let i = 0; i < coordinate.length; i++) {
      hash = Math.imul(hash ^ coordinate.charCodeAt(i), 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 0x100000000 < 0.17;
  }

  /** Reading the viewport never stores unexplored squares. */
  cell(point: Point): Cell {
    const existing = this.cells.get(keyOf(point));
    if (existing) return existing;
    return {
      ...point, mine: this.isMine(point),
      adjacent: neighbors(point).filter((neighbor) => this.isMine(neighbor)).length,
      revealed: false, revealedAt: 0, flagged: false, wave: 0,
    };
  }

  toggleFlag(point: Point): void {
    if (this.lost) return;
    const cell = this.cell(point);
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    this.flagCount += cell.flagged ? 1 : -1;
    this.cells.set(keyOf(point), cell);
    this.revision++;
  }

  isComplete(point: Point): boolean {
    const cell = this.cells.get(keyOf(point));
    return !!cell && cell.revealed && !cell.mine && cell.adjacent > 0 && neighbors(point).every((neighbor) => {
      const adjacent = this.cells.get(keyOf(neighbor));
      return adjacent?.revealed || adjacent?.flagged;
    });
  }

  reveal(point: Point): void {
    if (this.lost) return;
    const cell = this.cell(point);
    if (cell.revealed) return;
    if (cell.flagged) this.toggleFlag(point);
    this.origin = point;
    this.enqueue(point);
    this.flush();
  }

  /** Clicking a number opens every unflagged neighbor, including a missed mine. */
  chord(point: Point): void {
    const cell = this.cell(point);
    if (this.lost || !cell.revealed || cell.adjacent === 0) return;
    this.origin = point;
    for (const neighbor of neighbors(point)) {
      if (!this.cell(neighbor).flagged) this.enqueue(neighbor);
    }
    this.flush();
  }

  private enqueue(point: Point): void {
    const key = keyOf(point);
    if (this.queued.has(key)) return;
    this.queued.add(key);
    this.pending.push(point);
  }

  get expanding(): boolean { return this.pending.length > 0 && !this.lost; }

  /** Large empty areas are opened in bounded batches so WebKit stays responsive. */
  flush(budget = 512): void {
    let processed = 0;
    while (this.pending.length && processed++ < budget && !this.lost) {
      const point = this.pending.pop()!;
      this.queued.delete(keyOf(point));
      const cell = this.cell(point);
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      cell.revealedAt = performance.now();
      cell.wave = Math.min(12, Math.max(Math.abs(point.x - this.origin.x), Math.abs(point.y - this.origin.y)));
      this.cells.set(keyOf(point), cell);
      if (cell.mine) {
        this.lost = true;
        this.exploded = point;
        this.pending = [];
        this.queued.clear();
      } else {
        this.revealedCount++;
        if (cell.adjacent === 0) {
          for (const neighbor of neighbors(point)) {
            if (!this.cell(neighbor).revealed) this.enqueue(neighbor);
          }
        }
      }
    }
    this.revision++;
  }
}
