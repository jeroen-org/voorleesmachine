import type { ICamera } from './camera/ICamera'
import type { IOcr } from './ocr/IOcr'
import type { ITts, TtsStateListener } from './tts/ITts'
import { createBrowserCamera } from './camera/browserCamera'
import { createOpenRouterOcr } from './ocr/openrouterOcr'
import { createTesseractOcr } from './ocr/tesseractOcr'
import { createWebSpeechTts, isWebSpeechAvailable } from './tts/webSpeechTts'
import { createOpenRouterTts } from './tts/openRouterTts'
import { createMockCamera } from './mock/mockCamera'
import { createMockOcr, type MockOcrOptions } from './mock/mockOcr'
import { createMockTts } from './mock/mockTts'
import { loadSettings, type TtsEngine } from '../parents/settings'

export type Services = {
  camera: ICamera
  ocr: IOcr
  tts: ITts
}

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return true
  return new URLSearchParams(window.location.search).has('mock')
}

export function createMockServices(): Services {
  return {
    camera: createMockCamera(),
    ocr: createMockOcr(mockOcrOptionsFromUrl()),
    tts: createMockTts(),
  }
}

function mockOcrOptionsFromUrl(): MockOcrOptions {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  if (params.get('ocr') === 'empty') return { errorKind: 'no-text-found' }
  if (params.get('ocr') === 'fail') return { errorKind: 'failed' }
  return {}
}

export function createServices(mock: boolean): Services {
  const mockServices = createMockServices()
  if (mock) return mockServices
  return {
    camera: createBrowserCamera(),
    ocr: createOcrService(),
    tts: createTtsService(mockServices.tts),
  }
}

export function createTtsService(fallback: ITts): ITts {
  let local: ITts | null = null
  let cloud: ITts | null = null
  let active: ITts = fallback
  let activeKind: TtsEngine | '' = ''
  let unsubscribe: (() => void) | null = null
  const listeners = new Set<TtsStateListener>()

  const localFor = (): ITts => {
    if (!local) {
      local = isWebSpeechAvailable()
        ? createWebSpeechTts({ voiceName: loadSettings().ttsVoice || undefined })
        : fallback
    }
    return local
  }

  const cloudFor = (): ITts => {
    if (!cloud) {
      cloud = createOpenRouterTts({
        getApiKey: () => loadSettings().apiKey,
        getModel: () => loadSettings().cloudModel,
        getVoice: () => loadSettings().cloudVoice,
      })
    }
    return cloud
  }

  const resolveKind = (): TtsEngine => {
    const settings = loadSettings()
    if (settings.ttsEngine === 'cloud' && settings.apiKey.trim()) return 'cloud'
    return 'local'
  }

  const activate = (): ITts => {
    const kind = resolveKind()
    if (kind === activeKind) return active
    if (unsubscribe) unsubscribe()
    active.stop()
    active = kind === 'cloud' ? cloudFor() : localFor()
    activeKind = kind
    unsubscribe = active.onStateChange((state) => {
      for (const listener of listeners) listener(state)
    })
    return active
  }

  return {
    speak(text, opts) {
      activate().speak(text, opts)
    },
    pause() {
      activate().pause()
    },
    resume() {
      activate().resume()
    },
    stop() {
      activate().stop()
    },
    setVolume(next) {
      activate().setVolume(next)
    },
    onStateChange(listener) {
      activate()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export function createOcrService(): IOcr {
  let openrouter: IOcr | null = null
  let local: IOcr | null = null
  const openrouterFor = (): IOcr => {
    if (!openrouter) {
      openrouter = createOpenRouterOcr({
        getApiKey: () => loadSettings().apiKey,
        getModel: () => loadSettings().model,
      })
    }
    return openrouter
  }
  const localFor = (): IOcr => {
    if (!local) local = createTesseractOcr()
    return local
  }
  return {
    recognize(image, signal) {
      const engine = loadSettings().ocrEngine
      return (engine === 'local' ? localFor() : openrouterFor()).recognize(image, signal)
    },
  }
}
