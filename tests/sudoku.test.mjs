import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSudoku, solveSudoku, SudokuGame, sudokuPeers } from '../src/game/sudoku.ts';
import { PlayClock, formatPlayTime } from '../src/game/play-clock.ts';

function seeded(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
}

test('generated puzzles have one valid solution, across different seeds', () => {
  const puzzles = new Set();
  for (let seed = 0; seed < 30; seed++) {
    const puzzle = generateSudoku(seeded(seed));
    assert.deepEqual(solveSudoku(puzzle.givens), [puzzle.solution]);
    assert.ok(puzzle.givens.filter(Boolean).length >= 36);
    assert.ok(puzzle.givens.filter(Boolean).length < 45);
    const game = new SudokuGame(puzzle);
    assert.equal(game.completed, false);
    const given = puzzle.givens.findIndex(Boolean);
    assert.equal(game.input(given, puzzle.solution[given]), false);
    assert.equal(game.erase(given), false);
    for (let index = 0; index < 81; index++) if (!puzzle.givens[index]) game.input(index, puzzle.solution[index]);
    assert.equal(game.completed, true);
    assert.equal(game.conflicts.size, 0);
    puzzles.add(puzzle.givens.join(''));
  }
  assert.equal(puzzles.size, 30);
});

test('conflicting entries remain editable and cannot complete a puzzle', () => {
  const puzzle = generateSudoku(seeded(3));
  const game = new SudokuGame(puzzle);
  const index = puzzle.givens.indexOf(0);
  const peer = sudokuPeers[index].find((peer) => puzzle.givens[peer]);
  game.input(index, puzzle.givens[peer]);
  assert.equal(game.conflicts.has(index), true);
  assert.equal(game.conflicts.has(peer), true);
  assert.equal(game.completed, false);
  game.input(index, puzzle.solution[index]);
  assert.equal(game.conflicts.size, 0);
  assert.equal(game.erase(index), true);
  assert.equal(game.values[index], 0);
});

test('placing a number clears peer notes; undo restores both values and notes', () => {
  const puzzle = generateSudoku(seeded(5));
  const game = new SudokuGame(puzzle);
  const index = puzzle.givens.findIndex((digit, index) => !digit && sudokuPeers[index].some((peer) => !puzzle.givens[peer]));
  const peer = sudokuPeers[index].find((peer) => !puzzle.givens[peer]);
  const number = puzzle.solution[index];
  game.input(index, number, true);
  game.input(peer, number, true);
  assert.equal(game.values[index], 0);
  assert.equal(game.notes[peer], 1 << number);
  game.input(index, number);
  assert.equal(game.notes[index], 0);
  assert.equal(game.notes[peer], 0);
  game.undo();
  assert.equal(game.values[index], 0);
  assert.equal(game.notes[index], 1 << number);
  assert.equal(game.notes[peer], 1 << number);
  game.erase(index);
  assert.equal(game.notes[index], 0);
  game.undo();
  assert.equal(game.notes[index], 1 << number);
});

test('correct rows, columns and boxes follow the solution and update after undo', () => {
  const puzzle = generateSudoku(seeded(8));
  const game = new SudokuGame({ ...puzzle, givens: Array(81).fill(0) });
  for (let index = 0; index < 9; index++) game.input(index, puzzle.solution[index]);
  assert.deepEqual(game.correctUnits, [0]);
  // A row with nine different numbers is not necessarily the correct row.
  [game.values[0], game.values[1]] = [game.values[1], game.values[0]];
  assert.deepEqual(game.correctUnits, []);
  [game.values[0], game.values[1]] = [game.values[1], game.values[0]];
  for (let row = 1; row < 9; row++) game.input(row * 9, puzzle.solution[row * 9]);
  for (const index of [10, 11, 19, 20, 9, 18]) game.input(index, puzzle.solution[index]);
  assert.deepEqual(game.correctUnits, [0, 9, 18]);
  game.erase(0);
  assert.deepEqual(game.correctUnits, []);
  game.undo();
  assert.deepEqual(game.correctUnits, [0, 9, 18]);
  const digit = puzzle.solution[0];
  for (let index = 0; index < 81; index++) if (puzzle.solution[index] === digit) game.input(index, digit);
  assert.equal(game.digitCounts[digit], 9);
  game.erase(0);
  assert.equal(game.digitCounts[digit], 8);
  game.undo();
  assert.equal(game.digitCounts[digit], 9);
});

test('play time excludes inactive windows and remains frozen after stopping', () => {
  const clock = new PlayClock();
  assert.equal(clock.elapsed(10000), 0);
  clock.setActive(true, 10000);
  clock.setActive(true, 11000); // Repeated focus does not reset the start.
  clock.setActive(false, 12000);
  assert.equal(clock.elapsed(100000), 2000);
  clock.setActive(true, 100000);
  clock.setActive(false, 162000);
  clock.setActive(false, 200000);
  assert.equal(formatPlayTime(clock.elapsed(500000)), '1:04');
  assert.equal(formatPlayTime(3600000), '60:00');
  assert.equal(new PlayClock().elapsed(500000), 0);
});
