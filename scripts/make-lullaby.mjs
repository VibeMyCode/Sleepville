// Renders sounds-src/lullaby.flac: a slow single-line piano melody that loops without a seam.
// Notes come from Salamander Grand Piano samples (CC BY 3.0, Alexander Holm) in sounds-src/piano-samples/.
// Run: node scripts/make-lullaby.mjs && npm run sounds lullaby
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const SR = 44100
const BEAT = 2.0 // seconds; one unhurried note per beat
const RING = 8 // seconds a note is left to ring, as with the pedal held
const DIR = 'sounds-src/piano-samples'
const SAMPLES = { Ds4: 63, Fs4: 66, A4: 69, C5: 72, Ds5: 75 } // file -> MIDI pitch
const PITCH = { D4: 62, E4: 64, Fs4: 66, A4: 69, B4: 71, D5: 74, E5: 76 }

// D major pentatonic, four phrases of eight beats; ends on the tonic so the loop restarts at rest
const MELODY = [
  ['Fs4', 1], ['A4', 1], ['D5', 2], ['B4', 1], ['A4', 1], ['Fs4', 2],
  ['E4', 1], ['Fs4', 1], ['A4', 2], ['Fs4', 1], ['E4', 1], ['D4', 2],
  ['Fs4', 1], ['A4', 1], ['D5', 1], ['E5', 1], ['D5', 1], ['B4', 1], ['A4', 2],
  ['B4', 1], ['A4', 1], ['Fs4', 2], ['E4', 1], ['Fs4', 1], ['D4', 2],
]

const decode = (file) => {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
  assert.equal(r.status, 0, `cannot decode ${file}`)
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4)
}
const samples = Object.fromEntries(Object.keys(SAMPLES).map((k) => [k, decode(`${DIR}/${k}.flac`)]))

const beats = MELODY.reduce((n, [, b]) => n + b, 0)
const frames = Math.round(beats * BEAT * SR)
const loop = new Float32Array(frames * 2)

let seed = 3
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) // fixed: same take on every run

let at = 0
for (const [name, len] of MELODY) {
  const midi = PITCH[name]
  const from = Object.keys(SAMPLES).reduce((a, b) => (Math.abs(SAMPLES[b] - midi) < Math.abs(SAMPLES[a] - midi) ? b : a))
  const src = samples[from]
  const ratio = 2 ** ((midi - SAMPLES[from]) / 12) // repitch by at most a semitone
  // even dynamics: tiny human variation, upper notes held back a little
  const gain = (0.5 + (rnd() - 0.5) * 0.06) * (1 - 0.012 * (midi - 66))
  const start = Math.round((at * BEAT + (rnd() - 0.5) * 0.05 + 0.05) * SR)
  const ring = RING * SR
  for (let i = 0; i < ring; i++) {
    const p = i * ratio
    const j = Math.floor(p)
    if (j + 1 >= src.length / 2) break
    const f = p - j
    const fade = i < ring * 0.6 ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - ring * 0.6)) / (ring * 0.4))
    const o = ((start + i) % frames) * 2 // tails wrap round: that is what makes the loop seamless
    loop[o] += (src[j * 2] * (1 - f) + src[j * 2 + 2] * f) * gain * fade
    loop[o + 1] += (src[j * 2 + 1] * (1 - f) + src[j * 2 + 3] * f) * gain * fade
  }
  at += len
}

// Room reverb is stateful, so it is run over two repeats and the second one is kept:
// by then the echo of "the previous pass" is already in place, exactly as when looping.
const twice = new Float32Array(loop.length * 2)
twice.set(loop)
twice.set(loop, loop.length)
const r = spawnSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', '-', '-af', `aecho=0.85:0.7:83|167|311:0.22|0.15|0.09,lowpass=f=7000,atrim=start_sample=${frames}:end_sample=${frames * 2},asetpts=PTS-STARTPTS`, '-c:a', 'flac', 'sounds-src/lullaby.flac'],
  { input: Buffer.from(twice.buffer), maxBuffer: 1 << 28 },
)
assert.equal(r.status, 0, String(r.stderr))
console.log(`lullaby.flac: ${beats} beats, ${(frames / SR).toFixed(1)} s`)
