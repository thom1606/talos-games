export type Direction = 'up' | 'right' | 'down' | 'left';
export type Tile = { id: number; index: number; value: number; spawned: boolean; merged: boolean };
type Snapshot = { tiles: Tile[]; score: number; continued: boolean; nextId: number };

/** A move compacts each line, merges each pair once, then adds exactly one tile. */
export class TwentyFortyEightGame {
  tiles: Tile[] = [];
  score = 0;
  gained = 0;
  ghosts: Tile[] = [];
  private nextId = 1;
  private continued = false;
  private previous: Snapshot | null = null;
  private readonly random: () => number;

  constructor(random: () => number = Math.random, initial?: readonly number[]) {
    this.random = random;
    if (initial) {
      if (initial.length !== 16 || initial.some((value) => value !== 0 &&
          (!Number.isSafeInteger(value) || value < 2 || !Number.isInteger(Math.log2(value))))) throw new Error('Invalid 2048 board');
      this.tiles = initial.flatMap((value, index) => value ? [{ id: this.nextId++, index, value, spawned: false, merged: false }] : []);
    } else { this.spawn(); this.spawn(); }
  }

  get values(): number[] {
    const cells = Array<number>(16).fill(0);
    for (const tile of this.tiles) cells[tile.index] = tile.value;
    return cells;
  }
  get won(): boolean { return !this.continued && this.tiles.some((tile) => tile.value >= 2048); }
  get over(): boolean {
    if (this.tiles.length < 16) return false;
    const cells = this.values;
    return cells.every((value, index) =>
      (index % 4 === 3 || cells[index + 1] !== value) && (index >= 12 || cells[index + 4] !== value));
  }
  get canUndo(): boolean { return this.previous !== null; }

  move(direction: Direction): boolean {
    if (this.over || this.won) return false;
    const cell = (line: number, offset: number) => direction === 'left' ? line * 4 + offset
      : direction === 'right' ? line * 4 + 3 - offset
      : direction === 'up' ? offset * 4 + line : (3 - offset) * 4 + line;
    const board = new Map(this.tiles.map((tile) => [tile.index, tile]));
    const result: Tile[] = [], ghosts: Tile[] = [];
    let changed = false, gained = 0, nextId = this.nextId;
    for (let line = 0; line < 4; line++) {
      const entries = Array.from({ length: 4 }, (_, offset) => board.get(cell(line, offset))).filter((tile): tile is Tile => Boolean(tile));
      let destination = 0;
      for (let source = 0; source < entries.length; source++) {
        const tile = entries[source], other = entries[source + 1], index = cell(line, destination++);
        if (other?.value === tile.value) {
          const value = tile.value * 2;
          result.push({ id: nextId++, index, value, spawned: false, merged: true });
          ghosts.push({ ...tile, index }, { ...other, index });
          gained += value; source++; changed = true;
        } else {
          result.push({ ...tile, index, spawned: false, merged: false });
          if (tile.index !== index) changed = true;
        }
      }
    }
    if (!changed) return false;
    this.previous = { tiles: this.tiles.map((tile) => ({ ...tile, spawned: false, merged: false })), score: this.score, continued: this.continued, nextId: this.nextId };
    this.tiles = result; this.nextId = nextId; this.score += gained; this.gained = gained; this.ghosts = ghosts;
    this.spawn();
    return true;
  }

  keepPlaying(): void { if (this.won) this.continued = true; }

  undo(): boolean {
    if (!this.previous) return false;
    const { tiles, score, continued, nextId } = this.previous;
    this.tiles = tiles; this.score = score; this.continued = continued; this.nextId = nextId;
    this.previous = null; this.gained = 0; this.ghosts = [];
    return true;
  }

  private spawn(): void {
    const occupied = new Set(this.tiles.map((tile) => tile.index));
    const empty = Array.from({ length: 16 }, (_, index) => index).filter((index) => !occupied.has(index));
    if (!empty.length) return;
    const index = empty[Math.floor(this.random() * empty.length)], value = this.random() < .9 ? 2 : 4;
    this.tiles.push({ id: this.nextId++, index, value, spawned: true, merged: false });
  }
}
