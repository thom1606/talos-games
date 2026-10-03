import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TwentyFortyEightGame } from '../src/game/twenty-forty-eight.ts';

const board = (row) => [...row, ...Array(12).fill(0)];
const settled = (game) => game.tiles.filter((tile) => !tile.spawned).sort((a, b) => a.index - b.index);

test('equal pairs merge once per move, in the direction of travel, with their value added to the score', () => {
  for (const [values, expected, score] of [
    [[2, 2, 2, 2], [4, 4], 8], [[2, 2, 4, 0], [4, 4], 4],
    [[4, 0, 4, 4], [8, 4], 8], [[2, 4, 4, 2], [2, 8, 2], 8],
  ]) {
    const game = new TwentyFortyEightGame(() => 0, board(values));
    assert.equal(game.move('left'), true);
    assert.deepEqual(settled(game).map((tile) => tile.value), expected);
    assert.deepEqual(settled(game).map((tile) => tile.index), expected.map((_, index) => index));
    assert.equal(game.score, score);
    assert.equal(game.tiles.filter((tile) => tile.spawned).length, 1);
  }
  for (const [direction, start, target] of [
    ['left', [2, 3], 0], ['right', [0, 1], 3], ['up', [8, 12], 0], ['down', [0, 4], 12],
  ]) {
    const cells = Array(16).fill(0); for (const index of start) cells[index] = 2;
    const game = new TwentyFortyEightGame(() => 0, cells);
    game.move(direction);
    assert.deepEqual(settled(game).map(({ index, value }) => ({ index, value })), [{ index: target, value: 4 }]);
  }
});

test('a move that changes nothing does not spawn a tile, consume randomness or replace the undo point', () => {
  let calls = 0;
  const game = new TwentyFortyEightGame(() => { calls++; return .99; }, board([2, 4, 8, 16]));
  const original = game.values;
  assert.equal(game.move('left'), false);
  assert.equal(calls, 0);
  assert.equal(game.canUndo, false);
  assert.deepEqual(game.values, original);
  game.move('down');
  const moved = game.values;
  assert.equal(game.move('down'), false);
  assert.deepEqual(game.values, moved);
  assert.equal(calls, 2);
  game.undo();
  assert.deepEqual(game.values, original);
  assert.equal(game.score, 0);
});

test('only a full board with no horizontal or vertical pair is game over', () => {
  const cells = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
  const lost = new TwentyFortyEightGame(() => 0, cells);
  assert.equal(lost.over, true);
  assert.equal(lost.move('left'), false);
  cells[15] = 0; assert.equal(new TwentyFortyEightGame(() => 0, cells).over, false);
  cells[15] = 4; assert.equal(new TwentyFortyEightGame(() => 0, cells).over, false);
  cells[15] = 2; cells[12] = 2;
  assert.equal(new TwentyFortyEightGame(() => 0, cells).over, false);
});

test('reaching 2048 pauses for victory; continuing and undo preserve the real board and score', () => {
  const original = board([1024, 1024, 4, 0]);
  const game = new TwentyFortyEightGame(() => 0, original);
  game.move('left');
  assert.equal(game.won, true);
  assert.equal(game.score, 2048);
  assert.equal(game.move('right'), false);
  game.keepPlaying(); assert.equal(game.won, false);
  assert.equal(game.move('right'), true);
  game.undo();
  assert.equal(game.values[0], 2048);
  assert.equal(game.score, 2048);
  assert.equal(game.canUndo, false);
  const reversible = new TwentyFortyEightGame(() => 0, original);
  reversible.move('left'); reversible.undo();
  assert.deepEqual(reversible.values, original);
  assert.equal(reversible.won, false);
  assert.equal(reversible.score, 0);
});

test('new games have two distinct tiles and moves conserve their sum before adding a 2 or 4', () => {
  for (let seed = 1; seed <= 40; seed++) {
    let state = seed;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
    const game = new TwentyFortyEightGame(random);
    assert.equal(game.tiles.length, 2);
    assert.equal(new Set(game.tiles.map((tile) => tile.index)).size, 2);
    for (let move = 0; move < 100; move++) {
      const sum = game.values.reduce((sum, value) => sum + value, 0);
      const direction = ['up', 'right', 'down', 'left'][Math.floor(random() * 4)];
      if (!game.move(direction)) continue;
      const added = game.values.reduce((sum, value) => sum + value, 0) - sum;
      assert.ok(added === 2 || added === 4);
      assert.equal(new Set(game.tiles.map((tile) => tile.index)).size, game.tiles.length);
      assert.equal(new Set(game.tiles.map((tile) => tile.id)).size, game.tiles.length);
      assert.equal(game.tiles.filter((tile) => tile.spawned).length, 1);
    }
  }
  const fours = new TwentyFortyEightGame(() => .95);
  assert.deepEqual(fours.tiles.map((tile) => tile.value), [4, 4]);
});
