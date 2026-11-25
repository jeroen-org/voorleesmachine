import { describe, expect, it } from 'vitest'
import {
  createMemoryStorage,
  DEFAULT_OCR_MODEL,
  hasApiKey,
  loadSettings,
  saveSettings,
} from './settings'

describe('settings', () => {
  it('geeft lege standaardinstellingen zonder opslag', () => {
    const storage = createMemoryStorage()
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'openrouter' })
    expect(hasApiKey(storage)).toBe(false)
  })

  it('bewaart en laadt instellingen terug', () => {
    const storage = createMemoryStorage()
    saveSettings({ apiKey: 'sk-or-test', model: 'google/gemini-2.0-flash-001', ocrEngine: 'openrouter' }, storage)
    expect(loadSettings(storage)).toEqual({
      apiKey: 'sk-or-test',
      model: 'google/gemini-2.0-flash-001',
      ocrEngine: 'openrouter',
    })
    expect(hasApiKey(storage)).toBe(true)
  })

  it('bewaart de lokale OCR-engine zonder sleutel', () => {
    const storage = createMemoryStorage()
    saveSettings({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'local' }, storage)
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'local' })
    expect(hasApiKey(storage)).toBe(false)
  })

  it('valt terug op het standaardmodel bij een leeg model', () => {
    const storage = createMemoryStorage()
    saveSettings({ apiKey: 'sk-or-test', model: '   ', ocrEngine: 'openrouter' }, storage)
    expect(loadSettings(storage).model).toBe(DEFAULT_OCR_MODEL)
  })

  it('valt terug op de standaardengine bij een onbekende waarde', () => {
    const storage = createMemoryStorage()
    storage.setItem('voorleesmachine:settings', JSON.stringify({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'iets-ander' }))
    expect(loadSettings(storage).ocrEngine).toBe('openrouter')
  })

  it('geeft standaardinstellingen bij kapotte opslagdata', () => {
    const storage = createMemoryStorage()
    storage.setItem('voorleesmachine:settings', '{kapot')
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'openrouter' })
  })

  it('geeft standaardinstellingen bij verkeerde types', () => {
    const storage = createMemoryStorage()
    storage.setItem('voorleesmachine:settings', JSON.stringify({ apiKey: 42, model: null }))
    expect(loadSettings(storage)).toEqual({ apiKey: '', model: DEFAULT_OCR_MODEL, ocrEngine: 'openrouter' })
  })
})