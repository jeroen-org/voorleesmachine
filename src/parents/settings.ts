export type OcrEngine = 'openrouter' | 'local'
export type TtsEngine = 'local' | 'cloud'

export type ParentsSettings = {
  apiKey: string
  model: string
  ocrEngine: OcrEngine
  ttsEngine: TtsEngine
  ttsVoice: string
  cloudModel: string
  cloudVoice: string
}

export const DEFAULT_OCR_MODEL = 'google/gemini-2.5-flash'
export const DEFAULT_OCR_ENGINE: OcrEngine = 'openrouter'
export const DEFAULT_TTS_ENGINE: TtsEngine = 'local'
export const DEFAULT_CLOUD_MODEL = 'google/gemini-2.5-pro-tts'

const STORAGE_KEY = 'voorleesmachine:settings'

export function createMemoryStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => Array.from(map.keys())[index] ?? null,
    removeItem: (key) => {
      map.delete(key)
    },
    setItem: (key, value) => {
      map.set(key, String(value))
    },
  }
}

function defaultStorage(): Storage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
  } catch {
    return createMemoryStorage()
  }
  return createMemoryStorage()
}

const emptySettings = (): ParentsSettings => ({
  apiKey: '',
  model: DEFAULT_OCR_MODEL,
  ocrEngine: DEFAULT_OCR_ENGINE,
  ttsEngine: DEFAULT_TTS_ENGINE,
  ttsVoice: '',
  cloudModel: DEFAULT_CLOUD_MODEL,
  cloudVoice: '',
})

export function loadSettings(storage: Storage = defaultStorage()): ParentsSettings {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptySettings()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptySettings()
    const record = parsed as Record<string, unknown>
    return {
      apiKey: typeof record.apiKey === 'string' ? record.apiKey : '',
      model: typeof record.model === 'string' && record.model ? record.model : DEFAULT_OCR_MODEL,
      ocrEngine: record.ocrEngine === 'local' ? 'local' : DEFAULT_OCR_ENGINE,
      ttsEngine: record.ttsEngine === 'cloud' ? 'cloud' : DEFAULT_TTS_ENGINE,
      ttsVoice: typeof record.ttsVoice === 'string' ? record.ttsVoice : '',
      cloudModel: typeof record.cloudModel === 'string' && record.cloudModel ? record.cloudModel : DEFAULT_CLOUD_MODEL,
      cloudVoice: typeof record.cloudVoice === 'string' ? record.cloudVoice : '',
    }
  } catch {
    return emptySettings()
  }
}

export function saveSettings(settings: ParentsSettings, storage: Storage = defaultStorage()): void {
  storage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_OCR_MODEL,
      ocrEngine: settings.ocrEngine,
      ttsEngine: settings.ttsEngine,
      ttsVoice: settings.ttsVoice.trim(),
      cloudModel: settings.cloudModel.trim() || DEFAULT_CLOUD_MODEL,
      cloudVoice: settings.cloudVoice.trim(),
    }),
  )
}

export function hasApiKey(storage: Storage = defaultStorage()): boolean {
  return loadSettings(storage).apiKey.trim().length > 0
}
