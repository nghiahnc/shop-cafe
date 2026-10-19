'use client';
import { useEffect, useId, useRef, type ReactNode, type KeyboardEvent } from 'react';
import Icon from './Icon';

export default function Dialog({ open, close, title, children, side = 'left' }: { open: boolean; close: () => void; title: string; children: ReactNode; side?: 'left' | 'right' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current!;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previousFocus?.focus(); };
  }, [open]);
  function trap(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog ref={ref} className={`bt-dialog bt-dialog-${side}`} aria-labelledby={titleId} onKeyDown={trap} onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
    <div className="bt-panel"><div className="bt-panel-top"><h2 id={titleId}>{title}</h2><button type="button" className="bt-icon-button" onClick={close} aria-label="Đóng" autoFocus><Icon name="close"/></button></div>{children}</div>
  </dialog>;
}
