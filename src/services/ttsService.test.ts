import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTtsService } from './index'
import { DEFAULT_CLOUD_MODEL, DEFAULT_OCR_MODEL, saveSettings, type ParentsSettings } from '../parents/settings'
import type { ITts } from './tts/ITts'

const { localSpeak, cloudSpeak, localStop, cloudStop } = vi.hoisted(() => ({
  localSpeak: vi.fn(),
  cloudSpeak: vi.fn(),
  localStop: vi.fn(),
  cloudStop: vi.fn(),
}))

vi.mock('./tts/webSpeechTts', () => ({
  isWebSpeechAvailable: () => true,
  createWebSpeechTts: () => ({
    speak: localSpeak,
    stop: localStop,
    pause: vi.fn(),
    resume: vi.fn(),
    setVolume: vi.fn(),
    onStateChange: () => () => {},
  }),
}))

vi.mock('./tts/openRouterTts', () => ({
  createOpenRouterTts: () => ({
    speak: cloudSpeak,
    stop: cloudStop,
    pause: vi.fn(),
    resume: vi.fn(),
    setVolume: vi.fn(),
    onStateChange: () => () => {},
  }),
}))

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

function fallbackTts(): ITts {
  return {
    speak: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    setVolume: vi.fn(),
    onStateChange: () => () => {},
  }
}

describe('createTtsService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    localSpeak.mockClear()
    cloudSpeak.mockClear()
    localStop.mockClear()
    cloudStop.mockClear()
  })

  it('gebruikt de lokale engine als die gekozen is', () => {
    saveSettings(base({ ttsEngine: 'local' }))
    const tts = createTtsService(fallbackTts())
    tts.speak('Hallo.', { volume: 1 })
    expect(localSpeak).toHaveBeenCalledTimes(1)
    expect(cloudSpeak).not.toHaveBeenCalled()
  })

  it('schakelt naar cloud en weer terug naar lokaal zonder herstart', () => {
    saveSettings(base({ ttsEngine: 'local' }))
    const tts = createTtsService(fallbackTts())

    tts.speak('Een.', { volume: 1 })
    expect(localSpeak).toHaveBeenCalledTimes(1)

    saveSettings(base({ ttsEngine: 'cloud', apiKey: 'sk-or-test' }))
    tts.speak('Twee.', { volume: 1 })
    expect(cloudSpeak).toHaveBeenCalledTimes(1)
    expect(localStop).toHaveBeenCalled()

    saveSettings(base({ ttsEngine: 'local' }))
    tts.speak('Drie.', { volume: 1 })
    expect(localSpeak).toHaveBeenCalledTimes(2)
    expect(cloudStop).toHaveBeenCalled()
  })

  it('valt terug op lokaal als cloud gekozen is maar de sleutel ontbreekt', () => {
    saveSettings(base({ ttsEngine: 'cloud', apiKey: '' }))
    const tts = createTtsService(fallbackTts())
    tts.speak('Hallo.', { volume: 1 })
    expect(localSpeak).toHaveBeenCalledTimes(1)
    expect(cloudSpeak).not.toHaveBeenCalled()
  })
})