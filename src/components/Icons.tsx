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
export const TrashIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const GripIcon = (p: P) => <svg {...base} {...p}><path d="M8 10h8M8 14h8" /></svg>;
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

/* Slack-style chat: composer toolbar and message actions */
export const BoldIcon = (p: P) => <svg {...base} {...p}><path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" /></svg>;
export const ItalicIcon = (p: P) => <svg {...base} {...p}><path d="M14 5h-4M14 19h-4M14 5l-4 14" /></svg>;
export const StrikeIcon = (p: P) => <svg {...base} {...p}><path d="M4 12h16M16 7.5C15.4 6 13.9 5 12 5c-2.5 0-4 1.3-4 3 0 3.6 8 2.5 8 7 0 1.8-1.7 4-4.5 4-2 0-3.7-1-4.3-2.6" /></svg>;
export const LinkIcon = (p: P) => <svg {...base} {...p}><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></svg>;
export const OlIcon = (p: P) => <svg {...base} {...p}><path d="M10 6h10M10 12h10M10 18h10M4 5h1v4M4 9h2M4 14h2l-2 3h2" /></svg>;
export const UlIcon = (p: P) => <svg {...base} {...p}><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></svg>;
export const QuoteIcon = (p: P) => <svg {...base} {...p}><path d="M5 5v14M10 7h9M10 12h9M10 17h6" /></svg>;
export const CodeIcon = (p: P) => <svg {...base} {...p}><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" /></svg>;
export const CodeBlockIcon = (p: P) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 9l-3 3 3 3M14 9l3 3-3 3" /></svg>;
export const PlusIcon = (p: P) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const EmojiIcon = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 007 0" /><circle cx="9" cy="10" r=".6" fill="currentColor" /><circle cx="15" cy="10" r=".6" fill="currentColor" /></svg>;
export const AtIcon = (p: P) => <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M16 8v5a2.5 2.5 0 005 0v-1a9 9 0 10-3.5 7.1" /></svg>;
export const MicIcon = (p: P) => <svg {...base} {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" /></svg>;
export const SlashIcon = (p: P) => <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M14.5 7l-5 10" /></svg>;
export const SendIcon = (p: P) => <svg {...base} {...p}><path d="M4 12l16-8-6 16-2.5-6.5z" fill="currentColor" stroke="none" /></svg>;
export const CopyIcon = (p: P) => <svg {...base} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></svg>;
export const BookmarkIcon = (p: P) => <svg {...base} {...p}><path d="M6 4h12v17l-6-4-6 4z" /></svg>;
export const SidebarIcon = (p: P) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>;
export const TypeIcon = (p: P) => <svg {...base} {...p}><path d="M4 18l5-12 5 12M5.8 14h6.4M15 18v-5.5a2.5 2.5 0 015 0V18M15 15h5" /></svg>;
