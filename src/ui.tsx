import { memo, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, motion, useDragControls } from 'motion/react'
import { version } from '../package.json'
import credits from './credits.json'
import qrBoosty from './qr-boosty.png'
import qrErc20 from './qr-erc20.png'
import { Icon } from './icons'
import { LANG_NAMES, useT, type Lang } from './i18n'
import { SOUNDS, TIMER_MINUTES, sameLevels, type Levels, type Mix, type Sound } from './sounds'

const pop = { type: 'spring', bounce: 0.45, visualDuration: 0.35 } as const
const soft = { type: 'spring', bounce: 0.15, visualDuration: 0.4 } as const
const tint = (c: string) => ({ '--c': c }) as CSSProperties

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/* ---------- sky ---------- */

const AURORA = ['#5B3FD1', '#C2418A', '#2A6FDB']
const GLOW_AT = ['-12% -6%', '116% 42%', '14% 112%']

// two palettes that fade in and out against each other while they turn
const DRIFT = [
  ['#3fb6d1', '#7a4be0', '#e0559b'],
  ['#3b6fe0', '#d14fb0', '#35c2a1'],
]
const DRIFT_AT = [
  [0.3, 0.3],
  [0.72, 0.44],
  [0.42, 0.76],
]
const DRIFT_PX = 256 // soft blobs survive any upscaling, so a tiny texture covers the whole sky
function paintDrift(canvas: HTMLCanvasElement | null, colors: string[]) {
  const g = canvas?.getContext('2d')
  if (!g) return
  g.clearRect(0, 0, DRIFT_PX, DRIFT_PX)
  colors.forEach((c, i) => {
    const [x, y] = DRIFT_AT[i].map((v) => v * DRIFT_PX)
    const blob = g.createRadialGradient(x, y, 0, x, y, DRIFT_PX * 0.36)
    blob.addColorStop(0, c + '70')
    blob.addColorStop(1, c + '00')
    g.fillStyle = blob
    g.fillRect(0, 0, DRIFT_PX, DRIFT_PX)
  })
}

/**
 * The whole sky is one painted layer. A new mix paints a second layer that fades in over the
 * old one, so a colour change costs an opacity animation instead of repainting the screen
 * every frame (which made the tiles flicker on phones).
 */
export const Sky = memo(function Sky({ colors }: { colors: string }) {
  const list = colors ? colors.split(',') : []
  const strength = list.length ? 30 : 26 // stronger and yellow or orange glows turn the dusk grey-brown
  const glows = GLOW_AT.map((at, i) => `radial-gradient(95vmax circle at ${at}, color-mix(in srgb, ${list.length ? list[i % list.length] : AURORA[i]} ${strength}%, transparent), transparent 70%)`)
  const background = `${glows.join(', ')}, linear-gradient(180deg, #0d0a26 0%, #181142 34%, #33206a 66%, #6b2a7a 92%, #a13f7c 100%)`

  // The field of small stars is three layers of box-shadow dots, each breathing at its own pace.
  const stars = useMemo(() => {
    let seed = 7 // fixed: the same sky every launch
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const groups: string[][] = [[], [], []]
    for (let i = 0; i < 75; i++) groups[i % 3].push(`${(rnd() * 100).toFixed(1)}vw ${(rnd() * 64).toFixed(1)}vh 0 ${(rnd() * 1.1).toFixed(2)}px #fff`)
    return groups.map((g) => g.join(','))
  }, [])
  const sparks = useMemo(() => {
    let seed = 23
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    return Array.from({ length: 14 }, () => {
      const period = 9 + rnd() * 12
      return { left: `${(4 + rnd() * 92).toFixed(1)}%`, top: `${(3 + rnd() * 66).toFixed(1)}%`, animationDuration: `${period.toFixed(1)}s`, animationDelay: `${(-rnd() * period).toFixed(1)}s` }
    })
  }, [])

  return (
    <div className="sky" aria-hidden>
      <AnimatePresence initial={false}>
        {/* the old layer stays fully opaque underneath until the new one has covered it */}
        <motion.div key={colors} className="sky-paint" style={{ background }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { delay: 1.3, duration: 0.01 } }} transition={{ duration: 1.2, ease: 'easeInOut' }} />
      </AnimatePresence>
      {DRIFT.map((colors, i) => (
        <canvas key={i} className={`drift d${i}`} width={DRIFT_PX} height={DRIFT_PX} ref={(el) => paintDrift(el, colors)} />
      ))}
      {stars.map((boxShadow, i) => (
        <i key={i} className={`stars s${i}`} style={{ boxShadow }} />
      ))}
      {sparks.map((style, i) => (
        <i key={i} className="spark" style={style} />
      ))}
    </div>
  )
})

/* ---------- sound tile ---------- */

type TileProps = { sound: Sound; level?: number; onToggle: (id: string) => void; onLevel: (id: string, v: number) => void }

// memoised: dragging one slider must not re-render the other twenty tiles
export const Tile = memo(function Tile({ sound, level, onToggle, onLevel }: TileProps) {
  const t = useT()
  const on = level !== undefined
  return (
    <div className="tile" data-on={on || undefined} style={tint(sound.color)}>
      <motion.button className="orb" aria-pressed={on} aria-label={t.sounds[sound.id]} onClick={() => onToggle(sound.id)} whileTap={{ scale: 0.88 }} transition={pop}>
        <motion.span className="orb-glow" initial={false} animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.5 }} transition={pop} />
        <svg className="orb-ring" viewBox="0 0 88 88">
          <motion.circle cx="44" cy="44" r="42" initial={false} animate={{ pathLength: on ? level : 0, opacity: on ? 1 : 0 }} transition={{ type: 'spring', bounce: 0, visualDuration: 0.25 }} />
        </svg>
        <motion.span className="orb-icon" initial={false} animate={{ scale: on ? [1, 1.22, 1] : 1, rotate: on ? [0, -8, 0] : 0 }} transition={{ duration: 0.45 }}>
          <Icon name={sound.id} size={36} />
        </motion.span>
      </motion.button>
      <span className="tile-name">{t.sounds[sound.id]}</span>
      <Volume sound={sound} value={level ?? 0.6} disabled={!on} onChange={onLevel} />
    </div>
  )
})

function Volume({ sound, value, disabled, onChange }: { sound: Sound; value: number; disabled?: boolean; onChange: (id: string, v: number) => void }) {
  const t = useT()
  return (
    <input
      className="vol"
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={value}
      disabled={disabled}
      aria-label={`${t.volume}: ${t.sounds[sound.id]}`}
      style={{ ...tint(sound.color), '--v': value } as CSSProperties}
      onChange={(e) => onChange(sound.id, Number(e.target.value))}
    />
  )
}

/* ---------- saved mixes ---------- */

export function MixStrip(p: {
  mixes: Mix[]
  presets: Mix[]
  canRestore: boolean
  levels: Levels
  editing: boolean
  canSave: boolean
  onEdit: () => void
  onApply: (m: Mix) => void
  onDelete: (id: string) => void
  onRestore: () => void
  onSave: () => void
}) {
  const t = useT()
  const cards = [...p.mixes, ...p.presets]
  return (
    <section className="mixes">
      <div className="row-head">
        <h2>{t.mixes}</h2>
        {(cards.length > 0 || p.canRestore) && (
          <button className="link" onClick={p.onEdit}>
            {p.editing ? t.done : t.edit}
          </button>
        )}
      </div>
      <div className="mix-row">
        <AnimatePresence initial={false} mode="popLayout">
          {p.canSave && !p.editing && (
            <motion.button key="save" layout className="mix-card mix-dashed" onClick={p.onSave} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={pop}>
              <Icon name="plus" size={22} />
              <span>{t.saveMix}</span>
            </motion.button>
          )}
          {cards.map((m) => {
            const name = m.name || t.presets[m.id]
            return (
              <motion.div key={m.id} layout className="mix-wrap" data-wiggle={p.editing || undefined} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={pop}>
                <motion.button
                  className="mix-card"
                  data-active={sameLevels(m.levels, p.levels) || undefined}
                  disabled={p.editing}
                  onClick={() => p.onApply(m)}
                  // long press, the gesture people try first, also opens edit mode
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (!p.editing) p.onEdit()
                  }}
                  whileTap={{ scale: 0.94 }}
                >
                  <span className="mix-name">{name}</span>
                  <span className="mix-icons">
                    {Object.keys(m.levels).map((id) => (
                      <span key={id} style={{ color: SOUNDS[id].color }}>
                        <Icon name={id} size={18} />
                      </span>
                    ))}
                  </span>
                </motion.button>
                <AnimatePresence>
                  {p.editing && (
                    <motion.button className="mix-del" aria-label={`${t.deleteMix}: ${name}`} onClick={() => p.onDelete(m.id)} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={pop}>
                      <Icon name="close" size={14} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
          {p.editing && p.canRestore && (
            <motion.button key="restore" layout className="mix-card mix-dashed" onClick={p.onRestore} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={pop}>
              <span>{t.restorePresets}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ---------- dock ---------- */

function Roll({ text }: { text: string }) {
  return (
    <span className="roll" aria-label={text}>
      {[...text].map((ch, i) => (
        <span className="roll-cell" key={text.length - i} aria-hidden>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span key={ch} initial={{ y: '70%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-70%', opacity: 0 }} transition={{ duration: 0.22 }}>
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}

export function Dock(p: { playing: boolean; count: number; timerLeft: number | null; timerProgress: number; onPlay: () => void; onTimer: () => void; onMix: () => void }) {
  const t = useT()
  const timing = p.timerLeft !== null
  return (
    <motion.nav className="dock" initial={{ y: 120 }} animate={{ y: 0 }} transition={{ ...soft, delay: 0.3 }}>
      <button className="dock-side" data-live={timing || undefined} onClick={p.onTimer} aria-label={timing ? `${t.timerLeft} ${clock(p.timerLeft!)}` : t.timerTitle}>
        <span className="dock-glyph">
          {timing ? (
            <svg className="dock-ring" viewBox="0 0 32 32">
              <circle className="dock-ring-track" cx="16" cy="16" r="12.500" />
              <motion.circle cx="16" cy="16" r="12.500" initial={false} animate={{ pathLength: p.timerProgress }} transition={{ duration: 0.3, ease: 'linear' }} />
            </svg>
          ) : (
            <Icon name="timer" size={26} />
          )}
        </span>
        <span className="dock-label">{timing ? <Roll text={clock(p.timerLeft!)} /> : t.timer}</span>
      </button>

      <motion.button className="play" data-live={p.playing || undefined} disabled={p.count === 0} onClick={p.onPlay} aria-label={p.playing ? t.pause : t.play} whileTap={{ scale: 0.9 }} transition={pop}>
        <span className="breath" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={p.playing ? 'pause' : 'play'} className="play-icon" initial={{ scale: 0.3, opacity: 0, rotate: -60 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 0.3, opacity: 0, rotate: 60 }} transition={pop}>
            <Icon name={p.playing ? 'pause' : 'play'} size={30} />
          </motion.span>
        </AnimatePresence>
      </motion.button>

      <button className="dock-side" onClick={p.onMix} aria-label={`${t.mix}: ${p.count}`}>
        <span className="dock-glyph">
          <Icon name="mix" size={26} />
          <AnimatePresence>
            {p.count > 0 && (
              <motion.span key={p.count} className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={pop}>
                {p.count}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
        <span className="dock-label">{t.mix}</span>
      </button>
    </motion.nav>
  )
}

/* ---------- sheets ---------- */

function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const drag = useDragControls()
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, visualDuration: 0.35 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={(_, i) => (i.offset.y > 90 || i.velocity.y > 500) && onClose()}
          >
            <div className="sheet-head" onPointerDown={(e) => drag.start(e)}>
              <span className="grabber" />
              <h2>{title}</h2>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function TimerSheet(p: { open: boolean; left: number | null; minutes?: number; onClose: () => void; onStart: (m: number) => void; onCancel: () => void }) {
  const t = useT()
  const running = p.left !== null
  return (
    <Sheet open={p.open} title={t.timerTitle} onClose={p.onClose}>
      <p className="sheet-note">{running ? t.timerRunning : t.timerIdle}</p>
      {running && (
        <div className="countdown">
          <Roll text={clock(p.left!)} />
        </div>
      )}
      <div className="durations">
        {TIMER_MINUTES.map((m) => (
          <motion.button key={m} className="duration" data-active={(running && p.minutes === m) || undefined} onClick={() => p.onStart(m)} whileTap={{ scale: 0.9 }} transition={pop}>
            <b>{m === 60 ? 1 : m}</b>
            <span>{m === 60 ? t.hour : t.min}</span>
          </motion.button>
        ))}
      </div>
      {running && (
        <button className="btn ghost" onClick={p.onCancel}>
          {t.cancelTimer}
        </button>
      )}
    </Sheet>
  )
}

export function MixSheet(p: { open: boolean; levels: Levels; canSave: boolean; onClose: () => void; onLevel: (id: string, v: number) => void; onRemove: (id: string) => void; onClear: () => void; onSave: () => void }) {
  const t = useT()
  const ids = Object.keys(p.levels)
  return (
    <Sheet open={p.open} title={t.mixTitle} onClose={p.onClose}>
      {ids.length === 0 ? (
        <p className="sheet-note">{t.mixEmpty}</p>
      ) : (
        <>
          <ul className="mix-list">
            <AnimatePresence initial={false}>
              {ids.map((id) => {
                const s = SOUNDS[id]
                return (
                  <motion.li key={id} layout style={tint(s.color)} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={soft}>
                    <span className="mix-list-icon">
                      <Icon name={id} size={24} />
                    </span>
                    <span className="mix-list-body">
                      <span>{t.sounds[id]}</span>
                      <Volume sound={s} value={p.levels[id]} onChange={p.onLevel} />
                    </span>
                    <button className="icon-btn" aria-label={`${t.remove}: ${t.sounds[id]}`} onClick={() => p.onRemove(id)}>
                      <Icon name="close" size={18} />
                    </button>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          <div className="sheet-actions">
            <button className="btn ghost" onClick={p.onClear}>
              {t.clear}
            </button>
            <button className="btn" disabled={!p.canSave} onClick={p.onSave}>
              {p.canSave ? t.saveMix : t.mixSaved}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

export function SaveSheet(p: { open: boolean; suggested: string; onClose: () => void; onSave: (name: string) => void }) {
  const t = useT()
  const [name, setName] = useState(p.suggested)
  useEffect(() => {
    if (p.open) setName(p.suggested)
  }, [p.open, p.suggested])
  return (
    <Sheet open={p.open} title={t.saveTitle} onClose={p.onClose}>
      <form
        className="save-form"
        onSubmit={(e) => {
          e.preventDefault()
          p.onSave(name.trim() || p.suggested)
        }}
      >
        <label htmlFor="mix-name">{t.name}</label>
        <input id="mix-name" value={name} maxLength={24} autoComplete="off" onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
        <button className="btn" type="submit">
          {t.save}
        </button>
      </form>
    </Sheet>
  )
}

/* ---------- about ---------- */

const BOOSTY = 'https://boosty.to/vibemycode/donate'
const REPO = 'https://github.com/VibeMyCode/Sleepville'
const ADDRESS = '0x183995583E9c4b321A40793C5dadA0b3f3801694'

// a QR code stays folded away until its button is pressed
function QrButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const t = useT()
  return (
    <button className="icon-btn" aria-label={t.showQr} aria-expanded={open} onClick={onToggle}>
      <Icon name="qr" size={26} />
    </button>
  )
}
function QrPicture({ src, open }: { src: string; open: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div className="qr-wrap" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={soft}>
          <img className="qr" src={src} alt="QR" width={184} height={184} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function AboutSheet(p: { open: boolean; lang: Lang; onLang: (l: Lang) => void; onClose: () => void }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<null | 'boosty' | 'erc20'>(null)
  const flip = (which: 'boosty' | 'erc20') => setQr(qr === which ? null : which)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard refused: the address is selectable text, so it can still be copied by hand */
    }
  }
  return (
    <Sheet open={p.open} title={t.about} onClose={p.onClose}>
      <p className="sheet-note">{t.tagline}</p>
      <p className="fine">
        {t.version} {version}
      </p>

      <h3>{t.support}</h3>
      <p className="about-text">{t.supportText}</p>
      <div className="pay-row">
        <a className="btn" href={BOOSTY} target="_blank" rel="noopener noreferrer">
          {t.boosty}
        </a>
        <QrButton open={qr === 'boosty'} onToggle={() => flip('boosty')} />
      </div>
      <QrPicture src={qrBoosty} open={qr === 'boosty'} />
      <div className="crypto">
        <p className="about-text">{t.crypto}</p>
        <code className="address">{ADDRESS}</code>
        <div className="pay-row">
          <button className="btn ghost" onClick={copy}>
            {copied ? t.copied : t.copy}
          </button>
          <QrButton open={qr === 'erc20'} onToggle={() => flip('erc20')} />
        </div>
        <QrPicture src={qrErc20} open={qr === 'erc20'} />
        <p className="fine">{t.cryptoWarning}</p>
      </div>

      <h3>{t.language}</h3>
      <div className="segmented" role="radiogroup" aria-label={t.language}>
        {(Object.keys(LANG_NAMES) as Lang[]).map((l) => (
          <button key={l} role="radio" aria-checked={p.lang === l} lang={l} onClick={() => p.onLang(l)}>
            {p.lang === l && <motion.span layoutId="lang" className="segmented-thumb" transition={soft} />}
            <span>{LANG_NAMES[l]}</span>
          </button>
        ))}
      </div>

      <h3>{t.licenses}</h3>
      <p className="fine">{t.licensesNote}</p>
      <ul className="credits">
        {credits.map((c) => (
          <li key={c.id}>
            <b>{t.sounds[c.id]}</b>
            <span>
              {c.title}
              {c.author && `, ${c.author}`}. {c.license}.
            </span>
            {c.url && (
              <a href={c.url} target="_blank" rel="noopener noreferrer">
                {new URL(c.url).hostname.replace('www.', '')}
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="about-links">
        <a className="btn ghost" href={REPO} target="_blank" rel="noopener noreferrer">
          {t.source}
        </a>
        <a className="btn ghost" href={`${REPO}/issues/new`} target="_blank" rel="noopener noreferrer">
          {t.report}
        </a>
      </div>
    </Sheet>
  )
}

/* ---------- timer end ---------- */

export function Goodnight({ show, onCancel }: { show: boolean; onCancel: () => void }) {
  const t = useT()
  return (
    <AnimatePresence>
      {show && (
        <motion.button className="goodnight" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2.5 }}>
          <span className="goodnight-moon" />
          <strong>{t.goodnight}</strong>
          <span>{t.keepListening}</span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
