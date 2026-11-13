import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import * as engine from './engine'
import { native } from './native'
import { I18n, STRINGS, detectLang, type Lang } from './i18n'
import { Icon } from './icons'
import { GROUPS, PRESETS, SOUNDS, sameLevels, type Levels, type Mix } from './sounds'
import { AboutSheet, Dock, Goodnight, MixSheet, MixStrip, SaveSheet, Sky, Tile, TimerSheet } from './ui'

type Sheet = null | 'timer' | 'mix' | 'save' | 'about'

const FADE_MS = 10_000
const DEFAULT_LEVEL = 0.6

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key)!) ?? fallback
  } catch {
    return fallback
  }
}
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: the mix still plays, it just is not remembered */
  }
}
// drop ids that no longer exist in the catalogue
const known = (l: Levels): Levels => Object.fromEntries(Object.entries(l).filter(([id]) => id in SOUNDS))

export default function App() {
  const [lang, setLang] = useState<Lang>(() => load('lang', detectLang()))
  const [levels, setLevels] = useState<Levels>(() => known(load('levels', {})))
  const [mixes, setMixes] = useState<Mix[]>(() => load<Mix[]>('mixes', []).map((m) => ({ ...m, levels: known(m.levels) })))
  const [hidden, setHidden] = useState<string[]>(() => load('hiddenPresets', []))
  const [playing, setPlaying] = useState(false)
  const [timer, setTimer] = useState<{ end: number; minutes: number } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [sheet, setSheet] = useState<Sheet>(null)
  const [editing, setEditing] = useState(false)

  const t = STRINGS[lang]
  const ids = Object.keys(levels)
  const count = ids.length
  const live = playing && count > 0
  const presets = PRESETS.filter((m) => !hidden.includes(m.id))

  // read by callbacks that must stay stable for the memoised tiles and the native listeners
  const levelsRef = useRef(levels)
  levelsRef.current = levels
  const liveRef = useRef(live)
  liveRef.current = live
  const everPlayed = useRef(false)

  useEffect(() => save('levels', levels), [levels])
  useEffect(() => save('mixes', mixes), [mixes])
  useEffect(() => save('hiddenPresets', hidden), [hidden])
  useEffect(() => {
    save('lang', lang)
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => {
    engine.sync(levels, live)
  }, [levels, live])
  useEffect(() => {
    if (count === 0) setPlaying(false)
  }, [count])
  useEffect(() => {
    if (mixes.length + presets.length + hidden.length === 0) setEditing(false)
  }, [mixes.length, presets.length, hidden.length])

  // notification: none until the first play, then it follows play/pause so the mix can be resumed from it
  useEffect(() => {
    if (live) everPlayed.current = true
    native.setState({
      state: live ? 'playing' : everPlayed.current && count > 0 ? 'paused' : 'off',
      text: live ? t.playing(count) : t.paused(count),
      toggle: live ? t.pause : t.play,
      close: t.close,
    })
  }, [live, count, t])

  useEffect(() => {
    let resumeAfterCall = false
    const offToggle = native.on('toggle', () => setPlaying((p) => !p))
    const offCall = native.on('call', ({ active }) => {
      if (active && liveRef.current) {
        resumeAfterCall = true
        setPlaying(false)
      } else if (!active && resumeAfterCall) {
        resumeAfterCall = false
        setPlaying(true)
      }
    })
    return () => {
      offToggle()
      offCall()
    }
  }, [])

  useEffect(() => {
    if (!timer) return
    let fading = false
    const tick = () => {
      const left = timer.end - Date.now()
      // no repaints behind a dark screen: hidden pages do not run animations, the digits would pile up
      if (!document.hidden) setNow(Date.now())
      if (left <= FADE_MS && !fading) {
        fading = true
        engine.fadeOut(left / 1000)
      }
      if (left <= 0) {
        setTimer(null)
        setPlaying(false)
        native.exit()
      }
    }
    tick()
    const i = setInterval(tick, 250)
    return () => clearInterval(i)
  }, [timer])

  const left = timer ? Math.max(0, timer.end - now) : 0

  // an open sheet is a history entry, so the Android back button closes it instead of doing nothing
  useEffect(() => {
    const pop = () => setSheet(null)
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  const openSheet = (next: Sheet) => {
    if (history.state?.sheet) history.replaceState({ sheet: next }, '')
    else history.pushState({ sheet: next }, '')
    setSheet(next)
  }
  const closeSheet = () => (history.state?.sheet ? history.back() : setSheet(null))

  const toggle = useCallback((id: string) => {
    if (id in levelsRef.current) {
      setLevels(({ [id]: _, ...rest }) => rest)
    } else {
      setLevels((l) => ({ ...l, [id]: DEFAULT_LEVEL }))
      setPlaying(true)
    }
  }, [])
  const setLevel = useCallback((id: string, v: number) => setLevels((l) => (id in l ? { ...l, [id]: v } : l)), [])
  const applyMix = (m: Mix) => {
    setLevels({ ...m.levels })
    setPlaying(true)
  }
  const deleteMix = (id: string) => (id[0] === 'u' ? setMixes(mixes.filter((m) => m.id !== id)) : setHidden([...hidden, id]))
  const startTimer = (minutes: number) => {
    const end = Date.now() + minutes * 60_000
    engine.cancelFade()
    setTimer({ end, minutes })
    native.setExitAt(end + 1500)
    closeSheet()
  }
  const cancelTimer = () => {
    setTimer(null)
    native.setExitAt(0)
    engine.cancelFade()
  }
  const saveMix = (name: string) => {
    setMixes([{ id: `u${Date.now()}`, name, levels: { ...levels } }, ...mixes])
    closeSheet()
  }

  const canSave = count > 0 && ![...mixes, ...presets].some((m) => sameLevels(m.levels, levels))
  const status = count === 0 ? t.choose : live ? t.playing(count) : t.paused(count)

  return (
    <I18n.Provider value={t}>
      <MotionConfig reducedMotion="user">
        <Sky colors={ids.map((id) => SOUNDS[id].color).join()} />
        <main className="app">
          <header className="top">
            <div className="top-text">
              <h1>Sleepville</h1>
              <AnimatePresence mode="wait" initial={false}>
                <motion.p key={status} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                  {status}
                </motion.p>
              </AnimatePresence>
            </div>
            <span className="moon" aria-hidden />
            <button className="icon-btn" aria-label={t.about} onClick={() => openSheet('about')}>
              <Icon name="info" size={22} />
            </button>
          </header>

          <MixStrip
            mixes={mixes}
            presets={presets}
            canRestore={hidden.length > 0}
            levels={levels}
            editing={editing}
            canSave={canSave}
            onEdit={() => setEditing(!editing)}
            onApply={applyMix}
            onDelete={deleteMix}
            onRestore={() => setHidden([])}
            onSave={() => openSheet('save')}
          />

          <div className="groups">
            {GROUPS.map((group, gi) => (
              <motion.section key={gi} className="group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.06 * gi, ease: 'easeOut' }}>
                <h2>{t.groups[gi]}</h2>
                <div className="grid">
                  {group.map((s) => (
                    <Tile key={s.id} sound={s} level={levels[s.id]} onToggle={toggle} onLevel={setLevel} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        </main>

        <Dock
          playing={live}
          count={count}
          timerLeft={timer ? left : null}
          timerProgress={timer ? left / (timer.minutes * 60_000) : 0}
          onPlay={() => setPlaying(!playing)}
          onTimer={() => openSheet('timer')}
          onMix={() => openSheet('mix')}
        />

        <TimerSheet open={sheet === 'timer'} left={timer ? left : null} minutes={timer?.minutes} onClose={closeSheet} onStart={startTimer} onCancel={cancelTimer} />
        <MixSheet open={sheet === 'mix'} levels={levels} canSave={canSave} onClose={closeSheet} onLevel={setLevel} onRemove={toggle} onClear={() => setLevels({})} onSave={() => openSheet('save')} />
        <SaveSheet open={sheet === 'save'} suggested={t.myMix(mixes.length + 1)} onClose={closeSheet} onSave={saveMix} />
        <AboutSheet open={sheet === 'about'} lang={lang} onLang={setLang} onClose={closeSheet} />
        <Goodnight show={!!timer && left <= FADE_MS} onCancel={cancelTimer} />
      </MotionConfig>
    </I18n.Provider>
  )
}
