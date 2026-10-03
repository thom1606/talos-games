import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button, t } from '@thom1606/talos-sdk/react';
import { TwentyFortyEightGame, type Direction, type Tile } from '../game/twenty-forty-eight';
import './twenty-forty-eight.css';

const directions: Record<string, Direction> = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };

export default function TwentyFortyEightWindow() {
  const [game, setGame] = useState(() => new TwentyFortyEightGame());
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState(0);
  const [ghosts, setGhosts] = useState<Tile[]>([]);
  const [gain, setGain] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const moveRef = useRef(move);
  moveRef.current = move;
  const finished = game.over || game.won;

  useEffect(() => { board.current?.focus({ preventScroll: true }); }, [game]);
  useEffect(() => {
    if (!ghosts.length) return;
    const timeout = window.setTimeout(() => setGhosts([]), 170);
    return () => window.clearTimeout(timeout);
  }, [ghosts]);
  useEffect(() => {
    if (!gain) return;
    const timeout = window.setTimeout(() => setGain(0), 800);
    return () => window.clearTimeout(timeout);
  }, [gain, revision]);

  useEffect(() => {
    const element = board.current;
    if (!element) return;
    let last = 0, x = 0, y = 0, used = false;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const now = performance.now();
      // A trackpad gesture includes momentum: wait for a quiet gap before accepting another.
      if (now - last > 180) { x = 0; y = 0; used = false; }
      last = now;
      if (used) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      x += (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * unit;
      y += (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * unit;
      if (Math.max(Math.abs(x), Math.abs(y)) < 32) return;
      used = true;
      moveRef.current(Math.abs(x) > Math.abs(y) ? x > 0 ? 'left' : 'right' : y > 0 ? 'up' : 'down');
    };
    const reset = () => { last = 0; x = 0; y = 0; used = false; pointer.current = null; };
    element.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', reset);
    return () => { element.removeEventListener('wheel', wheel); window.removeEventListener('blur', reset); };
  }, [game]);

  function refresh(changed: boolean) {
    if (!changed) return;
    setGhosts(game.ghosts); setGain(game.gained); setRevision((revision) => revision + 1);
  }
  function move(direction: Direction) { refresh(game.move(direction)); }
  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.metaKey || event.ctrlKey) {
      if (event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); refresh(game.undo()); }
      return;
    }
    if (directions[event.key]) { event.preventDefault(); move(directions[event.key]); }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary || finished) return;
    pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus({ preventScroll: true });
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointer.current;
    if (!start || start.id !== event.pointerId) return;
    pointer.current = null;
    const x = event.clientX - start.x, y = event.clientY - start.y;
    if (Math.max(Math.abs(x), Math.abs(y)) < 24) return;
    move(Math.abs(x) > Math.abs(y) ? x > 0 ? 'right' : 'left' : y > 0 ? 'down' : 'up');
  }
  function restart() {
    pointer.current = null; setGhosts([]); setGain(0); setRevision(0); setSession((session) => session + 1);
    setGame(new TwentyFortyEightGame());
  }

  return <div className="twenty-game" onKeyDown={keyDown} data-revision={revision}>
    <main className="twenty-area">
      <div className="twenty-content">
        <div className="twenty-status">
          <span>{t('twenty.goal')}</span>
          {!finished && <span className="twenty-score" aria-live="polite">
            {t('game.score')} <strong>{game.score.toLocaleString()}</strong>
            {gain > 0 && <span className="twenty-gain" key={revision} aria-hidden="true">+{gain}</span>}
          </span>}
        </div>
        <div className="twenty-board" ref={board} tabIndex={0} role="group" aria-label={t('twenty.board')}
          aria-keyshortcuts="ArrowUp ArrowRight ArrowDown ArrowLeft" onPointerDown={pointerDown} onPointerUp={pointerUp}
          onPointerCancel={() => { pointer.current = null; }} onLostPointerCapture={() => { pointer.current = null; }}>
          <div className="twenty-background" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <div key={index} />)}</div>
          <div className="twenty-tiles" aria-hidden="true">
            {[...ghosts, ...game.tiles].map((tile) => <div key={`${session}-${tile.id}`}
              className={`twenty-tile ${ghosts.includes(tile) ? 'ghost' : ''} ${tile.merged ? 'merge-target' : ''}`}
              style={{ transform: `translate(calc(${tile.index % 4} * (100% + var(--twenty-gap))), calc(${Math.floor(tile.index / 4)} * (100% + var(--twenty-gap))))` }}>
              <span className={`twenty-value ${tile.spawned ? 'spawned' : ''} ${tile.merged ? 'merged' : ''} ${String(tile.value).length > 3 ? 'long' : ''} ${String(tile.value).length > 5 ? 'very-long' : ''}`}
                data-value={Math.min(tile.value, 2048)}>{tile.value}</span>
            </div>)}
          </div>
          <div className="twenty-accessible" role="grid" aria-label={t('twenty.board')}>
            {Array.from({ length: 4 }, (_, row) => <div role="row" key={row}>
              {game.values.slice(row * 4, row * 4 + 4).map((value, column) => <span role="gridcell" key={column}>
                {value ? t('sudoku.cellValue', { row: row + 1, column: column + 1, value }) : t('sudoku.cellEmpty', { row: row + 1, column: column + 1 })}
              </span>)}
            </div>)}
          </div>
        </div>
      </div>
      {finished && <div className="twenty-finished" role="status">
        <div><strong>{t(game.over ? 'twenty.over' : 'twenty.won')}</strong><p>{t('game.points', { count: game.score })}</p></div>
      </div>}
    </main>
    <footer className="twenty-footer">
      <div className="twenty-actions">
        <Button disabled={!game.canUndo} onClick={() => refresh(game.undo())}>{t('sudoku.undo')}</Button>
        {game.won && !game.over && <Button onClick={() => { game.keepPlaying(); setRevision((revision) => revision + 1); board.current?.focus({ preventScroll: true }); }}>{t('twenty.continue')}</Button>}
      </div>
      <Button onClick={restart}>{t('game.restart')}</Button>
    </footer>
  </div>;
}
