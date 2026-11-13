// Renders sounds-src/bamboo.flac: bamboo chimes in a light breeze.
// No sparse recording was to be had, so single knocks are lifted out of a busy one
// (sounds-src/chimes-wood__3.mp3, CC BY 4.0, jppi_Stu) and laid out thinly: a knock or two, then a pause.
// Run: node scripts/make-bamboo.mjs && npm run sounds chimes-wood
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const SR = 44100
const LOOP = 60 // seconds
const CLEAR = 0.45 // a knock is usable when nothing else sounds for this long after it
const SRC = 'sounds-src/chimes-wood__3.mp3'

// band-limited to where a knock lives: the hiss and rumble around it would otherwise come and go with every knock
const r = spawnSync('ffmpeg', ['-v', 'error', '-i', SRC, '-af', 'highpass=f=180,lowpass=f=7000', '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
assert.equal(r.status, 0, `cannot decode ${SRC}`)
const src = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4)

// onsets: the 5 ms level jumps to twice the level of the 20 ms before it
const HOP = Math.round(SR * 0.005)
const env = new Float32Array(Math.floor(src.length / 2 / HOP))
let peak = 0
for (let i = 0; i < env.length; i++) {
  let s = 0
  for (let j = i * HOP * 2; j < (i + 1) * HOP * 2; j++) s += src[j] * src[j]
  peak = Math.max(peak, (env[i] = Math.sqrt(s / HOP / 2)))
}
const onsets = []
for (let i = 5; i < env.length; i++) {
  const before = (env[i - 2] + env[i - 3] + env[i - 4] + env[i - 5]) / 4
  if (env[i] > peak * 0.05 && env[i] > before * 2 && (!onsets.length || i - onsets.at(-1) > 16)) onsets.push(i)
}

// a knock runs from just before its onset to just before the next one
const knocks = []
for (let k = 0; k < onsets.length - 1; k++) {
  const gap = (onsets[k + 1] - onsets[k]) * 0.005
  if (gap < CLEAR) continue
  const from = Math.max(0, onsets[k] * HOP - Math.round(SR * 0.008))
  const len = Math.round(Math.min(gap - 0.02, 0.9) * SR)
  let top = 0
  for (let i = from * 2; i < (from + len) * 2; i++) top = Math.max(top, Math.abs(src[i]))
  knocks.push({ from, len, top })
}
assert.ok(knocks.length >= 8, `only ${knocks.length} clean knocks found`)

let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) // fixed: same take on every run
const between = (a, b) => a + rnd() * (b - a)

const frames = LOOP * SR
const loop = new Float32Array(frames * 2)
const FADE_IN = Math.round(SR * 0.004)
const BODY = Math.round(SR * 0.2) // after this the knock is eased down to nothing, taking its background noise with it
let count = 0
// opens on a knock, so the sound is heard the moment it is switched on
// ...and closes on silence: the last knock is over before the loop point
for (let t = 0.15; t < LOOP - 3.5; t += between(0.7, 2.1)) {
  let at = t
  for (let n = rnd() < 0.45 ? 1 : rnd() < 0.7 ? 2 : 3; n > 0; n--) {
    const k = knocks[Math.floor(rnd() * knocks.length)]
    // knocks are evened out to a common peak, then given a soft, varied touch
    const gain = (between(0.35, 0.9) * peak) / Math.max(k.top, peak * 0.2)
    const start = Math.round(at * SR)
    for (let i = 0; i < k.len; i++) {
      const fade = Math.min(1, i / FADE_IN) * (i < BODY ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - BODY)) / (k.len - BODY)))
      const o = ((start + i) % frames) * 2
      loop[o] += src[(k.from + i) * 2] * gain * fade
      loop[o + 1] += src[(k.from + i) * 2 + 1] * gain * fade
    }
    count++
    at += between(0.3, 0.9)
  }
  t = at
}
const perMinute = (count / LOOP) * 60
assert.ok(perMinute > 30 && perMinute < 50, `${perMinute} knocks a minute is not a light breeze`)

const w = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-', '-c:a', 'flac', 'sounds-src/bamboo.flac'], {
  input: Buffer.from(loop.buffer),
  maxBuffer: 1 << 28,
})
assert.equal(w.status, 0, String(w.stderr))
console.log(`bamboo.flac: ${count} knocks in ${LOOP} s (${perMinute.toFixed(0)} a minute), from a pool of ${knocks.length} of ${onsets.length} in the recording`)
