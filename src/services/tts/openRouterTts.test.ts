import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createOpenRouterTts, type AudioLike } from './openRouterTts'

function fakeAudio(): AudioLike & { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> } {
  return {
    src: '',
    volume: 1,
    onended: null,
    onerror: null,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
  }
}

const flush = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0))
}

function make(overrides: Partial<Parameters<typeof createOpenRouterTts>[0]> = {}) {
  const audios: ReturnType<typeof fakeAudio>[] = []
  const tts = createOpenRouterTts({
    getApiKey: () => 'sk-or-test',
    getModel: () => 'google/gemini-2.5-pro-tts',
    getVoice: () => 'Zephyr',
    fetchImpl: vi.fn().mockImplementation(async () => new Response(new Blob(['audio'], { type: 'audio/mpeg' }), { status: 200 })) as unknown as typeof fetch,
    audioFactory: (url: string) => {
      const audio = fakeAudio()
      audio.src = url
      audios.push(audio)
      return audio
    },
    ...overrides,
  })
  return { tts, audios }
}

describe('createOpenRouterTts', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:audio'), configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('haalt audio op en speelt de stukken achter elkaar', async () => {
    const { tts, audios } = make()
    const states: string[] = []
    tts.onStateChange((s) => states.push(s))

    tts.speak('Eerste alinea.\n\nTweede alinea.', { volume: 0.8 })
    expect(states).toEqual(['speaking'])
    await flush()
    expect(audios.length).toBe(1)
    expect(audios[0].volume).toBe(0.8)

    audios[0].onended?.()
    await flush()
    expect(audios.length).toBe(2)

    audios[1].onended?.()
    await flush()
    expect(states.at(-1)).toBe('done')
  })

  it('stuurt de juiste request-body naar de audio-endpoint', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(new Blob(['audio']), { status: 200 })) as unknown as typeof fetch
    const { tts } = make({ fetchImpl: fetchMock })
    tts.speak('Hallo.', { volume: 1 })
    await flush()
    const [url, init] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toContain('openrouter.ai')
    const body = JSON.parse(String(init.body))
    expect(body.model).toBe('google/gemini-2.5-pro-tts')
    expect(body.voice).toBe('Zephyr')
    expect(body.response_format).toBe('mp3')
    expect(String((init.headers as Record<string, string>).Authorization)).toContain('sk-or-test')
  })

  it('gaat naar failed zonder sleutel', async () => {
    const { tts } = make({ getApiKey: () => '' })
    const states: string[] = []
    tts.onStateChange((s) => states.push(s))
    tts.speak('Hallo.', { volume: 1 })
    await flush()
    expect(states.at(-1)).toBe('failed')
  })

  it('gaat naar failed bij een http-fout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('oops', { status: 500 })) as unknown as typeof fetch
    const { tts } = make({ fetchImpl: fetchMock })
    const states: string[] = []
    tts.onStateChange((s) => states.push(s))
    tts.speak('Hallo.', { volume: 1 })
    await flush()
    expect(states.at(-1)).toBe('failed')
  })

  it('pauzeert en hervat het huidige stuk', async () => {
    const { tts, audios } = make()
    tts.speak('Hallo.', { volume: 1 })
    await flush()
    tts.pause()
    expect(audios[0].pause).toHaveBeenCalled()
    tts.resume()
    expect(audios[0].play).toHaveBeenCalledTimes(2)
  })

  it('negeert een late eind-callback na stop', async () => {
    const { tts, audios } = make()
    const states: string[] = []
    tts.onStateChange((s) => states.push(s))
    tts.speak('Hallo.', { volume: 1 })
    await flush()
    tts.stop()
    expect(states.at(-1)).toBe('idle')
    audios[0].onended?.()
    await flush()
    expect(states.at(-1)).toBe('idle')
  })
})