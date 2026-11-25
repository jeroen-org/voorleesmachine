import { createWorker, type Worker } from 'tesseract.js'
import { OcrError } from '../../domain/ocrErrors'
import type { IOcr } from './IOcr'

const DEFAULT_LANG = 'nld'
const DEFAULT_TIMEOUT_MS = 90_000

export type TesseractOcrOptions = {
  lang?: string
  timeoutMs?: number
  createWorkerImpl?: typeof createWorker
}

export function createTesseractOcr(options: TesseractOcrOptions = {}): IOcr {
  const { lang = DEFAULT_LANG, timeoutMs = DEFAULT_TIMEOUT_MS, createWorkerImpl = createWorker } = options
  let workerPromise: Promise<Worker> | null = null

  const getWorker = (): Promise<Worker> => {
    if (!workerPromise) {
      workerPromise = createWorkerImpl(lang).catch((error: unknown) => {
        workerPromise = null
        throw error
      })
    }
    return workerPromise
  }

  return {
    async recognize(image, signal) {
      if (signal?.aborted) throw new DOMException('Afgebroken', 'AbortError')

      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new OcrError('timeout')), timeoutMs)
      })
      const aborted = new Promise<never>((_resolve, reject) => {
        if (signal) signal.addEventListener('abort', () => reject(new DOMException('Afgebroken', 'AbortError')), { once: true })
      })

      try {
        const worker = await getWorker()
        const result = await Promise.race([worker.recognize(image), timeout, aborted])
        return cleanup(result.data.text)
      } catch (error) {
        if (error instanceof OcrError) throw error
        if (signal?.aborted) throw new DOMException('Afgebroken', 'AbortError')
        throw new OcrError('failed', { cause: error })
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    },
  }
}

function cleanup(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\d{1,4}$/.test(line))
    .join('\n')
    .trim()
}