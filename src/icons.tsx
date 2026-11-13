import type { ReactNode } from 'react'

// One hand-drawn set on a 32px grid, 2px round strokes. Class names on parts
// (drop, sway, flick…) are animation hooks used only while a sound is on.

const CLOUD = 'M10.5 19H22a5 5 0 0 0 .9-9.92A7.2 7.2 0 0 0 9.2 10.6 4.3 4.3 0 0 0 10.5 19z'

const ART: Record<string, ReactNode> = {
  rain: (
    <>
      <path d={CLOUD} />
      <path className="drop" d="M11.5 23l-1.4 4" />
      <path className="drop d2" d="M16.5 23l-1.4 4" />
      <path className="drop d3" d="M21.5 23l-1.4 4" />
    </>
  ),
  'rain-roof': (
    <>
      <path d="M4 20.5 16 11l12 9.500" />
      <path d="M7.500 19v8.500h17V19" />
      <path d="M13.500 27.500v-5h5v5" />
      <path className="drop" d="M9 3.500v3" />
      <path className="drop d2" d="M16 2v3" />
      <path className="drop d3" d="M23 3.500v3" />
    </>
  ),
  thunder: (
    <>
      <path d={CLOUD} />
      <path className="zap" d="M17.500 16.500l-4 6h5l-3.500 6" />
    </>
  ),
  stream: (
    <>
      <path className="flow" d="M11 3c-5 6 6 9 1 15s2 8 1 11" />
      <path className="flow d2" d="M20 3c-5 6 6 9 1 15s2 8 1 11" />
      <circle cx="7" cy="23" r="2.200" />
      <circle cx="26" cy="11" r="1.800" />
    </>
  ),
  waves: (
    <>
      <path className="bob" d="M3 17c4.500 0 5-8 12.500-8 5 0 7.500 4 5.500 7-1.400 2.100-4.800 1.600-4.800-.900" />
      <path className="bob d2" d="M3 23c3 0 3.500-2 6.500-2s3.500 2 6.500 2 3.500-2 6.500-2 3.500 2 6.500 2" />
      <path className="bob d3" d="M7 28c2.500 0 3-1.500 5.500-1.500S15.500 28 18 28s3-1.500 5.500-1.500" />
    </>
  ),
  wind: (
    <>
      <path className="gust" d="M4 12h13.500A3.500 3.500 0 1 0 14 8.500" />
      <path className="gust d2" d="M4 17h19.500a3.500 3.500 0 1 1-3.500 3.500" />
      <path className="gust d3" d="M4 22h9" />
    </>
  ),
  leaves: (
    <>
      <path className="sway" d="M16 28c0-8.500 1.500-14.500 5.500-21" />
      <path className="sway d2" d="M15.500 28c0-6-2-11.500-7.500-16" />
      <path className="sway d3" d="M17 28c1-5 4-8.500 9.500-10.500" />
      <path className="sway d2" d="M14.500 28c-1-4-4-6.500-9.500-7.500" />
      <path d="M4 28h24" />
    </>
  ),
  fire: (
    <>
      <path
        className="flick"
        d="M16 3c1 4 5.500 6 5.500 10.500a5.500 5.500 0 0 1-11 0c0-1.800.800-3.200 1.800-4.200.200 1.700 1 2.700 2 2.700C14.300 8.500 15 6.500 16 3z"
      />
      <path d="M6 28.500l20-5.500" />
      <path d="M6 23l20 5.500" />
    </>
  ),
  noise: (
    <>
      <path className="bar" d="M5 14v4" />
      <path className="bar d2" d="M9.400 10v12" />
      <path className="bar d3" d="M13.800 13v6" />
      <path className="bar" d="M18.200 6v20" />
      <path className="bar d2" d="M22.600 11v10" />
      <path className="bar d3" d="M27 14v4" />
    </>
  ),
  birds: (
    <>
      <path d="M17.500 12.500C11 12.500 7 17 6 23.500h9.500c4.800 0 8-3.800 8-8.500" />
      <circle cx="20.500" cy="10.500" r="4" />
      <path d="M24.300 9.300l4.200 1.200-4 2" />
      <circle cx="21.300" cy="9.800" r=".9" fill="currentColor" stroke="none" />
      <path d="M12.500 23.500v4M16 23.500v4" />
      <path className="note" d="M5 6v5.500M5 6l3.500-1v2" />
    </>
  ),
  crickets: (
    <>
      <ellipse cx="14.500" cy="20.500" rx="8.500" ry="3.500" />
      <circle cx="24.500" cy="18.500" r="2.600" />
      <path d="M25.500 16c.800-3.800 2.200-6 4.500-7.500M24 15.900c-.200-3.900.500-6.900 2-9.400" />
      <path className="chirp" d="M14 18.500 8.500 8 5 26" />
      <path d="M17.500 24l1 3.500M21 23.500l2 3.500" />
    </>
  ),
  frogs: (
    <>
      <path d="M4.500 19.500c0-4.700 4.500-8 11.500-8s11.500 3.300 11.500 8-5 8-11.500 8-11.500-3.300-11.500-8z" />
      <circle cx="9.500" cy="9.500" r="3.700" />
      <circle cx="22.500" cy="9.500" r="3.700" />
      <circle cx="9.500" cy="9.500" r="1" fill="currentColor" stroke="none" />
      <circle cx="22.500" cy="9.500" r="1" fill="currentColor" stroke="none" />
      <path d="M10 20.500c1.800 1.800 3.800 2.500 6 2.500s4.200-.700 6-2.500" />
    </>
  ),
  owl: (
    <>
      <path d="M8 5.500l3.300 2.700C12.700 7.400 14.200 7 16 7s3.300.4 4.700 1.200L24 5.500V17a8 8 0 0 1-16 0z" />
      <circle cx="12.600" cy="13.500" r="2.700" />
      <circle cx="19.400" cy="13.500" r="2.700" />
      <path d="M16 16.500l-1.200 2.300h2.400z" fill="currentColor" />
      <path d="M5 28.500h22M13 25v3.500M19 25v3.500" />
    </>
  ),
  cat: (
    <>
      <path d="M7 5l4.200 4.800a9 9 0 0 1 9.600 0L25 5v12a9 9 0 0 1-18 0z" />
      <path d="M10.800 15.500c.800 1.100 2.400 1.100 3.200 0M18 15.500c.800 1.100 2.400 1.100 3.200 0" />
      <path d="M15 19h2l-1 1.300z" fill="currentColor" />
      <path d="M3 17.500l3.500 1M3 22l3.500-1M29 17.500l-3.500 1M29 22l-3.500-1" />
    </>
  ),
  bowl: (
    <>
      <path d="M6 13c0 7 4 11 10 11s10-4 10-11" />
      <ellipse cx="16" cy="13" rx="10" ry="2.600" />
      <path d="M8 18.500c2.400 1.100 5.100 1.600 8 1.600s5.600-.500 8-1.600" />
      <path d="M10.500 27.500h11" />
      <path d="M28 2.500l-3 5" />
      <path d="M24.600 8.200l-1.100 1.800" strokeWidth="4.600" />
      <path className="ring" d="M2.700 14c-.900 2.600-.400 5.200 1.300 7.300" />
      <path className="ring d2" d="M29.300 14c.900 2.600.400 5.200-1.300 7.300" />
    </>
  ),
  'chimes-metal': (
    <>
      <path d="M16 2v3M6 5.500h20" />
      <g className="swing">
        <path d="M9 5.500v3" />
        <rect x="7.500" y="8.500" width="3" height="13" rx="1.500" />
      </g>
      <g className="swing d2">
        <path d="M13.700 5.500v3" />
        <rect x="12.200" y="8.500" width="3" height="18" rx="1.500" />
      </g>
      <g className="swing d3">
        <path d="M18.300 5.500v3" />
        <rect x="16.800" y="8.500" width="3" height="11" rx="1.500" />
      </g>
      <g className="swing">
        <path d="M23 5.500v3" />
        <rect x="21.500" y="8.500" width="3" height="16" rx="1.500" />
      </g>
    </>
  ),
  'chimes-wood': (
    <>
      <path d="M16 2v2.500M7 9a9 4.500 0 0 1 18 0z" />
      <g className="swing">
        <path d="M8.300 12h4v11l-4 3z" />
        <path d="M8.300 17h4" />
      </g>
      <g className="swing d2">
        <path d="M14 12h4v15l-4 2.500z" />
        <path d="M14 18.500h4" />
      </g>
      <g className="swing d3">
        <path d="M19.700 12h4v9l-4 3z" />
        <path d="M19.700 16h4" />
      </g>
    </>
  ),
  flute: (
    <>
      <g transform="rotate(-38 16 16)">
        <rect x="1.500" y="13.200" width="29" height="5.600" rx="2.800" />
        <path d="M7 13.200v5.600" />
        <circle cx="12.500" cy="16" r=".9" fill="currentColor" stroke="none" />
        <circle cx="16.500" cy="16" r=".9" fill="currentColor" stroke="none" />
        <circle cx="20.500" cy="16" r=".9" fill="currentColor" stroke="none" />
        <circle cx="24.500" cy="16" r=".9" fill="currentColor" stroke="none" />
      </g>
      <path className="note" d="M24.500 21.500v5.500M24.500 21.500l3.500-1v2" />
    </>
  ),
  lullaby: (
    <>
      <rect x="3.500" y="6.500" width="25" height="19" rx="3" />
      <path d="M9.750 17.500v8M16 17.500v8M22.250 17.500v8" />
      <rect className="key" x="8" y="6.500" width="3.500" height="10.500" rx="1" fill="currentColor" stroke="none" />
      <rect className="key d2" x="14.250" y="6.500" width="3.500" height="10.500" rx="1" fill="currentColor" stroke="none" />
      <rect className="key d3" x="20.500" y="6.500" width="3.500" height="10.500" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  piano: (
    <>
      <path d="M5 27V8.500A3.500 3.500 0 0 1 8.500 5h2.500c6 0 5 8 10.500 8h2A3.500 3.500 0 0 1 27 16.500V27z" />
      <path d="M5 21h22" />
      <path className="key" d="M10.500 21v6" />
      <path className="key d2" d="M16 21v6" />
      <path className="key d3" d="M21.500 21v6" />
    </>
  ),
  sitar: (
    <g transform="rotate(38 16 16)">
      <path d="M16 15.500c4.500 0 7 3.300 7 7.200S20 30 16 30s-7-3.400-7-7.300 2.500-7.200 7-7.200z" />
      <path d="M14.300 15.700V2h3.400v13.700" />
      <circle cx="11" cy="6.500" r="2.800" />
      <path d="M17.700 3.500h3M17.700 7h3" />
      <path d="M14.300 10.500h3.400M14.300 13h3.400" />
      <path d="M13 24.500h6" />
    </g>
  ),
  tanpura: (
    <>
      <circle cx="16" cy="22" r="7.500" />
      <path d="M14.200 14.700V2.500h3.600v12.200" />
      <path d="M11.200 4h3M11.200 7.500h3M17.800 4h3M17.800 7.500h3" />
      <path d="M12.500 24h7" />
      <path className="ring" d="M4.500 18.500c-1.300 2.200-1.300 4.800 0 7" />
      <path className="ring d2" d="M27.500 18.500c1.300 2.200 1.300 4.800 0 7" />
    </>
  ),
  sarod: (
    <g transform="rotate(-38 16 16)">
      <circle cx="16" cy="23" r="6.500" />
      <circle cx="16" cy="23" r="2.800" />
      <path d="M13 17.200 14.500 3h3L19 17.200" />
      <circle cx="12" cy="4" r="1.300" />
      <circle cx="12" cy="8" r="1.300" />
      <circle cx="20" cy="4" r="1.300" />
      <circle cx="20" cy="8" r="1.300" />
    </g>
  ),

  // interface glyphs
  play: <path d="M11 6.500v19a1 1 0 0 0 1.500.900l15.500-9.500a1 1 0 0 0 0-1.700L12.500 5.600a1 1 0 0 0-1.500.900z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="8" y="6" width="5.500" height="20" rx="2" fill="currentColor" stroke="none" />
      <rect x="18.500" y="6" width="5.500" height="20" rx="2" fill="currentColor" stroke="none" />
    </>
  ),
  timer: (
    <>
      <circle cx="16" cy="17.500" r="10" />
      <path d="M16 12v5.500l3.500 2.500M13 3.500h6" />
    </>
  ),
  mix: (
    <>
      <path d="M8 4v9M8 19v9M16 4v3M16 13v15M24 4v13M24 23v5" />
      <circle cx="8" cy="16" r="3" />
      <circle cx="16" cy="10" r="3" />
      <circle cx="24" cy="20" r="3" />
    </>
  ),
  plus: <path d="M16 7v18M7 16h18" />,
  info: (
    <>
      <circle cx="16" cy="16" r="12" />
      <path d="M16 15v7" />
      <circle cx="16" cy="10.500" r="1.300" fill="currentColor" stroke="none" />
    </>
  ),
  qr: (
    <>
      <rect x="5" y="5" width="9" height="9" rx="2" />
      <rect x="18" y="5" width="9" height="9" rx="2" />
      <rect x="5" y="18" width="9" height="9" rx="2" />
      <path d="M18 18h3v3M27 18v3M18 26v1h3M26 26h1" />
    </>
  ),
  close: <path d="M9 9l14 14M23 9 9 23" />,
  check: <path d="M7 17l6 6L25 10" />,
}

export function Icon({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ART[name]}
    </svg>
  )
}
