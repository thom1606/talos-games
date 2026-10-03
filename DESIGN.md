# Minesweeper

The user-supplied Sapper references govern this game. The board fills the content area and continues beyond every edge. The window opens at 620 × 820 pixels. There is no title, flag counter, or top-right control overlay. A small score display sits at the top right while playing: each revealed safe square earns one point, including the opening area. Flags and mines earn no points. The SDK's standard Button sits on the right of the bottom window bar and starts a new game. After a loss, a dark overlay covers the inactive board; the loss message and final score appear as centered light text, without a card. The top-right score and bottom hint disappear. There is no start screen.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| paper | `#f8f4e9` | Board and controls |
| square | `#eae4d3` | Covered squares |
| ink | `#28251f` | Numbers and primary text |
| muted | `#696255` | Secondary text |
| completed number | `#bcb7aa` | Numbers with every neighbor revealed or flagged |
| gold | `#d29a18` | Flag dots and reveal progress |
| red | `#b43b3c` | Mine squares |
| grid step | `52px` | Square pitch |
| tile size | `48px` | Square footprint |
| tile radius | `9px` | Square corners |

Use the macOS system font to match the quiet numeric lettering in the reference. Icons are authored SVG strokes. Mines and flags use simple dots, as in the references.

## Motion and controls

Holding a covered square or an unfinished number has a 200 ms grace period with no fill or tile movement, then progress fills from left to right over 240 ms. After 440 ms total, covered squares open and numbers open their unflagged neighbors. A short click on a number does nothing; completed numbers and empty squares do not start a hold. Reveals dissolve their cover with a short distance-based delay. Flags settle with one small overshoot. Losing exposes mines in a wave from the mistake. Reduced motion removes decorative movement while preserving the functional hold timer.

The game supports mouse, trackpad, pointer/touch events, and keyboard navigation. Keep drag cancellation and the single roving focus target when changing controls. Rendering keeps at least eight extra rows and columns beyond each viewport edge. Panning moves one composited layer; the render buffer advances in four-cell steps and unchanged tiles retain their DOM. Covered squares do not calculate neighbor counts for display. Coordinates are periodically rebased so long journeys stay within browser layout limits; viewport reads do not retain unexplored cells. Revealed cells record their reveal time, so remounting after a long pan resumes the original animation timeline instead of replaying it.

## Sudoku

Sudoku extends the same paper, system-font and mustard palette. Its 560 × 730 window opens directly into a locally generated puzzle. A centered 432px board uses fine internal lines and stronger 3 × 3 boundaries. Given digits are dark and semibold; player entries use `#8a6111`, selected peers use `#efe9d9`, matching digits use `#e8dab3`, and conflicting digits use `#a03a32` on `#f2ded7`. Selection uses an inset outline, preserving grid lines. Small pencil marks occupy their numeric positions in a 3 × 3 grid within each cell.

Nine square number buttons sit beneath the board. Digits with nine entries are disabled at 50% opacity and reactivate after erasing or undoing a placement. Pencil notes use `ui-serif`, Apple's New York system font on macOS. There is no keyboard shortcut caption. The transparent native-styled footer holds Undo, Erase and Notes on the left and New game on the right. The native titlebar supplies the title. Keyboard entry, arrows, N, Shift for temporary notes and ⌘Z use the same move handling as pointer controls. Entries settle over 150ms; newly correct rows, columns and boxes briefly glow green for 900ms. Reduced motion keeps the brief green highlight without animation. Solving fades in a centered completion scene with large active playing time above a smaller "Sudoku complete" subtitle. The time pauses on focus loss or hidden documents and freezes on completion. New game resets the time. Narrow windows shrink the board and keypad together, and short windows allow the game area to scroll while the footer remains visible.

## 2048

2048 opens directly into two tiles in a 540 × 620 window. A centered 432px board has four rows and columns, 12px padding, 10px gaps and the same 9px rounded squares as Minesweeper. Tiles range from paper and pale gold to deep bronze as their values increase; lower digits stay dark, and values from 32 onward use paper-colored text. The native titlebar carries the game name; a short goal and score sit above the board. There is no shortcut caption or extra direction toolbar.

Stable tile IDs let tiles slide with 140ms transform transitions. Merging source tiles converge under a brief pop of the doubled value; a new tile appears after the slide. Arrow keys, mouse/touch swipes and trackpad gestures share one move handler. Trackpad momentum is consumed within its gesture so it does not create extra moves. Reduced motion keeps changes immediate. The transparent native footer holds one-step Undo and New game, and adds Keep playing after reaching 2048. Win and loss scenes dim the entire board and show centered text with the final score. The board's animation layers stay below this overlay. Narrow windows shrink the board; short windows scroll the game area while the footer remains visible.
