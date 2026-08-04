import { createContext, useContext } from 'react';

export interface WidgetSize {
  /** grid columns the widget currently spans (1..3) */
  cols: number;
  /** total columns available at this breakpoint */
  maxCols: number;
  /** true once the user has dragged a height — the card then fills + scrolls */
  fixedHeight: boolean;
  /** measured pixel box of the widget, updated on resize */
  width: number;
  height: number;
}

export const WidgetSizeContext = createContext<WidgetSize | null>(null);

/** Returns null when a component is rendered outside a resizable Widget. */
export function useWidgetSize(): WidgetSize | null {
  return useContext(WidgetSizeContext);
}
