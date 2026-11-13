// Self-check for the language choice. Run: node scripts/check-i18n.mjs (part of `npm run build`).
// Missing keys are caught by tsc; this covers what types cannot: which language a system gets, and empty strings.
import assert from 'node:assert/strict'
import { STRINGS, LANG_NAMES, pickLang } from '../src/i18n.ts'

assert.equal(pickLang(['de-DE', 'en-US']), 'de')
assert.equal(pickLang(['uk-UA', 'ru-RU', 'en']), 'ru') // the first language the app speaks, not the first in the list
assert.equal(pickLang(['zh-Hant-TW']), 'zh')
assert.equal(pickLang(['pt_BR']), 'pt')
assert.equal(pickLang(['in-ID']), 'id')
assert.equal(pickLang(['sv-SE']), 'en')
assert.equal(pickLang([]), 'en')
assert.deepEqual(Object.keys(STRINGS), Object.keys(LANG_NAMES))
for (const [lang, t] of Object.entries(STRINGS)) {
  assert.equal(t.groups.length, 5, lang)
  for (const [key, value] of Object.entries({ ...t, ...t.sounds, ...t.presets, n1: t.playing(1), n5: t.playing(5), p1: t.paused(1), m: t.myMix(2) }))
    if (typeof value === 'string') assert.ok(value.trim(), `${lang}.${key} is empty`)
}
console.log('i18n ok:', Object.keys(STRINGS).join(' '))
