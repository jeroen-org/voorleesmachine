import { describe, expect, it } from 'vitest'
import {
  createMemoryStorage,
  DEFAULT_CLOUD_MODEL,
  DEFAULT_OCR_MODEL,
  hasApiKey,
  loadSettings,
  saveSettings,
  type ParentsSettings,
} from './settings'

const base = (overrides: Partial<ParentsSettings> = {}): ParentsSettings => ({
  apiKey: '',
  model: DEFAULT_OCR_MODEL,
  ocrEngine: 'openrouter',
  ttsEngine: 'local',
  ttsVoice: '',
  cloudModel: DEFAULT_CLOUD_MODEL,
  cloudVoice: '',
  ...overrides,
})

describe('settings', () => {
  it('geeft lege standaardinstellingen zonder opslag', () => {
    const storage = createMemoryStorage()
    expect(loadSettings(storage)).toEqual(base())
    expect(hasApiKey(storage)).toBe(false)
  })

  it('bewaart en laadt instellingen terug', () => {
    const storage = createMemoryStorage()
    saveSettings(base({ apiKey: 'sk-or-test', model: 'google/gemini-2.0-flash-001' }), storage)
    expect(loadSettings(storage)).toEqual(base({ apiKey: 'sk-or-test', model: 'google/gemini-2.0-flash-001' }))
    expect(hasApiKey(storage)).toBe(true)
  })

  it('bewaart de lokale OCR-engine zonder sleutel', () => {
    const storage = createMemoryStorage()
    saveSettings(base({ ocrEngine: 'local' }), storage)
    expect(loadSettings(storage)).toEqual(base({ ocrEngine: 'local' }))
    expect(hasApiKey(storage)).toBe(false)
  })

  it('bewaart de cloud-TTS-instellingen', () => {
    const storage = createMemoryStorage()
    saveSettings(
      base({ apiKey: 'sk-or-test', ttsEngine: 'cloud', cloudModel: 'elevenlabs/eleven-v3', cloudVoice: 'george' }),
      storage,
    )
    expect(loadSettings(storage)).toEqual(
      base({ apiKey: 'sk-or-test', ttsEngine: 'cloud', cloudModel: 'elevenlabs/eleven-v3', cloudVoice: 'george' }),
    )
  })

  it('valt terug op het standaardmodel bij een leeg model', () => {
    const storage = createMemoryStorage()
    saveSettings(base({ apiKey: 'sk-or-test', model: '   ' }), storage)
    expect(loadSettings(storage).model).toBe(DEFAULT_OCR_MODEL)
  })

  it('valt terug op het standaard cloud-model bij een leeg cloud-model', () => {
    const storage = createMemoryStorage()
    saveSettings(base({ cloudModel: '   ' }), storage)
    expect(loadSettings(storage).cloudModel).toBe(DEFAULT_CLOUD_MODEL)
  })

  it('valt terug op de standaardengine bij een onbekende waarde', () => {
    const storage = createMemoryStorage()
    storage.setItem(
      'voorleesmachine:settings',
      JSON.stringify({ ...base(), ocrEngine: 'iets-ander', ttsEngine: 'iets-ander' }),
    )
    const settings = loadSettings(storage)
    expect(settings.ocrEngine).toBe('openrouter')
    expect(settings.ttsEngine).toBe('local')
  })

  it('geeft standaardinstellingen bij kapotte opslagdata', () => {
    const storage = createMemoryStorage()
    storage.setItem('voorleesmachine:settings', '{kapot')
    expect(loadSettings(storage)).toEqual(base())
  })

  it('geeft standaardinstellingen bij verkeerde types', () => {
    const storage = createMemoryStorage()
    storage.setItem('voorleesmachine:settings', JSON.stringify({ apiKey: 42, model: null }))
    expect(loadSettings(storage)).toEqual(base())
  })
})