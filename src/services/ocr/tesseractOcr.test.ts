import { describe, expect, it, vi } from 'vitest'
import { createTesseractOcr } from './tesseractOcr'
import type { Worker } from 'tesseract.js'
import { OcrError } from '../../domain/ocrErrors'

function fakeWorker(text: string): Worker {
  return { recognize: vi.fn().mockResolvedValue({ data: { text } }) } as unknown as Worker
}

function factory(text: string) {
  const worker = fakeWorker(text)
  const createWorkerImpl = vi.fn().mockResolvedValue(worker) as unknown as typeof import('tesseract.js').createWorker
  return { ocr: createTesseractOcr({ createWorkerImpl }), worker, createWorkerImpl }
}

describe('createTesseractOcr', () => {
  it('geeft de herkende tekst terug', async () => {
    const { ocr } = factory('De kleine draak vloog weg.')
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('De kleine draak vloog weg.')
  })

  it('verwijdert paginanummers en lege regels', async () => {
    const { ocr } = factory('Eerste regel.\n\n42\nTweede regel.\n')
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('Eerste regel.\nTweede regel.')
  })

  it('geeft een lege string bij een lege herkenning', async () => {
    const { ocr } = factory('   \n  ')
    await expect(ocr.recognize(new Blob(['foto']))).resolves.toBe('')
  })

  it('hergebruikt dezelfde worker over meerdere herkenningen', async () => {
    const { ocr, createWorkerImpl } = factory('tekst')
    await ocr.recognize(new Blob(['a']))
    await ocr.recognize(new Blob(['b']))
    expect(createWorkerImpl).toHaveBeenCalledTimes(1)
  })

  it('breekt af als het externe signaal al afgebroken is', async () => {
    const { ocr } = factory('tekst')
    const controller = new AbortController()
    controller.abort()
    await expect(ocr.recognize(new Blob(['foto']), controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('geeft een timeout bij een hangende herkenning', async () => {
    const worker = { recognize: vi.fn(() => new Promise(() => {})) } as unknown as Worker
    const createWorkerImpl = vi.fn().mockResolvedValue(worker) as unknown as typeof import('tesseract.js').createWorker
    const ocr = createTesseractOcr({ createWorkerImpl, timeoutMs: 20 })
    await expect(ocr.recognize(new Blob(['foto']))).rejects.toMatchObject({ kind: 'timeout' })
  })

  it('gooit een fout bij een mislukte herkenning', async () => {
    const worker = { recognize: vi.fn().mockRejectedValue(new Error('kapot')) } as unknown as Worker
    const createWorkerImpl = vi.fn().mockResolvedValue(worker) as unknown as typeof import('tesseract.js').createWorker
    const ocr = createTesseractOcr({ createWorkerImpl })
    const error = await ocr.recognize(new Blob(['foto'])).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(OcrError)
    expect((error as OcrError).kind).toBe('failed')
  })

  it('gooit een fout als de worker niet gestart kan worden', async () => {
    const createWorkerImpl = vi.fn().mockRejectedValue(new Error('geen wasm')) as unknown as typeof import('tesseract.js').createWorker
    const ocr = createTesseractOcr({ createWorkerImpl })
    await expect(ocr.recognize(new Blob(['foto']))).rejects.toMatchObject({ kind: 'failed' })
  })
})