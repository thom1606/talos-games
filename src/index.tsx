import { openWindow, t, type TalosContext } from '@thom1606/talos-sdk';
import MinesweeperWindow from './windows/minesweeper';
import SudokuWindow from './windows/sudoku';
import TwentyFortyEightWindow from './windows/twenty-forty-eight';

export function activate(context: TalosContext): void {
  switch (context.action) {
    case 'infinite-minesweeper':
      openWindow({ title: t('game.title'), children: <MinesweeperWindow />, width: 620, height: 820 });
      break;
    case 'sudoku':
      openWindow({ title: t('sudoku.title'), children: <SudokuWindow />, width: 560, height: 730 });
      break;
    case 'play-2048':
      openWindow({ title: t('twenty.title'), children: <TwentyFortyEightWindow />, width: 540, height: 620 });
      break;
    default:
      throw new Error(`Unknown Talos Games action: ${context.action}`);
  }
}

export function deactivate(): void {}
