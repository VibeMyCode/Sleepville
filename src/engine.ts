import { SOUNDS, type Levels } from './sounds'

type Voice = { gain: GainNode; src?: AudioBufferSourceNode; el?: HTMLAudioElement }

let ctx: AudioContext | undefined
let master: GainNode
let wasPlaying = false
let suspendTimer = 0
const voices = new Map<string, Voice>()

const url = (id: string) => `sounds/${id}.ogg`
// slider position -> gain; squared so the lower half of the slider is usable
const curve = (v: number) => v * v

// Pin the param at its present value before scheduling something new.
// (cancelAndHoldAtTime after a setTarget made the next ramp jump straight to its end value.)
function hold(p: AudioParam, t: number) {
  const v = p.value
  p.cancelScheduledValues(t)
  p.setValueAtTime(v, t)
}

function start(id: string, c: AudioContext): Voice {
  const gain = c.createGain()
  gain.gain.value = 0
  gain.connect(master)
  const voice: Voice = { gain }
  if (SOUNDS[id].kind === 'track') {
    // long recordings stream through an element instead of living decoded in memory
    const el = new Audio(url(id))
    el.loop = true
    c.createMediaElementSource(el).connect(gain)
    voice.el = el
  } else {
    // decoded on every activation rather than cached: a cache of all loops would hold ~300 MB
    fetch(url(id))
      .then((r) => r.arrayBuffer())
      .then((b) => c.decodeAudioData(b))
      .then((buf) => {
        if (voices.get(id) !== voice) return
        const src = c.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(gain)
        src.start() // always from the top: a struck bowl must be heard the moment it is switched on
        voice.src = src
      })
      .catch((e) => console.error('sound failed', id, e))
  }
  return voice
}

/** Reconcile the audio graph with the wanted mix. Safe to call on every state change. */
export function sync(levels: Levels, playing: boolean) {
  if (!ctx) {
    if (!playing) return
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
  }
  const c = ctx
  const t = c.currentTime

  for (const [id, v] of voices) {
    if (id in levels) continue
    voices.delete(id)
    v.gain.gain.setTargetAtTime(0, t, 0.12)
    setTimeout(() => {
      v.src?.stop()
      v.el?.pause()
      v.gain.disconnect()
    }, 700)
  }
  for (const id in levels) {
    let v = voices.get(id)
    if (!v) voices.set(id, (v = start(id, c)))
    v.gain.gain.setTargetAtTime(curve(levels[id]), t, 0.08)
    if (v.el && playing && v.el.paused) v.el.play().catch(() => {})
  }

  if (playing === wasPlaying) return
  wasPlaying = playing
  clearTimeout(suspendTimer)
  hold(master.gain, t)
  if (playing) {
    c.resume()
    master.gain.setTargetAtTime(1, t, 0.2)
  } else {
    master.gain.setTargetAtTime(0, t, 0.12)
    suspendTimer = window.setTimeout(() => {
      for (const v of voices.values()) v.el?.pause()
      c.suspend()
    }, 700)
  }
}

/** Sleep-timer fade: ramps the whole mix to silence over `seconds`. */
export function fadeOut(seconds: number) {
  if (!ctx) return
  hold(master.gain, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + Math.max(seconds, 0.05))
}

export function cancelFade() {
  if (!ctx || !wasPlaying) return
  hold(master.gain, ctx.currentTime)
  master.gain.setTargetAtTime(1, ctx.currentTime, 0.3)
}

if (import.meta.env.DEV) {
  // lets the browser checks read real gains instead of trusting the UI
  ;(window as unknown as Record<string, unknown>).__engine = () => ({
    state: ctx?.state,
    master: ctx ? master.gain.value : null,
    voices: Object.fromEntries([...voices].map(([id, v]) => [id, { gain: v.gain.gain.value, ready: !!(v.src || v.el) }])),
  })
}
