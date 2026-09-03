import { useLayoutEffect, useRef, useState } from 'react';
import { useMantra } from '../hooks/useMantra';

const SERIF = "'Instrument Serif', serif";

/**
 * Type scale by length: a four-word mantra gets to be a headline, a paragraph
 * from Seneca steps down until it still fits the column beside the greeting.
 * A hard line break counts for ~28 characters so a short-but-stacked quote
 * doesn't stay huge. The px value is the desktop ceiling — the `clamp` below
 * scales it down with the viewport.
 */
function sizeFor(text: string): { fontSize: string; lineHeight: number } {
  const weight = text.length + (text.match(/\n/g)?.length ?? 0) * 28;
  const px =
    weight <= 34  ? 44 :
    weight <= 70  ? 37 :
    weight <= 120 ? 31 :
    weight <= 190 ? 26 :
    weight <= 300 ? 22 : 19;
  return {
    fontSize: `clamp(${Math.round(px * 0.66)}px, 3vw, ${px}px)`,
    lineHeight: px >= 37 ? 1.14 : px >= 26 ? 1.22 : 1.35,
  };
}

/** Grow a textarea to fit its content so editing looks like editing in place. */
function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return ref;
}

/**
 * The line of words at the top of the dashboard. Reads as a quote, clicks into
 * an editor that keeps the same typeface and position, so saving doesn't move
 * anything on screen.
 */
export function Mantra() {
  const { mantra, save } = useMantra();
  const [editing, setEditing] = useState(false);
  // Draft state, live only while the editor is open — the read view renders
  // `mantra` itself, so a late hydration from Supabase can't clobber typing.
  const [text, setText] = useState(mantra.text);
  const [author, setAuthor] = useState(mantra.author);
  const textRef = useAutoGrow(text);

  const open = () => {
    setText(mantra.text);
    setAuthor(mantra.author);
    setEditing(true);
  };

  const commit = () => {
    save({ text, author });
    setEditing(false);
  };

  const cancel = () => {
    setText(mantra.text);
    setAuthor(mantra.author);
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    // ⌘↵ / Ctrl+↵ saves; a bare Enter stays a line break inside the quote.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
  };

  if (editing) {
    return (
      <div className="w-full md:w-[620px] md:max-w-full">
        <div className="relative pl-4 border-l border-[var(--line-hi)]">
          <textarea
            ref={textRef}
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Write a quote, a mantra, a reminder…"
            className="w-full bg-transparent outline-none resize-none overflow-hidden italic text-[var(--t1)] placeholder:text-[var(--t4)]"
            style={{ fontFamily: SERIF, ...sizeFor(text || 'Write a quote, a mantra, a reminder…') }}
          />
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Attribution (optional)"
            className="w-full mt-1 bg-transparent outline-none text-[10.5px] uppercase tracking-[0.16em] text-[var(--t2)] placeholder:text-[var(--t4)]"
          />
        </div>
        <div className="mt-3 pl-4 flex items-center gap-2">
          <button
            onClick={commit}
            className="px-3 py-1.5 rounded-md text-[11.5px] font-medium bg-[var(--accent)] text-[var(--bg)] hover:opacity-90 transition-opacity"
          >
            Save
          </button>
          <button
            onClick={cancel}
            className="px-3 py-1.5 rounded-md text-[11.5px] text-[var(--t2)] border border-[var(--line)] hover:text-[var(--t1)] hover:border-[var(--line-hi)] transition-colors"
          >
            Cancel
          </button>
          <span className="hidden md:inline text-[10.5px] text-[var(--t4)] ml-1">⌘↵ to save · Esc to cancel</span>
        </div>
      </div>
    );
  }

  const empty = !mantra.text;

  return (
    <button
      onClick={open}
      title="Click to edit"
      className="group block w-full md:w-auto md:max-w-[620px] text-left -mx-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-card)]/60 transition-colors"
    >
      <div className="relative pl-4 border-l border-[var(--line)] group-hover:border-[var(--line-hi)] transition-colors">
        <p
          className={`italic whitespace-pre-wrap ${
            empty ? 'text-[var(--t4)] group-hover:text-[var(--t3)]' : 'text-[var(--t1)]'
          } transition-colors`}
          style={{ fontFamily: SERIF, ...sizeFor(mantra.text || 'Add a quote…') }}
        >
          {empty ? 'Add a quote…' : mantra.text}
        </p>
        {mantra.author && (
          <div className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-[var(--t3)]">
            — {mantra.author}
          </div>
        )}
        <span className="absolute -top-0.5 right-0 text-[10px] uppercase tracking-[0.14em] text-[var(--t4)] opacity-0 group-hover:opacity-100 transition-opacity">
          Edit
        </span>
      </div>
    </button>
  );
}
