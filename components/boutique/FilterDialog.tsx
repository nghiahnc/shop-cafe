'use client';
import { useCallback, useState, type ReactNode } from 'react';
import Dialog from './Dialog';
import Icon from './Icon';
export default function FilterDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <div className="bt-filter-bar"><span>Tìm thiết kế dành cho bạn</span><button type="button" className="bt-filter-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}><Icon name="filter"/> Bộ lọc</button><Dialog open={open} close={close} title="Bộ lọc sản phẩm" side="right">{children}</Dialog></div>;
}
