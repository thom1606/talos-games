import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InfiniteBoard, neighbors, keyOf } from '../src/game/board.ts';

test('the center opens safely across 1,000 different boards', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const board = new InfiniteBoard(seed);
    while (board.expanding) board.flush();
    assert.equal(board.lost, false);
    assert.equal(board.cell({ x: 0, y: 0 }).revealed, true);
    assert.equal(board.cell({ x: 0, y: 0 }).adjacent, 0);
    for (const cell of board.cells.values()) {
      if (cell.revealed) assert.equal(cell.mine, false);
    }
  }
});

test('exploration order and viewport reads do not change or allocate the board', () => {
  const board = new InfiniteBoard(44);
  const points = [{ x: -1000000, y: 1000000 }, { x: 300, y: -401 }, { x: -12, y: -8 }];
  const size = board.cells.size;
  const before = points.map((point) => board.cell(point));
  for (const point of [...points].reverse()) {
    assert.deepEqual(board.cell(point), before.find((cell) => keyOf(cell) === keyOf(point)));
  }
  assert.equal(board.cells.size, size);
});

test('flags do not score points, and revealing a flagged square clears its flag', () => {
  const board = new InfiniteBoard(13);
  let point;
  for (let x = 20; x < 200; x++) {
    const candidate = board.cell({ x, y: 20 });
    if (!candidate.mine && candidate.adjacent > 0) { point = candidate; break; }
  }
  assert.ok(point);
  const score = board.revealedCount;
  board.toggleFlag(point);
  assert.equal(board.cell(point).flagged, true);
  assert.equal(board.cell(point).revealed, false);
  board.toggleFlag(point);
  assert.equal(board.cell(point).flagged, false);
  board.toggleFlag(point);
  assert.equal(board.revealedCount, score);
  board.reveal(point);
  assert.equal(board.cell(point).flagged, false);
  assert.equal(board.revealedCount, score + 1);
  assert.equal(board.cell(point).revealed, true);
  assert.equal(board.lost, false);
});

test('a correctly flagged number opens all safe neighbors', () => {
  const board = new InfiniteBoard(8);
  const number = [...board.cells.values()].find((cell) => cell.revealed && cell.adjacent > 0);
  assert.ok(number);
  for (const point of neighbors(number)) if (board.isMine(point)) board.toggleFlag(point);
  board.chord(number);
  while (board.expanding) board.flush();
  assert.equal(board.lost, false);
  for (const point of neighbors(number)) {
    const cell = board.cell(point);
    assert.equal(cell.mine ? cell.flagged : cell.revealed, true);
  }
});

test('chording a missed mine ends the game and locks changes', () => {
  const board = new InfiniteBoard(8);
  const number = [...board.cells.values()].find((cell) => cell.revealed && cell.adjacent > 0);
  board.chord(number);
  assert.equal(board.lost, true);
  assert.equal(board.isMine(board.exploded), true);
  const score = board.revealedCount;
  board.toggleFlag({ x: 99, y: 99 });
  board.reveal({ x: 99, y: 99 });
  assert.equal(board.cell({ x: 99, y: 99 }).flagged, false);
  assert.equal(board.cell({ x: 99, y: 99 }).revealed, false);
  assert.equal(board.revealedCount, score);
});

test('numbers complete when every neighbor is uncovered or flagged, and reactivate when unflagged', () => {
  const board = new InfiniteBoard(8);
  const number = [...board.cells.values()].find((cell) => cell.revealed && cell.adjacent > 0);
  assert.ok(number);
  assert.equal(board.isComplete(number), false);
  const covered = neighbors(number).filter((point) => !board.cell(point).revealed);
  for (const point of covered) board.toggleFlag(point);
  assert.equal(board.isComplete(number), true);
  board.toggleFlag(covered[0]);
  assert.equal(board.isComplete(number), false);
  assert.equal(board.isComplete({ x: 100, y: 100 }), false);
  assert.equal(board.isComplete({ x: 0, y: 0 }), false);
});
