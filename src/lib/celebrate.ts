// A small confetti burst for finishing a task.
//
// Deliberately imperative DOM rather than a React component: this is
// fire-and-forget, lives for 900ms, and needs no state anyone can read back.
// Keeping it out of the tree means no provider, no portal, and no re-render of
// the board at the moment you tick something off.

const COLORS = ['#6ee7b7', '#f5c451', '#a8c5ff', '#c4b5fd', '#f4a8b7', '#fdba74'];
const COUNT = 14;

// Where the burst starts. Tracked globally so callers deep in the data layer
// can celebrate without threading a click event down to them; a keyboard-driven
// completion falls back to the middle of the viewport.
let lastX: number | null = null;
let lastY: number | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    e => { lastX = e.clientX; lastY = e.clientY; },
    { capture: true, passive: true },
  );
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function makeLayer(): HTMLDivElement {
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;z-index:9999;pointer-events:none;';
  return layer;
}

/** Expanding ring at the origin — the "pop" the confetti flies out of. */
function ring(x: number, y: number, layer: HTMLElement, reduced: boolean) {
  const r = document.createElement('div');
  const size = 14;
  r.style.cssText =
    `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;` +
    'border-radius:9999px;border:1.5px solid var(--green,#6ee7b7);';
  layer.appendChild(r);
  return r.animate(
    [
      { transform: 'scale(0.4)', opacity: 0.9 },
      { transform: `scale(${reduced ? 2 : 3.2})`, opacity: 0 },
    ],
    { duration: reduced ? 420 : 520, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
  ).finished;
}

function confetto(x: number, y: number, layer: HTMLElement) {
  const el = document.createElement('div');
  const w = rand(4, 7);
  const h = rand(3, 6);
  el.style.cssText =
    `position:fixed;left:${x}px;top:${y}px;width:${w}px;height:${h}px;` +
    `background:${COLORS[Math.floor(Math.random() * COLORS.length)]};` +
    `border-radius:${Math.random() < 0.4 ? '9999px' : '1px'};will-change:transform,opacity;`;
  layer.appendChild(el);

  // Fan out across the upward hemisphere, then let gravity win.
  const angle = rand(-Math.PI * 0.88, -Math.PI * 0.12);
  const dist = rand(38, 104);
  const dx = Math.cos(angle) * dist;
  const peak = Math.sin(angle) * dist;
  const spin = rand(-320, 320);

  return el.animate(
    [
      { transform: 'translate(0,0) rotate(0deg) scale(.5)', opacity: 1, offset: 0 },
      { transform: `translate(${dx * 0.75}px, ${peak}px) rotate(${spin * 0.6}deg) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx}px, ${peak + rand(46, 92)}px) rotate(${spin}deg) scale(.85)`, opacity: 0, offset: 1 },
    ],
    { duration: rand(620, 900), easing: 'cubic-bezier(.15,.75,.4,1)', fill: 'forwards' },
  ).finished;
}

/**
 * Burst at `x`/`y`, defaulting to wherever the user last clicked. Honours
 * prefers-reduced-motion by showing just the ring — the same acknowledgement,
 * without anything flying across the screen.
 */
export function celebrate(x = lastX, y = lastY) {
  if (typeof document === 'undefined' || !document.body) return;

  const ox = x ?? window.innerWidth / 2;
  const oy = y ?? window.innerHeight / 2;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const layer = makeLayer();
  document.body.appendChild(layer);

  const done: Promise<unknown>[] = [ring(ox, oy, layer, reduced)];
  if (!reduced) {
    for (let i = 0; i < COUNT; i++) done.push(confetto(ox, oy, layer));
  }

  // One removal for the whole burst, and never leave a layer behind if an
  // animation is cancelled (a background tab, a navigation mid-flight).
  Promise.allSettled(done).then(() => layer.remove());
}
