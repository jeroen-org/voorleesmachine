import type { ICamera } from './camera/ICamera'
import type { IOcr } from './ocr/IOcr'
import type { ITts } from './tts/ITts'
import { createBrowserCamera } from './camera/browserCamera'
import { createOpenRouterOcr } from './ocr/openrouterOcr'
import { createTesseractOcr } from './ocr/tesseractOcr'
import { createWebSpeechTts, isWebSpeechAvailable } from './tts/webSpeechTts'
import { createMockCamera } from './mock/mockCamera'
import { createMockOcr, type MockOcrOptions } from './mock/mockOcr'
import { createMockTts } from './mock/mockTts'
import { loadSettings } from '../parents/settings'

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
    tts: isWebSpeechAvailable() ? createWebSpeechTts() : mockServices.tts,
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
