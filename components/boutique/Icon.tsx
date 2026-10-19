import type { CSSProperties } from 'react';
export default function Icon({ name, style }: { name: 'menu' | 'search' | 'bag' | 'user' | 'close' | 'arrow' | 'filter'; style?: CSSProperties }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
    {name === 'menu' && <path d="M4 6h16M4 12h16M4 18h16"/>}
    {name === 'search' && <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>}
    {name === 'bag' && <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>}
    {name === 'user' && <><circle cx="12" cy="7" r="4"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></>}
    {name === 'close' && <path d="m5 5 14 14M19 5 5 19"/>}
    {name === 'arrow' && <path d="M4 12h16m-6-6 6 6-6 6"/>}
    {name === 'filter' && <><path d="M3 6h18M3 18h18M3 12h18"/><path d="M8 3v6m8 0v6m-8 0v6"/></>}
  </svg>;
}
