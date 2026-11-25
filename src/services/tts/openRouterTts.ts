import type { TtsState } from '../../domain/types'
import type { ITts, SpeakOptions, TtsStateListener } from './ITts'
import { defaultChunker } from './webSpeechTts'

const OPENROUTER_SPEECH_URL = 'https://openrouter.ai/api/v1/audio/speech'
const DEFAULT_TIMEOUT_MS = 60_000

export type AudioLike = {
  src: string
  volume: number
  play: () => Promise<void>
  pause: () => void
  onended: (() => void) | null
  onerror: (() => void) | null
}

export type OpenRouterTtsOptions = {
  getApiKey: () => string
  getModel: () => string
  getVoice: () => string
  fetchImpl?: typeof fetch
  chunker?: (text: string) => string[]
  audioFactory?: (url: string) => AudioLike
  timeoutMs?: number
}

export function createOpenRouterTts(options: OpenRouterTtsOptions): ITts {
  const {
    getApiKey,
    getModel,
    getVoice,
    fetchImpl = fetch,
    chunker = defaultChunker,
    audioFactory = defaultAudioFactory,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  let state: TtsState = 'idle'
  let volume = 1
  let chunks: string[] = []
  let generation = 0
  let currentAudio: AudioLike | null = null
  let currentUrl: string | null = null
  const listeners = new Set<TtsStateListener>()

  function setState(next: TtsState): void {
    state = next
    for (const listener of listeners) listener(next)
  }

  function clearCurrentAudio(): void {
    if (currentAudio) {
      currentAudio.onended = null
      currentAudio.onerror = null
      currentAudio.pause()
    }
    currentAudio = null
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl)
      currentUrl = null
    }
  }

  async function playChunk(index: number): Promise<void> {
    if (index >= chunks.length) {
      setState('done')
      return
    }
    const gen = generation
    try {
      const url = await synthesize(chunks[index])
      if (gen !== generation) {
        URL.revokeObjectURL(url)
        return
      }
      clearCurrentAudio()
      currentUrl = url
      const audio = audioFactory(url)
      audio.volume = volume
      currentAudio = audio
      audio.onended = () => {
        if (gen === generation && state === 'speaking') void playChunk(index + 1)
      }
      audio.onerror = () => {
        if (gen === generation && state === 'speaking') {
          clearCurrentAudio()
          setState('failed')
        }
      }
      await audio.play()
    } catch (error) {
      if (gen !== generation) return
      if (state !== 'speaking') return
      clearCurrentAudio()
      setState('failed')
      void error
    }
  }

  async function synthesize(text: string): Promise<string> {
    const apiKey = getApiKey().trim()
    if (!apiKey) throw new Error('no-api-key')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(OPENROUTER_SPEECH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getModel(),
          input: text,
          voice: getVoice() || undefined,
          response_format: 'mp3',
        }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`speech failed: ${response.status}`)
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    speak(text, opts: SpeakOptions) {
      generation += 1
      clearCurrentAudio()
      volume = normalizeVolume(opts.volume)
      chunks = chunker(text)
      if (chunks.length === 0) {
        setState('done')
        return
      }
      setState('speaking')
      void playChunk(0)
    },
    pause() {
      if (state !== 'speaking' || !currentAudio) return
      currentAudio.pause()
      setState('paused')
    },
    resume() {
      if (state !== 'paused' || !currentAudio) return
      void currentAudio.play()
      setState('speaking')
    },
    stop() {
      generation += 1
      clearCurrentAudio()
      chunks = []
      setState('idle')
    },
    setVolume(next) {
      volume = normalizeVolume(next)
      if (currentAudio) currentAudio.volume = volume
    },
    onStateChange(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function normalizeVolume(volume: number): number {
  if (!Number.isFinite(volume)) return 1
  return Math.min(1, Math.max(0, volume))
}

function defaultAudioFactory(url: string): AudioLike {
  const audio = new Audio(url) as unknown as AudioLike
  return audio
}