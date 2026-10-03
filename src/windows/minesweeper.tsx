import { useEffect, useLayoutEffect, memo, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react';
import { Button, t } from '@thom1606/talos-sdk/react';
import { InfiniteBoard, keyOf, type Cell, type Point } from '../game/board';
import './minesweeper.css';

const STEP = 52;
const RENDER_MARGIN = 8;
const RENDER_CHUNK = 4;
const HOLD = 440;
const HOLD_DELAY = 200;
type Gesture = {
  id: number; start: Point; camera: Point; point: Point | null;
  moved: boolean; fired: boolean; timer: ReturnType<typeof setTimeout> | null;
};

function CellContents({ cell, mine, origin, wrongFlag }: { cell: Cell; mine: boolean; origin: boolean; wrongFlag: boolean }) {
  const [mountedAt] = useState(() => performance.now());
  // Remounting an explored square continues its original reveal, rather than restarting it.
  const revealStyle = { '--delay': `${cell.wave * 18 - Math.max(0, mountedAt - cell.revealedAt)}ms` } as CSSProperties;
  return <>
    <span className="tile-cover" style={revealStyle} />
    <span className="hold-fill" />
    {mine ? <span className="mine-dot" /> : cell.flagged ? <span className="flag-dot" />
      : cell.revealed && cell.adjacent > 0 ? <span className="number" style={revealStyle}>{cell.adjacent}</span>
      : origin ? <span className="origin-dot" /> : null}
    {wrongFlag && <span className="wrong-mark" />}
  </>;
}

type TileProps = Cell & {
  left: number; top: number; complete: boolean; wrongFlag: boolean;
  holding: boolean; focused: boolean; lost: boolean; mineDelay: number;
};

// Snapshot scalar props: Cell objects in the board are mutable, so comparing their
// identity would miss changes. Unchanged tiles retain their DOM and animations.
const Tile = memo(function Tile(cell: TileProps) {
  const { x, y, mine, wrongFlag } = cell;
  const key = keyOf(cell);
  const origin = x === 0 && y === 0;
  const label = mine ? t('game.mine') : cell.revealed
    ? cell.adjacent ? t('game.number', { count: cell.adjacent }) : t('game.empty')
    : cell.flagged ? t('game.flagged') : t('game.covered');
  const style = {
    left: cell.left, top: cell.top,
    '--mine-delay': `${cell.mineDelay}ms`, '--hold-duration': `${HOLD - HOLD_DELAY}ms`,
  } as CSSProperties;
  return <button type="button" role="gridcell"
    className={`tile ${cell.revealed && !mine ? 'revealed' : ''} ${cell.complete ? 'complete' : ''} ${cell.flagged ? 'flagged' : ''} ${mine ? 'mine' : ''} ${wrongFlag ? 'wrong-flag' : ''} ${cell.holding ? 'holding' : ''} ${origin ? 'origin' : ''}`}
    style={style} data-cell={key} data-x={x} data-y={y}
    tabIndex={cell.focused ? 0 : -1}
    aria-label={`${x}, ${y}: ${label}`} aria-disabled={cell.lost}>
    <CellContents cell={cell} mine={mine} origin={origin} wrongFlag={wrongFlag} />
  </button>;
});

function tilePoint(target: EventTarget): Point | null {
  const tile = (target as HTMLElement).closest<HTMLElement>('[data-cell]');
  return tile ? { x: Number(tile.dataset.x), y: Number(tile.dataset.y) } : null;
}

export default function MinesweeperWindow() {
  const [game, setGame] = useState(() => new InfiniteBoard());
  const [revision, setRevision] = useState(game.revision);
  const [camera, setCamera] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 620, height: 780 });
  const [holding, setHolding] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [focus, setFocus] = useState<Point>({ x: 0, y: 0 });
  const [generation, setGeneration] = useState(0);
  const surface = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const refresh = () => setRevision(game.revision);
  function cancelGesture() {
    if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    gesture.current = null;
    setHolding(null);
    setDragging(false);
  }

  useLayoutEffect(() => {
    const node = surface.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!game.expanding) return;
    const frame = requestAnimationFrame(() => { game.flush(); setRevision(game.revision); });
    return () => cancelAnimationFrame(frame);
  }, [game, revision]);

  useEffect(() => {
    const cancel = () => cancelGesture();
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
      if (gesture.current?.timer) clearTimeout(gesture.current.timer);
    };
  }, []);

  function start(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current || (event.button !== 0 && event.button !== 1)) return;
    const point = tilePoint(event.target);
    const tile = (event.target as HTMLElement).closest<HTMLElement>('[data-cell]');
    event.preventDefault();
    if (point) {
      setFocus(point);
      tile?.focus({ preventScroll: true });
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const current: Gesture = {
      id: event.pointerId, start: { x: event.clientX, y: event.clientY }, camera,
      point: event.button === 0 ? point : null, moved: false, fired: false, timer: null,
    };
    gesture.current = current;
    const cell = current.point ? game.cell(current.point) : null;
    if (current.point && cell && !game.lost && (!cell.revealed || (cell.adjacent > 0 && !game.isComplete(cell)))) {
      current.timer = setTimeout(() => {
        if (gesture.current !== current || current.moved) return;
        setHolding(keyOf(current.point!));
        current.timer = setTimeout(() => {
          if (gesture.current !== current || current.moved) return;
          current.fired = true;
          if (game.cell(current.point!).revealed) game.chord(current.point!);
          else game.reveal(current.point!);
          setHolding(null);
          refresh();
        }, HOLD - HOLD_DELAY);
      }, HOLD_DELAY);
    }
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    if (!current.moved && Math.hypot(dx, dy) > 7) {
      current.moved = true;
      if (current.timer) clearTimeout(current.timer);
      setHolding(null);
      setDragging(true);
    }
    if (current.moved) setCamera({ x: current.camera.x + dx, y: current.camera.y + dy });
  }

  function end(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved && !current.fired && current.point && !game.lost) {
      const cell = game.cell(current.point);
      if (!cell.revealed) {
        game.toggleFlag(current.point);
        refresh();
      }
    }
    cancelGesture();
  }

  function reset() {
    cancelGesture();
    const next = new InfiniteBoard();
    setGame(next);
    setRevision(next.revision);
    setCamera({ x: 0, y: 0 });
    setFocus({ x: 0, y: 0 });
    setGeneration((value) => value + 1);
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const directions: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    };
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      const next = { x: focus.x + direction.x, y: focus.y + direction.y };
      setFocus(next);
      const px = size.width / 2 + camera.x + next.x * STEP;
      const py = size.height / 2 + camera.y + next.y * STEP;
      setCamera({
        x: px < 80 || px > size.width - 80 ? -next.x * STEP : camera.x,
        y: py < 110 || py > size.height - 80 ? -next.y * STEP : camera.y,
      });
      requestAnimationFrame(() => surface.current?.querySelector<HTMLElement>(`[data-cell="${keyOf(next)}"]`)?.focus({ preventScroll: true }));
    } else if ([' ', 'Enter', 'f', 'F'].includes(event.key)) {
      event.preventDefault();
      if (event.repeat) return;
      if (event.key.toLowerCase() === 'f') game.toggleFlag(focus);
      else if (game.cell(focus).revealed) game.chord(focus);
      else game.reveal(focus);
      refresh();
    }
  }

  const offsetX = size.width / 2 + camera.x - STEP / 2;
  const offsetY = size.height / 2 + camera.y - STEP / 2;
  const minX = Math.floor(-offsetX / STEP / RENDER_CHUNK) * RENDER_CHUNK - RENDER_MARGIN;
  const maxX = Math.ceil((size.width - offsetX) / STEP / RENDER_CHUNK) * RENDER_CHUNK + RENDER_MARGIN;
  const minY = Math.floor(-offsetY / STEP / RENDER_CHUNK) * RENDER_CHUNK - RENDER_MARGIN;
  const maxY = Math.ceil((size.height - offsetY) / STEP / RENDER_CHUNK) * RENDER_CHUNK + RENDER_MARGIN;
  // Keep coordinates small on long journeys without repositioning tiles on every pan.
  const anchorX = Math.round(-offsetX / STEP / 256) * 256;
  const anchorY = Math.round(-offsetY / STEP / 256) * 256;
  const tiles = useMemo(() => {
    const result = [];
    const focusKey = keyOf(focus);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const key = keyOf({ x, y });
        // Hidden squares need no neighbor count until they are opened.
        const cell = game.cells.get(key);
        const mine = game.lost && (cell?.mine ?? game.isMine({ x, y }));
        const distance = game.exploded ? Math.min(18, Math.hypot(x - game.exploded.x, y - game.exploded.y)) : 0;
        result.push(<Tile key={`${generation}:${key}`} x={x} y={y}
          left={(x - anchorX) * STEP} top={(y - anchorY) * STEP}
          revealed={cell?.revealed ?? false} flagged={cell?.flagged ?? false}
          adjacent={cell?.adjacent ?? 0} revealedAt={cell?.revealedAt ?? 0} wave={cell?.wave ?? 0}
          mine={mine} mineDelay={distance * 25} lost={game.lost}
          complete={!!cell && game.isComplete(cell)} wrongFlag={game.lost && !!cell?.flagged && !mine}
          holding={holding === key} focused={focusKey === key} />);
      }
    }
    return result;
  }, [game, revision, minX, maxX, minY, maxY, anchorX, anchorY, holding, focus, generation]);

  return <main className={`game ${game.lost ? 'game-lost' : ''}`}>
    <div className="game-area">
    <div ref={surface} className={`board ${dragging ? 'dragging' : ''}`} role="grid" aria-label={t('game.board')} inert={game.lost}
      onPointerDown={start} onPointerMove={move} onPointerUp={end}
      onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}
      onContextMenu={(event) => event.preventDefault()} onKeyDown={onKey}
      onFocus={(event) => {
        const point = tilePoint(event.target);
        if (point) setFocus((current) => current.x === point.x && current.y === point.y ? current : point);
      }}
      onClick={(event) => {
        // Assistive technology synthesizes clicks without pointer events.
        if (event.detail !== 0 || game.lost) return;
        const point = tilePoint(event.target);
        if (!point) return;
        if (game.cell(point).revealed) game.chord(point); else game.toggleFlag(point);
        refresh();
      }}
      onWheel={(event) => {
        cancelGesture();
        setCamera((value) => ({ x: value.x - event.deltaX - (event.shiftKey ? event.deltaY : 0), y: value.y - (event.shiftKey ? 0 : event.deltaY) }));
      }}>
      <div className="board-grid" style={{ transform: `translate3d(${offsetX + anchorX * STEP}px, ${offsetY + anchorY * STEP}px, 0)` }}>
        {tiles}
      </div>
    </div>
    {!game.lost && <div className="score" aria-label={t('game.points', { count: game.revealedCount })}>
      <span className="score-label">{t('game.score')}</span>
      <strong>{game.revealedCount.toLocaleString()}</strong>
    </div>}
    {game.lost ? <div className="end-scene" role="status">
      <div className="result"><strong>{t('game.over')}</strong><p>{t('game.points', { count: game.revealedCount.toLocaleString() })}</p></div>
    </div> : <div className="bottom"><p className="hint">{t('game.hint')}</p></div>}
    </div>
    <footer className="game-footer"><Button onClick={reset}>{t('game.restart')}</Button></footer>
  </main>;
}
