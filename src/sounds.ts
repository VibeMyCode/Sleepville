export type Sound = { id: string; color: string; kind: 'loop' | 'track' }
export type Levels = Record<string, number>
export type Mix = { id: string; name: string; levels: Levels }

// names live in i18n.ts, keyed by id
const s = (id: string, color: string, kind: Sound['kind'] = 'loop'): Sound => ({ id, color, kind })

export const GROUPS: Sound[][] = [
  [
    s('rain', '#5CC8FF'),
    s('rain-roof', '#8FA6FF'),
    s('thunder', '#B79CFF'),
    s('stream', '#4FE3D0'),
    s('waves', '#45B3FF'),
  ],
  [
    s('wind', '#A5EDE4'),
    s('leaves', '#7BE495'),
    s('fire', '#FFA63D'),
    s('noise', '#A8B4FF'),
  ],
  [
    s('birds', '#FFD84D'),
    s('crickets', '#C8F25A'),
    s('frogs', '#5FE07A'),
    s('owl', '#F0BE8C'),
    s('cat', '#FF9FB2'),
  ],
  [
    s('bowl', '#FFC857'),
    s('chimes-metal', '#9FD8FF'),
    s('chimes-wood', '#E6C07B'),
  ],
  [
    s('flute', '#8FF0C2', 'track'),
    s('lullaby', '#FFE9A8'),
    s('piano', '#D9CCFF', 'track'),
    s('sitar', '#FF8A5C', 'track'),
    s('tanpura', '#FF6FA8'),
    s('sarod', '#C792FF', 'track'),
  ],
]

export const SOUNDS: Record<string, Sound> = Object.fromEntries(GROUPS.flat().map((x) => [x.id, x]))

// preset names come from i18n.ts
export const PRESETS: Mix[] = [
  { id: 'p-rain', name: '', levels: { rain: 0.7, 'rain-roof': 0.4, thunder: 0.35 } },
  { id: 'p-meadow', name: '', levels: { crickets: 0.6, leaves: 0.45, frogs: 0.25 } },
  { id: 'p-fire', name: '', levels: { fire: 0.7, crickets: 0.35, owl: 0.3 } },
  { id: 'p-himalaya', name: '', levels: { bowl: 0.6, wind: 0.4, 'chimes-metal': 0.25 } },
  { id: 'p-raga', name: '', levels: { tanpura: 0.6, sitar: 0.45 } },
  { id: 'p-piano', name: '', levels: { lullaby: 0.55, rain: 0.45 } },
]

export const TIMER_MINUTES = [1, 5, 10, 15, 20, 30, 60]

export const sameLevels = (a: Levels, b: Levels) => {
  const ka = Object.keys(a)
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}
