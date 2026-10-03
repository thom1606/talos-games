import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button, t } from '@thom1606/talos-sdk/react';
import { SudokuGame, sudokuPeers, sudokuUnits } from '../game/sudoku';
import { PlayClock, formatPlayTime } from '../game/play-clock';
import './sudoku.css';

const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function SudokuWindow() {
  const [game, setGame] = useState(() => new SudokuGame());
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState(() => game.givens.indexOf(0));
  const [notes, setNotes] = useState(false);
  const [glows, setGlows] = useState<{ unit: number; key: number }[]>([]);
  const correctUnits = useRef(new Set(game.correctUnits));
  const glowSequence = useRef(0);
  const clock = useMemo(() => new PlayClock(), [game]);
  const grid = useRef<HTMLDivElement>(null);
  const conflicts = game.conflicts;
  const completed = game.completed;
  const completionTime = completed ? formatPlayTime(clock.elapsed(performance.now())) : '';
  const value = game.values[selected];
  const peers = new Set(sudokuPeers[selected]);
  const editable = !game.givens[selected] && !completed;
  const filled = game.values.filter(Boolean).length;
  const digitCounts = game.digitCounts;

  useEffect(() => { grid.current?.querySelector<HTMLButtonElement>(`[data-index="${selected}"]`)?.focus({ preventScroll: true }); }, [selected, game, revision]);

  useEffect(() => {
    const synchronize = () => clock.setActive(!completed && document.visibilityState === 'visible' && document.hasFocus(), performance.now());
    const pause = () => clock.setActive(false, performance.now());
    synchronize();
    window.addEventListener('focus', synchronize);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', synchronize);
    window.addEventListener('pagehide', pause);
    return () => {
      pause();
      window.removeEventListener('focus', synchronize);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', synchronize);
      window.removeEventListener('pagehide', pause);
    };
  }, [clock, completed]);

  useEffect(() => {
    if (!glows.length) return;
    const timeout = window.setTimeout(() => setGlows([]), 900);
    return () => window.clearTimeout(timeout);
  }, [glows]);

  function refresh(changed: boolean) {
    if (!changed) return;
    if (game.completed) clock.setActive(false, performance.now());
    const next = new Set(game.correctUnits);
    const added = [...next].filter((unit) => !correctUnits.current.has(unit))
      .map((unit) => ({ unit, key: ++glowSequence.current }));
    correctUnits.current = next;
    setGlows((previous) => [...previous.filter((glow) => next.has(glow.unit)), ...added]);
    setRevision((revision) => revision + 1);
  }
  function input(digit: number, pencil = notes) {
    if (digitCounts[digit] < 9) refresh(game.input(selected, digit, pencil));
  }
  function restart() {
    const next = new SudokuGame();
    correctUnits.current = new Set(next.correctUnits); setGlows([]);
    setGame(next); setSelected(next.givens.indexOf(0)); setNotes(false); setRevision(0);
  }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (completed) return;
    if (event.metaKey || event.ctrlKey) {
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); refresh(game.undo()); }
      return;
    }
    const directions: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
    if (event.key in directions) {
      if (!(event.target as HTMLElement).closest('.sudoku-grid')) return;
      event.preventDefault();
      const next = selected + directions[event.key];
      if (next >= 0 && next < 81 && (Math.abs(directions[event.key]) === 9 || Math.floor(next / 9) === Math.floor(selected / 9))) setSelected(next);
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); input(Number(event.key), notes || event.shiftKey); }
    else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); refresh(game.erase(selected)); }
    else if (event.key.toLowerCase() === 'n') { event.preventDefault(); setNotes((notes) => !notes); }
  }

  return <div className="sudoku-game" data-revision={revision} onKeyDown={keyDown}>
    <main className="sudoku-area">
      <div className="sudoku-content">
        <div className="sudoku-status" aria-live="polite">
          <span>{notes ? t('sudoku.notesOn') : t('sudoku.hint')}</span>
          <span>{filled}<span className="sudoku-total"> / 81</span></span>
        </div>
        <div className="sudoku-grid" ref={grid} role="grid" aria-label={t('sudoku.board')}>
          {Array.from({ length: 9 }, (_, row) => <div role="row" className="sudoku-row" key={row}>
            {Array.from({ length: 9 }, (_, column) => {
              const index = row * 9 + column, digit = game.values[index];
              const candidates = digits.filter((number) => game.notes[index] & (1 << number));
              const label = digit ? t('sudoku.cellValue', { row: row + 1, column: column + 1, value: digit })
                : t('sudoku.cellEmpty', { row: row + 1, column: column + 1 });
              return <button type="button" role="gridcell" key={index} data-index={index}
                tabIndex={selected === index ? 0 : -1} aria-label={label + (candidates.length ? `, ${t('sudoku.notes')}: ${candidates.join(', ')}` : '')}
                aria-selected={selected === index} aria-readonly={Boolean(game.givens[index])} aria-invalid={conflicts.has(index)}
                onClick={() => setSelected(index)}
                className={`sudoku-cell ${game.givens[index] ? 'given' : ''} ${selected === index ? 'selected' : ''} ${peers.has(index) ? 'peer' : ''} ${digit && digit === value ? 'match' : ''} ${conflicts.has(index) ? 'conflict' : ''} ${column === 2 || column === 5 ? 'box-right' : ''} ${row === 2 || row === 5 ? 'box-bottom' : ''}`}>
                {digit ? <span className="sudoku-value" key={digit}>{digit}</span> : <span className="sudoku-notes" aria-hidden="true">
                  {digits.map((number) => <span key={number}>{game.notes[index] & (1 << number) ? number : ''}</span>)}
                </span>}
              </button>;
            })}
          </div>)}
          {glows.map(({ unit, key }) => {
            const { kind, number } = sudokuUnits[unit];
            const left = kind === 'row' ? 0 : kind === 'column' ? number / 9 : number % 3 / 3;
            const top = kind === 'column' ? 0 : kind === 'row' ? number / 9 : Math.floor(number / 3) / 3;
            return <div className={`sudoku-glow ${kind}`} key={key} aria-hidden="true"
              style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: kind === 'row' ? '100%' : kind === 'column' ? `${100 / 9}%` : `${100 / 3}%`, height: kind === 'column' ? '100%' : kind === 'row' ? `${100 / 9}%` : `${100 / 3}%` }} />;
          })}
        </div>
        <div className="sudoku-keypad" aria-label={t('sudoku.numbers')}>
          {digits.map((digit) => <button type="button" key={digit} disabled={!editable || digitCounts[digit] >= 9} aria-label={t('sudoku.enter', { value: digit })}
            className={notes ? 'pencil' : ''} onClick={() => input(digit)}>
            <span>{digit}</span>
          </button>)}
        </div>
      </div>
      {completed && <div className="sudoku-finished" role="status">
        <div>
          <strong className="sudoku-time" aria-label={t('sudoku.time', { time: completionTime })}>{completionTime}</strong>
          <p>{t('sudoku.complete')}</p>
        </div>
      </div>}
    </main>
    <footer className="sudoku-footer">
      <div className="sudoku-actions">
        <Button disabled={!game.canUndo || completed} onClick={() => refresh(game.undo())}>{t('sudoku.undo')}</Button>
        <Button disabled={!editable || (!game.values[selected] && !game.notes[selected])} onClick={() => refresh(game.erase(selected))}>{t('sudoku.erase')}</Button>
        <Button aria-pressed={notes} disabled={completed} onClick={() => setNotes((notes) => !notes)}>{t('sudoku.notes')}</Button>
      </div>
      <Button onClick={restart}>{t('game.restart')}</Button>
    </footer>
  </div>;
}
