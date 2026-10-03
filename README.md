# Talos Games

Three Talos tiles: **Minesweeper**, **Sudoku** and **2048**. Each opens directly into a new game.

[Download Talos Games](https://github.com/thom1606/talos-games/releases/latest)

Import the `.talos` file in Talos, or add `https://github.com/thom1606/talos-games` in **Repositories → Add GitHub repository…**.

## Minesweeper

The opening in the center is safe. The board extends in all directions.

- Click a covered square to toggle a flag (the mustard dot).
- Hold for 440 ms to uncover it. The square fills as you hold.
- Hold a number to uncover all unflagged neighbors. A missed mine ends the game.
- Drag or scroll to explore. Dragging cancels a pending press.
- Use the SDK's New game button on the right of the bottom window bar for a new board.
- Numbers fade to gray when all surrounding squares are uncovered or flagged, and become active again when a neighbor is unflagged.
- Keyboard: arrows navigate; F flags; Space/Enter uncovers or opens a number's neighbors.

The game reveals mines after a loss and remains pannable.

## Sudoku

Each board is generated locally with one unique solution. Select a square and use the number pad or keys 1–9. Given numbers stay fixed; conflicting entries are marked red and can be corrected.

- Notes toggles pencil marks (N, or hold Shift while typing a digit).
- Erase clears an entry or its notes (Delete or Backspace).
- Undo restores the previous move, including automatically removed peer notes (⌘Z).
- Arrow keys navigate the board. New game starts a fresh puzzle.
- A digit with nine entries is disabled in the number pad; erasing one enables it again.
- Pencil notes use Apple's New York serif font. Correct rows, columns and boxes briefly glow green.
- The finished scene shows active playing time. The timer pauses when the window loses focus or is hidden, and stops on completion. New game resets the timer.

## 2048

Slide a 4 × 4 board with the arrow keys, a mouse/touch swipe, or a trackpad swipe. Matching tiles merge once per move, and their new value is added to your score. A valid move adds one new 2 or 4; an unchanged move adds nothing.

- Undo restores one previous move, including its board and score (⌘Z).
- Reaching 2048 shows the winning scene; Keep playing continues beyond it.
- With no empty squares or matching neighbors left, the game ends and shows your final score.
- New game starts with two tiles and resets the score.

All games include Dutch and English and support reduced motion.

## Development

Requires Node.js 24 and npm. Uses the published `@thom1606/talos-sdk@3.4.0`; no local SDK checkout is needed.

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Import `dist/talos-games.talos` in Talos, or add this directory as a local project in Talos's repository settings. Register a game tile in your wheel. Activation files are ignored.

Talos currently requires files to invoke wheel tiles; this extension uses `*` to accept any dropped item. The SDK has no file-free game tile capability. No file contents are read or changed by this game.

GitHub Actions tests and builds the extension on pushes to main, then publishes the package version as a release with a `.talos` download.
