import { useState, useRef, useEffect, useCallback } from 'react';
import { useDashboard } from '../../context/DashboardContext';
import { fmt } from '../../lib/dashboardHelpers';
import { ModalShell } from '../shared/ModalShell';

// Minimal Web Speech API typings (not in lib.dom for all targets)
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((ev: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function JournalModal() {
  const { modal, setModal, addJournal } = useDashboard();
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const stopRecording = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
    setInterim('');
  }, []);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  if (modal?.kind !== 'journal') return null;

  const speechSupported = getSpeechRecognition() !== null;

  const startRecording = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    setMicError(null);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (ev) => {
      let interimText = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          const chunk = r[0].transcript.trim();
          if (chunk) setText(t => (t ? t.replace(/\s+$/, '') + ' ' : '') + chunk);
        } else {
          interimText += r[0].transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = (ev) => {
      setMicError(ev.error === 'not-allowed' ? 'Microphone access denied.' : `Mic error: ${ev.error}`);
      setRecording(false);
      setInterim('');
      recRef.current = null;
    };
    rec.onend = () => {
      // Fires on silence timeouts too — only reflect state if we didn't restart
      if (recRef.current === rec) {
        setRecording(false);
        setInterim('');
        recRef.current = null;
      }
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const prompt = modal.prompt;
  const close = () => { stopRecording(); setModal(null); };
  const save = () => {
    if (text.trim()) {
      stopRecording();
      addJournal(text);
      setText('');
      setModal(null);
    }
  };

  return (
    <ModalShell onClose={close}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--t3)]">New entry</div>
            <h2 className="text-[18px] font-medium tracking-tight text-[var(--t1)]">{fmt.dayLabel(new Date())}</h2>
          </div>
          <button onClick={close} className="text-[var(--t3)] hover:text-[var(--t1)] w-7 h-7 rounded-md grid place-items-center hover:bg-[var(--bg-card)]">×</button>
        </div>
        <div className="text-[12px] text-[var(--t3)] mb-2 font-serif italic">"{prompt}"</div>
        <textarea
          autoFocus value={text} onChange={e => setText(e.target.value)}
          rows={6}
          placeholder={recording ? 'Listening…' : 'Start writing or tap the mic…'}
          className="w-full bg-[var(--bg-card)] border border-[var(--line)] rounded-md px-3 py-2 text-[13px] text-[var(--t1)] placeholder:text-[var(--t4)] focus:border-[var(--t2)] outline-none resize-none leading-relaxed"
        />
        {interim && (
          <div className="text-[11.5px] text-[var(--t3)] italic px-1 mt-1 truncate">{interim}…</div>
        )}
        {micError && <div className="text-[10.5px] text-[var(--red)] px-1 mt-1">{micError}</div>}
        <div className="mt-4 flex items-center justify-between gap-2">
          {speechSupported ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-md border transition-colors ${
                recording
                  ? 'border-[var(--red)] text-[var(--red)]'
                  : 'border-[var(--line)] text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--line-hi)]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${recording ? 'bg-[var(--red)] animate-pulse' : 'bg-[var(--t3)]'}`} />
              {recording ? 'Stop' : 'Dictate'}
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button onClick={close} className="px-3 py-1.5 text-[12px] text-[var(--t2)] hover:text-[var(--t1)] rounded-md">Cancel</button>
            <button onClick={save} className="px-3 py-1.5 text-[12px] font-medium rounded-md bg-[var(--accent)] text-[var(--bg)] hover:opacity-90">Save</button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
