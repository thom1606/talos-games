# Talos Games

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
TypeScript and React, packaged with the published npm Talos SDK. Runs inside Talos's WebKit extension window.

## Product Purpose
A Talos extension with Minesweeper, Sudoku and 2048 tiles. Activating a tile starts a game immediately.

## Capabilities and Constraints
Minesweeper has an endless board in every direction. The center starts safely. Short presses toggle flags, long presses reveal, and holding a number reveals its unflagged neighbors. A wrong reveal ends the game and exposes mines. Holding a square fills it with progress. Sudoku generates uniquely solvable puzzles locally, supports pencil marks, undo, conflict feedback and keyboard navigation. 2048 combines matching numbers on a 4 × 4 board, supports arrow keys and swipes, scores merges and allows one-step undo and continued play beyond 2048. No host or SDK source modifications.

## Brand Commitments
Use the supplied Sapper screenshots as visual authority: cream surfaces, rounded squares, dark numbers, mustard flags, and red mine squares. No Sapper name or assets are shipped.
