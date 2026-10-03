export type SudokuPuzzle = { givens: number[]; solution: number[] };

const boxOf = (index: number) => Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3);
export const sudokuPeers = Array.from({ length: 81 }, (_, index) =>
  Array.from({ length: 81 }, (_, peer) => peer).filter((peer) => peer !== index &&
    (Math.floor(peer / 9) === Math.floor(index / 9) || peer % 9 === index % 9 || boxOf(peer) === boxOf(index))));

export const sudokuUnits = (['row', 'column', 'box'] as const).flatMap((kind) =>
  Array.from({ length: 9 }, (_, number) => ({
    kind, number,
    cells: Array.from({ length: 81 }, (_, index) => index).filter((index) =>
      (kind === 'row' ? Math.floor(index / 9) : kind === 'column' ? index % 9 : boxOf(index)) === number),
  })));

/** Stop after two solutions: puzzle generation only needs to distinguish unique from ambiguous. */
export function solveSudoku(input: readonly number[], limit = 2): number[][] {
  if (input.length !== 81 || input.some((value) => !Number.isInteger(value) || value < 0 || value > 9)) return [];
  const cells = [...input];
  const rows = Array<number>(9).fill(0), columns = Array<number>(9).fill(0), boxes = Array<number>(9).fill(0);
  for (let index = 0; index < 81; index++) {
    const value = cells[index];
    if (!value) continue;
    const row = Math.floor(index / 9), column = index % 9, box = boxOf(index), bit = 1 << value;
    if ((rows[row] | columns[column] | boxes[box]) & bit) return [];
    rows[row] |= bit; columns[column] |= bit; boxes[box] |= bit;
  }
  const solutions: number[][] = [];
  function search() {
    let next = -1, candidates = 0, smallest = 10;
    for (let index = 0; index < 81; index++) {
      if (cells[index]) continue;
      const mask = 0x3fe & ~(rows[Math.floor(index / 9)] | columns[index % 9] | boxes[boxOf(index)]);
      let count = 0;
      for (let bits = mask; bits; bits &= bits - 1) count++;
      if (!count) return;
      if (count < smallest) { next = index; candidates = mask; smallest = count; }
      if (count === 1) break;
    }
    if (next === -1) { solutions.push([...cells]); return; }
    const row = Math.floor(next / 9), column = next % 9, box = boxOf(next);
    for (let value = 1; value <= 9 && solutions.length < limit; value++) {
      const bit = 1 << value;
      if (!(candidates & bit)) continue;
      cells[next] = value; rows[row] |= bit; columns[column] |= bit; boxes[box] |= bit;
      search();
      cells[next] = 0; rows[row] &= ~bit; columns[column] &= ~bit; boxes[box] &= ~bit;
    }
  }
  search();
  return solutions;
}

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function generateSudoku(random: () => number = Math.random): SudokuPuzzle {
  const groups = [0, 1, 2];
  const order = () => shuffle(groups, random).flatMap((group) => shuffle(groups, random).map((offset) => group * 3 + offset));
  const rows = order(), columns = order(), digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const solution = rows.flatMap((row) => columns.map((column) => digits[(row * 3 + Math.floor(row / 3) + column) % 9]));
  const givens = [...solution];
  let remaining = 81;
  for (const index of shuffle(Array.from({ length: 81 }, (_, index) => index), random)) {
    if (remaining <= 36) break;
    const previous = givens[index];
    givens[index] = 0;
    if (solveSudoku(givens).length === 1) remaining--;
    else givens[index] = previous;
  }
  return { givens, solution };
}

type Move = { values: number[]; notes: number[] };

export class SudokuGame {
  readonly givens: number[];
  private readonly solution: number[];
  values: number[];
  notes = Array<number>(81).fill(0);
  private history: Move[] = [];

  constructor(puzzle: SudokuPuzzle = generateSudoku()) {
    this.givens = [...puzzle.givens];
    this.solution = [...puzzle.solution];
    this.values = [...puzzle.givens];
  }

  get conflicts(): Set<number> {
    const conflicts = new Set<number>();
    for (let index = 0; index < 81; index++) {
      if (this.values[index] && sudokuPeers[index].some((peer) => this.values[peer] === this.values[index])) conflicts.add(index);
    }
    return conflicts;
  }

  get completed(): boolean { return this.values.every((value) => value > 0) && this.conflicts.size === 0; }
  get canUndo(): boolean { return this.history.length > 0; }
  get digitCounts(): number[] {
    const counts = Array<number>(10).fill(0);
    for (const value of this.values) if (value) counts[value]++;
    return counts;
  }
  get correctUnits(): number[] {
    return sudokuUnits.flatMap((unit, index) => unit.cells.every((cell) => this.values[cell] === this.solution[cell]) ? [index] : []);
  }

  input(index: number, value: number, note = false): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= 81 || !Number.isInteger(value) || value < 1 || value > 9 ||
        this.givens[index] || this.completed || (note && this.values[index]) || (!note && this.values[index] === value)) return false;
    this.remember();
    if (note) this.notes[index] ^= 1 << value;
    else {
      this.values[index] = value;
      this.notes[index] = 0;
      for (const peer of sudokuPeers[index]) this.notes[peer] &= ~(1 << value);
    }
    return true;
  }

  erase(index: number): boolean {
    if (!Number.isInteger(index) || index < 0 || index >= 81 || this.givens[index] || this.completed ||
        (!this.values[index] && !this.notes[index])) return false;
    this.remember();
    this.values[index] = 0; this.notes[index] = 0;
    return true;
  }

  undo(): boolean {
    const previous = this.history.pop();
    if (!previous) return false;
    this.values = previous.values; this.notes = previous.notes;
    return true;
  }

  private remember() {
    this.history.push({ values: [...this.values], notes: [...this.notes] });
    if (this.history.length > 200) this.history.shift();
  }
}
