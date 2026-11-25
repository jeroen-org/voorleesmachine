import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createOcrService } from './index'
import { DEFAULT_CLOUD_MODEL, DEFAULT_OCR_MODEL, saveSettings } from '../parents/settings'
import type { OcrEngine } from '../parents/settings'

const { openrouterRecognize, localRecognize } = vi.hoisted(() => ({
  openrouterRecognize: vi.fn(),
  localRecognize: vi.fn(),
}))

vi.mock('./ocr/openrouterOcr', () => ({
  createOpenRouterOcr: () => ({ recognize: openrouterRecognize }),
}))

vi.mock('./ocr/tesseractOcr', () => ({
  createTesseractOcr: () => ({ recognize: localRecognize }),
}))

function setEngine(ocrEngine: OcrEngine, apiKey = '') {
  saveSettings({
    apiKey,
    model: DEFAULT_OCR_MODEL,
    ocrEngine,
    ttsEngine: 'local',
    ttsVoice: '',
    cloudModel: DEFAULT_CLOUD_MODEL,
    cloudVoice: '',
  })
}

describe('createOcrService', () => {
  beforeEach(() => {
    window.localStorage.clear()
    openrouterRecognize.mockReset().mockResolvedValue('OPENROUTER')
    localRecognize.mockReset().mockResolvedValue('LOCAL')
  })

  it('gebruikt de lokale engine zonder dat een sleutel nodig is', async () => {
    setEngine('local')
    const ocr = createOcrService()
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('LOCAL')
    expect(openrouterRecognize).not.toHaveBeenCalled()
  })

  it('gebruikt de OpenRouter-engine als die gekozen is', async () => {
    setEngine('openrouter', 'sk-or-test')
    const ocr = createOcrService()
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('OPENROUTER')
    expect(localRecognize).not.toHaveBeenCalled()
  })

  it('leest de engine per foto, zodat wisselen zonder herstart werkt', async () => {
    setEngine('openrouter', 'sk-or-test')
    const ocr = createOcrService()
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('OPENROUTER')

    setEngine('local')
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('LOCAL')
  })
})