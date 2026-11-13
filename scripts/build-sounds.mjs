// Turns the raw recordings in sounds-src/ into the files the app ships:
// seamless loops and faded tracks, loudness-matched, Ogg Vorbis, in public/sounds/.
// Run: npm run sounds        (needs ffmpeg on PATH)
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SRC = 'sounds-src'
const OUT = 'public/sounds'
const TARGET_LUFS = -23
const PEAK_CEILING = -1.5
const LIMIT = (10 ** (PEAK_CEILING / 20)).toFixed(3)
const MAX_LIMITING = 8

// loop:  [start, start+dur+xfade] of the source; the extra `xfade` seconds are
//        blended over the end so the last sample runs into the first. xfade 0 = source already loops.
// wrap:  a single strike with a long tail, repeated every `wrap` seconds: the tail is cut
//        into slices of that length and the slices are summed, so each strike rings over the next.
// track: whole file (or start/dur) with fades and a silent `pad` before it repeats.
// gain:  per-sound correction in dB on top of loudness matching.
// limiting: how many dB of peaks may be shaved for this sound (default MAX_LIMITING).
// level: ride the gain so quiet and loud passages come out about equally loud.
// eq:    extra ffmpeg filters applied to the source.
// swell: 0..1, how far the level sinks between two slow swells per loop (thins out busy recordings).
const SOUNDS = [
  { id: 'rain', src: 'rain__1.mp3', start: 10, dur: 50, xfade: 4 },
  { id: 'rain-roof', src: 'rain-roof__1.mp3', start: 5, dur: 45, xfade: 4 },
  { id: 'thunder', src: 'thunder__1.mp3', start: 0, dur: 65, xfade: 2 },
  { id: 'stream', src: 'stream__1.mp3', start: 10, dur: 45, xfade: 4 },
  { id: 'waves', src: 'waves__1.mp3', start: 5, dur: 60, xfade: 5 },
  { id: 'wind', src: 'wind__1.mp3', start: 5, dur: 50, xfade: 5 },
  { id: 'leaves', src: 'leaves__1.mp3', start: 3, dur: 45, xfade: 4 },
  // the crackles are 20 dB above the bed; without extra limiting the fire is inaudible next to rain
  { id: 'fire', src: 'fire__1.mp3', start: 10, dur: 45, xfade: 3, limiting: 14 },
  { id: 'noise', synth: 'brown', dur: 30, xfade: 4 },
  { id: 'birds', src: 'birds__1.mp3', start: 5, dur: 55, xfade: 4 },
  { id: 'crickets', src: 'crickets__1.mp3', start: 10, dur: 40, xfade: 4 },
  { id: 'frogs', src: 'frogs__1.mp3', start: 2, dur: 60, xfade: 3 },
  { id: 'owl', src: 'owl__1.mp3', track: true, fadeOut: 0.4, pad: 17 },
  { id: 'cat', src: 'cat__1.mp3', start: 2, dur: 30, xfade: 3 },
  // a struck bowl is mostly decay, so matched loudness leaves it faint next to steady sounds: lifted, strike left unshaved
  { id: 'bowl', src: 'bowl__3.mp3', wrap: 12, gain: 4, limiting: 0 },
  // the calmest minute of a light-breeze recording; the high-pass removes wind thumps below the lowest tube
  { id: 'chimes-metal', src: 'chimes-metal__3.mp3', start: 40, dur: 55, xfade: 4, eq: 'highpass=f=350' },
  {
    id: 'chimes-wood',
    src: 'bamboo.flac', // rendered by scripts/make-bamboo.mjs
    dur: 60,
    xfade: 0,
    credit: { title: 'bamboo_wind_chimes_1.wav, single knocks re-spaced', author: 'jppi_Stu', license: 'CC-BY 4.0', sourcePage: 'https://freesound.org/people/jppi_Stu/sounds/17090/' },
  },
  { id: 'tanpura', src: 'tanpura__2.mp3', start: 16, dur: 48, xfade: 4, level: true },
  // an unaccompanied cedar flute; the spectrogram shows one melodic line and nothing under it
  { id: 'flute', src: 'flute__e.mp3', track: true, dur: 133.8, fadeOut: 1.5, pad: 3, level: true },
  // the recording has a loud right hand over a faint left: lift the low mids, pull the melody range down
  { id: 'piano', src: 'piano__2.ogg', track: true, fadeOut: 3, pad: 3, level: true, eq: 'equalizer=f=300:t=q:w=0.9:g=4,equalizer=f=1400:t=q:w=0.9:g=-5' },
  {
    id: 'lullaby',
    src: 'lullaby.flac', // rendered by scripts/make-lullaby.mjs
    dur: 64,
    xfade: 0,
    credit: { title: 'Lullaby, rendered from Salamander Grand Piano V3 samples', author: 'Alexander Holm (samples)', license: 'CC-BY 3.0', sourcePage: 'https://github.com/sfzinstruments/SalamanderGrandPiano' },
  },
  { id: 'sitar', src: 'sitar__2.mp3', track: true, fadeOut: 4, pad: 3, level: true },
  { id: 'sarod', src: 'sarod__2.mp3', track: true, fadeOut: 4, pad: 3, level: true },
]

// measured on the sitar take: loudness range 12.6 LU raw, 3.7 LU with these settings
const LEVEL = 'dynaudnorm=f=150:g=11:p=0.5:m=10:s=0'
const WRAP_SLICES = 4

const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 })
const probeDur = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }))

function inputArgs(s) {
  let file = `${SRC}/${s.src}`
  if (s.synth) {
    // two independent generators, so the noise is wide rather than a point between the ears
    const n = (seed) => `anoisesrc=color=${s.synth}:sample_rate=44100:duration=${s.dur + s.xfade}:seed=${seed}`
    file = join(tmpdir(), `sleepville-${s.id}.wav`)
    ff(['-f', 'lavfi', '-i', `${n(11)}[l];${n(29)}[r];[l][r]join=inputs=2:channel_layout=stereo,highpass=f=30`, file])
  }
  // one read of the source per piece that gets blended (acrossfade/amix cannot share a split input)
  const reads = s.wrap ? WRAP_SLICES : s.track || s.xfade === 0 ? 1 : 2
  return Array.from({ length: reads }, () => ['-i', file]).flat()
}

// where the strike begins, so a wrapped loop opens on it instead of on silence
function onset(file) {
  const x = pcm(file)
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]))
  const i = x.findIndex((v) => Math.abs(v) > peak * 0.05)
  return Math.max(0, i / 44100 - 0.01)
}

// gain is applied after the pieces are joined, so the shaper sees the final signal.
// clip: tame stray peaks with a memoryless shaper (a limiter has state, so loop ends would not meet cleanly)
function chain(s, gainDb, clip = false) {
  // stateful source filters run before trimming: every read then carries the same state at the same moment
  const pre = [s.level && LEVEL, s.eq].filter(Boolean).map((f) => f + ',').join('')
  const fmt = 'aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo'
  const len = s.wrap ?? s.dur
  // slow swells whose period divides the loop, so the level is the same at both ends
  const swell = s.swell ? `,volume='1-${s.swell}*(0.5-0.5*cos(4*PI*t/${len}))':eval=frame` : ''
  const fin = `volume=${gainDb.toFixed(2)}dB${clip ? `,asoftclip=type=tanh:threshold=${LIMIT}` : ''}${swell}[out]`
  if (s.track) {
    const len = s.dur ?? probeDur(`${SRC}/${s.src}`) - (s.start ?? 0)
    const trim = `atrim=start=${s.start ?? 0}:duration=${len},asetpts=PTS-STARTPTS`
    return `[0:a]${pre}${trim},${fmt},afade=t=in:d=0.05,afade=t=out:st=${len - s.fadeOut}:d=${s.fadeOut},apad=pad_dur=${s.pad},${fin}`
  }
  if (s.wrap) {
    const t0 = s.start ?? (s.start = onset(`${SRC}/${s.src}`))
    const slices = Array.from({ length: WRAP_SLICES }, (_, k) => {
      const last = k === WRAP_SLICES - 1 ? `,afade=t=out:st=${s.wrap - 3}:d=3` : ''
      return `[${k}:a]${pre}atrim=start=${t0 + k * s.wrap}:duration=${s.wrap},asetpts=PTS-STARTPTS,${fmt}${last},apad=whole_dur=${s.wrap}[w${k}]`
    })
    const mix = slices.map((_, k) => `[w${k}]`).join('') + `amix=inputs=${WRAP_SLICES}:normalize=0:duration=longest,atrim=duration=${s.wrap}`
    return `${slices.join(';')};${mix},${fin}`
  }
  const { start = 0, dur, xfade } = s
  if (xfade === 0) return `[0:a]${pre}atrim=start=${start}:duration=${dur},asetpts=PTS-STARTPTS,${fmt},${fin}`
  return (
    `[0:a]${pre}atrim=start=${start + xfade}:duration=${dur},asetpts=PTS-STARTPTS,${fmt}[body];` +
    `[1:a]${pre}atrim=start=${start}:duration=${xfade},asetpts=PTS-STARTPTS,${fmt}[head];` +
    // equal-power curves: the two halves are uncorrelated, a linear blend would dip
    `[body][head]acrossfade=d=${xfade}:c1=qsin:c2=qsin,${fin}`
  )
}

function measure(s) {
  const graph = chain(s, 0).replace('[out]', ',loudnorm=print_format=json[out]')
  const r = ff([...inputArgs(s), '-filter_complex', graph, '-map', '[out]', '-f', 'null', '-'])
  const json = r.stderr.slice(r.stderr.lastIndexOf('{'))
  const m = JSON.parse(json.slice(0, json.indexOf('}') + 1))
  return { lufs: Number(m.input_i), peak: Number(m.input_tp), lra: Number(m.input_lra) }
}

function pcm(file) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.byteLength / 4)
}

mkdirSync(OUT, { recursive: true })
const only = process.argv.slice(2)
const report = []
for (const s of SOUNDS) {
  if (only.length && !only.includes(s.id)) continue
  const { lufs, peak, lra } = measure(s)
  // stray peaks (a crackle, one loud drop) may be limited by up to MAX_LIMITING dB instead of holding the whole sound down
  const gain = Math.min(TARGET_LUFS - lufs + (s.gain ?? 0), PEAK_CEILING - peak + (s.limiting ?? MAX_LIMITING))
  const clip = gain > PEAK_CEILING - peak
  const out = `${OUT}/${s.id}.ogg`
  const r = ff([...inputArgs(s), '-filter_complex', chain(s, gain, clip), '-map', '[out]', '-c:a', 'libvorbis', '-q:a', s.track ? '4' : '3', out])
  assert.equal(r.status, 0, `${s.id}: ffmpeg failed\n${r.stderr.slice(-600)}`)

  // self-check: right length, audible, and (for loops) no step where the end meets the start
  const x = pcm(out)
  const seconds = x.length / 44100
  const want = s.track ? (s.dur ?? probeDur(`${SRC}/${s.src}`) - (s.start ?? 0)) + s.pad : (s.wrap ?? s.dur)
  assert.ok(Math.abs(seconds - want) < 0.1, `${s.id}: ${seconds.toFixed(2)}s, expected ${want}s`)
  let sum = 0
  for (let i = 0; i < x.length; i++) sum += x[i] * x[i]
  const rms = Math.sqrt(sum / x.length)
  assert.ok(rms > 0.003, `${s.id}: almost silent (rms ${rms})`)
  let step = 0
  for (let i = 1; i < 2000; i++) step = Math.max(step, Math.abs(x[i] - x[i - 1]), Math.abs(x[x.length - i] - x[x.length - i - 1]))
  const seam = Math.abs(x[0] - x[x.length - 1])
  // the wrap-around jump must look like any other neighbouring pair of samples
  assert.ok(seam <= Math.max(step * 1.5, 0.02), `${s.id}: click at loop point (${seam.toFixed(3)} vs ${step.toFixed(3)})`)
  report.push(`${s.id.padEnd(13)} ${seconds.toFixed(1).padStart(6)}s  in ${lufs.toFixed(1)} LUFS  gain ${gain >= 0 ? '+' : ''}${gain.toFixed(1)} dB${clip ? ' clip' : '     '}  range ${lra.toFixed(1)} LU  seam ${seam.toFixed(4)}`)
}
console.log(report.join('\n'))

// credits, straight from the download manifest: a table for the repo, JSON for the About screen
const manifest = JSON.parse(readFileSync(`${SRC}/manifest.json`, 'utf8'))
const credits = SOUNDS.map((s) => {
  const m = s.credit ?? manifest.find((e) => e.file === s.src)
  if (!m) return { id: s.id, title: 'Synthesised with ffmpeg', author: '', license: 'CC0', url: '' }
  return { id: s.id, title: m.title ?? s.src, author: m.author ?? '', license: m.license, url: m.sourcePage }
})
writeFileSync('src/credits.json', JSON.stringify(credits, null, 2) + '\n')
const rows = credits.map((c) => `| ${c.id} | ${c.title} | ${c.author || '—'} | ${c.license} | ${c.url || '—'} |`)
writeFileSync(
  `${OUT}/CREDITS.md`,
  `# Sound credits\n\nProcessed (trimmed, looped, level-matched) by \`scripts/build-sounds.mjs\`.\n\n| Sound | Original | Author | License | Source |\n|---|---|---|---|---|\n${rows.join('\n')}\n`,
)
