import type { TtsState } from '../../domain/types'
import type { ITts, SpeakOptions, TtsStateListener } from './ITts'

export type UtteranceLike = {
  text: unknown
  lang: unknown
  rate: unknown
  volume: unknown
  voice: unknown
  onstart: unknown
  onend: unknown
  onerror: unknown
}

export type SynthesisVoiceLike = {
  lang: string
  name?: string
}

export type SynthesisLike = {
  speak: (utterance: UtteranceLike) => void
  cancel: () => void
  pause: () => void
  resume: () => void
  getVoices: () => SynthesisVoiceLike[]
}

export type UtteranceFactory = (text: string) => UtteranceLike

export type WebSpeechTtsOptions = {
  synthesis?: SynthesisLike
  utteranceFactory?: UtteranceFactory
  chunker?: (text: string) => string[]
  rate?: number
  voiceName?: string
}

const NL_LANG = 'nl-NL'
const DEFAULT_RATE = 0.95
const MAX_CHUNK_LENGTH = 200

export function isWebSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.speechSynthesis === 'object'
}

export function listDutchVoices(): SynthesisVoiceLike[] {
  if (!isWebSpeechAvailable()) return []
  const voices = window.speechSynthesis.getVoices() as unknown as SynthesisVoiceLike[]
  return voices
    .filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('nl'))
    .sort((a, b) => Number(isHighQualityVoice(b)) - Number(isHighQualityVoice(a)))
}

export function createWebSpeechTts(options: WebSpeechTtsOptions = {}): ITts {
  const maybeSynthesis = options.synthesis ?? defaultSynthesis()
  if (!maybeSynthesis) throw new Error('Spraaksynthese is niet beschikbaar')
  const synthesis: SynthesisLike = maybeSynthesis
  const chunker = options.chunker ?? defaultChunker
  const rate = options.rate ?? DEFAULT_RATE
  const preferredVoiceName = options.voiceName

  let state: TtsState = 'idle'
  let volume = 1
  let chunks: string[] = []
  let currentIndex = 0
  let generation = 0
  const listeners = new Set<TtsStateListener>()

  function setState(next: TtsState): void {
    state = next
    for (const listener of listeners) listener(next)
  }

  function pickVoice(): SynthesisVoiceLike | null {
    const voices = synthesis.getVoices()
    const dutch = voices.filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith('nl'))
    if (preferredVoiceName) {
      const preferred = dutch.find((voice) => voice.name === preferredVoiceName)
      if (preferred) return preferred
    }
    return dutch.find(isHighQualityVoice) ?? dutch[0] ?? null
  }

  function makeUtterance(chunk: string, chunkVolume: number): UtteranceLike {
    const utterance = options.utteranceFactory
      ? options.utteranceFactory(chunk)
      : (new SpeechSynthesisUtterance(chunk) as unknown as UtteranceLike)
    utterance.lang = NL_LANG
    utterance.rate = rate
    utterance.volume = chunkVolume
    const voice = pickVoice()
    if (voice) utterance.voice = voice
    return utterance
  }

  function speakChunk(index: number): void {
    if (index >= chunks.length) {
      setState('done')
      return
    }
    const gen = generation
    currentIndex = index
    const utterance = makeUtterance(chunks[index], volume)
    utterance.onend = () => {
      if (gen === generation && state === 'speaking') speakChunk(index + 1)
    }
    utterance.onerror = () => {
      if (gen === generation && state === 'speaking') {
        synthesis.cancel()
        setState('failed')
      }
    }
    synthesis.speak(utterance)
  }

  return {
    speak(text, opts: SpeakOptions) {
      generation += 1
      synthesis.cancel()
      volume = normalizeVolume(opts.volume)
      chunks = chunker(text)
      if (chunks.length === 0) {
        setState('done')
        return
      }
      setState('speaking')
      speakChunk(0)
    },
    pause() {
      if (state !== 'speaking') return
      synthesis.pause()
      setState('paused')
    },
    resume() {
      if (state !== 'paused') return
      synthesis.resume()
      setState('speaking')
    },
    stop() {
      generation += 1
      synthesis.cancel()
      chunks = []
      currentIndex = 0
      setState('idle')
    },
    setVolume(next) {
      const normalized = normalizeVolume(next)
      volume = normalized
      if (state !== 'speaking') return
      generation += 1
      synthesis.cancel()
      speakChunk(currentIndex)
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

function isHighQualityVoice(voice: SynthesisVoiceLike): boolean {
  return /natural|online|google|neural|premium|enhanced/i.test(voice.name ?? '')
}

export function defaultChunker(text: string): string[] {
  return joinWrappedLines(text)
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitLongParagraph(paragraph))
}

function joinWrappedLines(text: string): string {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n')
  const lines = normalized.split('\n')
  const merged: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      merged.push('')
      continue
    }
    const previous = merged[merged.length - 1]
    if (previous && /(\p{L})-$/u.test(previous)) {
      merged[merged.length - 1] = `${dehyphenate(previous)}${line}`
    } else if (previous && !/[.!?…]["'”’)]?$/.test(previous)) {
      merged[merged.length - 1] = `${previous} ${line}`
    } else {
      merged.push(line)
    }
  }
  return merged.join('\n')
}

function dehyphenate(line: string): string {
  return line.replace(/(\p{L})-$/u, '$1')
}

function splitLongParagraph(paragraph: string, maxLength = MAX_CHUNK_LENGTH): string[] {
  if (paragraph.length <= maxLength) return [paragraph]
  const sentences = paragraph.split(/(?<=[.!?])\s+/)
  const parts: string[] = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > maxLength && current) {
      parts.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current) parts.push(current)
  return parts.flatMap((part) => (part.length > maxLength ? splitOnClauses(part, maxLength) : [part]))
}

function splitOnClauses(part: string, maxLength: number): string[] {
  const clauses = part.split(/(?<=[,;:])\s+/)
  if (clauses.length <= 1) return [part]
  const result: string[] = []
  let current = ''
  for (const clause of clauses) {
    const candidate = current ? `${current} ${clause}` : clause
    if (candidate.length > maxLength && current) {
      result.push(current)
      current = clause
    } else {
      current = candidate
    }
  }
  if (current) result.push(current)
  return result
}

function defaultSynthesis(): SynthesisLike | undefined {
  if (!isWebSpeechAvailable()) return undefined
  return window.speechSynthesis as unknown as SynthesisLike
}
