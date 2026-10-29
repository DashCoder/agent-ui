import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const PlayIcon = (p: P) => <svg {...base} {...p}><path d="M7 5l11 7-11 7z" fill="currentColor" stroke="none" /></svg>;
export const PauseIcon = (p: P) => <svg {...base} {...p}><path d="M8 5v14M16 5v14" /></svg>;
export const ExpandIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
);
export const ChevronUpIcon = (p: P) => <svg {...base} {...p}><path d="M6 15l6-6 6 6" /></svg>;
export const ChevronDownIcon = (p: P) => <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>;
export const ChevronRightIcon = (p: P) => <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>;
export const SaveIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></svg>
);
export const CloseIcon = (p: P) => <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const PaperclipIcon = (p: P) => (
  <svg {...base} {...p}><path d="M21 11.5l-8.5 8.5a5 5 0 01-7-7L14 4.5a3.5 3.5 0 015 5L10.5 18a2 2 0 01-3-3l8-8" /></svg>
);
export const GearIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" />
  </svg>
);
export const BrandMark = (p: P) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.2}
       strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M9 9.5a4 4 0 11-3.6 5.8M23 9.5a4 4 0 113.6 5.8" />
    <path d="M7 15c0 6 4 10 9 10s9-4 9-10a9 9 0 00-18 0z" />
    <circle cx="12.5" cy="15.5" r="1" fill="currentColor" /><circle cx="19.5" cy="15.5" r="1" fill="currentColor" />
    <path d="M14.5 19.5c1 .8 2 .8 3 0" />
  </svg>
);
