import type { CalendarEvent } from '../types';

export interface KindColor {
  /** solid accent — dots, bullets, the countdown numerals */
  dot: string;
  /** left edge of an event block */
  bar: string;
  /** block fill when the block has its slot to itself */
  bg: string;
  /** heavier fill for a block sharing its slot, so neighbours stay separable */
  bgSolid: string;
}

// Fallback palette, used for locally-derived events (seed data, the workout
// routine) and for any Google calendar that reports no colour.
const KIND_COLORS: Record<string, KindColor> = {
  class:          { dot: '#93c5fd', bar: 'rgba(147,197,253,0.7)',  bg: 'rgba(147,197,253,0.08)', bgSolid: 'rgba(147,197,253,0.17)' },
  career:         { dot: '#c4b5fd', bar: 'rgba(196,181,253,0.7)',  bg: 'rgba(196,181,253,0.08)', bgSolid: 'rgba(196,181,253,0.17)' },
  personal:       { dot: '#f5c451', bar: 'rgba(245,196,81,0.7)',   bg: 'rgba(245,196,81,0.08)',  bgSolid: 'rgba(245,196,81,0.17)'  },
  work:           { dot: '#6ee7b7', bar: 'rgba(110,231,183,0.7)',  bg: 'rgba(110,231,183,0.08)', bgSolid: 'rgba(110,231,183,0.17)' },
  workout:        { dot: '#f4a8b7', bar: 'rgba(244,168,183,0.75)', bg: 'rgba(244,168,183,0.10)', bgSolid: 'rgba(244,168,183,0.19)' },
  'workout-run':  { dot: '#fdba74', bar: 'rgba(253,186,116,0.75)', bg: 'rgba(253,186,116,0.10)', bgSolid: 'rgba(253,186,116,0.19)' },
};

export const colorForKind = (kind: string): KindColor => KIND_COLORS[kind] ?? KIND_COLORS.work;

type RGB = [number, number, number];

function parseHex(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// Google's calendar colours are picked for a white UI — "Tomato" (#d50000) is
// near-black against this app's dark ground. Mix toward white until the colour
// clears a legibility floor, which keeps the hue (a red calendar still reads
// red) while lifting it to roughly the weight of the fallback palette above.
//
// A *floor*, not a target: normalising every colour to one luminance would
// render two shades of a hue identically — Google's Blueberry and Lavender both
// flattened to the same blue — so anything already bright enough is left alone.
const MIN_LUMA = 0.45;

function lift([r, g, b]: RGB): RGB {
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (luma >= MIN_LUMA) return [r, g, b];
  const t = (MIN_LUMA - luma) / (1 - luma);
  return [r, g, b].map((v) => Math.round(v + (255 - v) * t)) as RGB;
}

// Every event block re-derives its colour on each render, so memoise per hex.
const cache = new Map<string, KindColor>();

function fromHex(hex: string): KindColor | null {
  const hit = cache.get(hex);
  if (hit) return hit;

  const rgb = parseHex(hex);
  if (!rgb) return null;

  const [r, g, b] = lift(rgb);
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
  const out: KindColor = {
    dot: `rgb(${r},${g},${b})`,
    bar: rgba(0.75),
    bg: rgba(0.1),
    bgSolid: rgba(0.19),
  };
  cache.set(hex, out);
  return out;
}

/**
 * An event's colour: its Google calendar's colour where there is one, so two
 * calendars never render alike, falling back to the event-kind palette for
 * locally-derived events.
 */
export function colorForEvent(e: CalendarEvent): KindColor {
  return (e.calendarColor ? fromHex(e.calendarColor) : null) ?? colorForKind(e.kind);
}

/**
 * A calendar's swatch colour for the picker. Google events all carry kind
 * 'personal', so a colourless calendar falls back to the same hue its blocks
 * get and the tick-list keeps matching the grid.
 */
export function colorForCalendar(hex: string): string {
  return ((hex ? fromHex(hex) : null) ?? colorForKind('personal')).dot;
}
