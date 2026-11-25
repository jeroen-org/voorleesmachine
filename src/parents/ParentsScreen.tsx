import { useEffect, useRef, useState } from 'react'
import {
  DEFAULT_CLOUD_MODEL,
  DEFAULT_OCR_MODEL,
  loadSettings,
  saveSettings,
  type OcrEngine,
  type TtsEngine,
} from './settings'
import { CheckIcon, KeySlashIcon, XIcon } from '../components/icons'
import { L } from '../components/labels'
import { listDutchVoices } from '../services/tts/webSpeechTts'

export function ParentsScreen({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(DEFAULT_OCR_MODEL)
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>('openrouter')
  const [ttsEngine, setTtsEngine] = useState<TtsEngine>('local')
  const [ttsVoice, setTtsVoice] = useState('')
  const [cloudModel, setCloudModel] = useState(DEFAULT_CLOUD_MODEL)
  const [cloudVoice, setCloudVoice] = useState('')
  const [voices, setVoices] = useState<string[]>([])
  const [keyStored, setKeyStored] = useState(false)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const settings = loadSettings()
    setApiKey(settings.apiKey)
    setModel(settings.model)
    setOcrEngine(settings.ocrEngine)
    setTtsEngine(settings.ttsEngine)
    setTtsVoice(settings.ttsVoice)
    setCloudModel(settings.cloudModel)
    setCloudVoice(settings.cloudVoice)
    setKeyStored(settings.apiKey.trim().length > 0)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const update = () => setVoices(listDutchVoices().map((voice) => voice.name ?? '').filter(Boolean))
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const save = () => {
    saveSettings({ apiKey, model, ocrEngine, ttsEngine, ttsVoice, cloudModel, cloudVoice })
    setKeyStored(apiKey.trim().length > 0)
    setSaved(true)
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setSaved(false), 2000)
  }

  const openrouter = ocrEngine === 'openrouter'
  const cloudTts = ttsEngine === 'cloud'

  return (
    <main className="screen parents-screen">
      <button type="button" className="big-button md btn-slate" aria-label={L.backToApp} onClick={onBack}>
        <XIcon />
      </button>
      <div className="parents-content">
        <div className="parents-field">
          <span>{L.ocrEngine}</span>
          <div className="parents-toggle" role="group" aria-label={L.ocrEngine}>
            <button
              type="button"
              className={`parents-toggle-btn ${openrouter ? 'active' : ''}`}
              aria-pressed={openrouter}
              onClick={() => setOcrEngine('openrouter')}
            >
              {L.ocrEngineOpenrouter}
            </button>
            <button
              type="button"
              className={`parents-toggle-btn ${!openrouter ? 'active' : ''}`}
              aria-pressed={!openrouter}
              onClick={() => setOcrEngine('local')}
            >
              {L.ocrEngineLocal}
            </button>
          </div>
        </div>
        {openrouter && (
          <>
            <div
              className={`parents-status ${keyStored ? 'ok' : ''}`}
              role="img"
              aria-label={keyStored ? L.keyStored : L.keyMissing}
            >
              {keyStored ? <CheckIcon /> : <KeySlashIcon />}
            </div>
            <label className="parents-field">
              <span>Geheime sleutel (OpenRouter)</span>
              <input
                type="password"
                value={apiKey}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <label className="parents-field">
              <span>AI-model</span>
              <input
                type="text"
                value={model}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setModel(event.target.value)}
              />
            </label>
          </>
        )}

        <div className="parents-field">
          <span>{L.ttsEngine}</span>
          <div className="parents-toggle" role="group" aria-label={L.ttsEngine}>
            <button
              type="button"
              className={`parents-toggle-btn ${!cloudTts ? 'active' : ''}`}
              aria-pressed={!cloudTts}
              onClick={() => setTtsEngine('local')}
            >
              {L.ttsEngineLocal}
            </button>
            <button
              type="button"
              className={`parents-toggle-btn ${cloudTts ? 'active' : ''}`}
              aria-pressed={cloudTts}
              onClick={() => setTtsEngine('cloud')}
            >
              {L.ttsEngineCloud}
            </button>
          </div>
        </div>

        {!cloudTts && voices.length > 0 && (
          <label className="parents-field">
            <span>{L.ttsVoice}</span>
            <select value={ttsVoice} onChange={(event) => setTtsVoice(event.target.value)}>
              <option value="">{L.ttsVoiceDefault}</option>
              {voices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </label>
        )}

        {cloudTts && (
          <>
            <label className="parents-field">
              <span>{L.cloudModel}</span>
              <input
                type="text"
                value={cloudModel}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setCloudModel(event.target.value)}
              />
            </label>
            <label className="parents-field">
              <span>{L.cloudVoice}</span>
              <input
                type="text"
                value={cloudVoice}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setCloudVoice(event.target.value)}
              />
            </label>
            <p className="parents-note">{L.cloudNote}</p>
          </>
        )}

        <button
          type="button"
          className={`big-button md ${saved ? 'btn-green' : 'btn-orange'}`}
          aria-label={L.saveSettings}
          onClick={save}
        >
          <CheckIcon />
        </button>
        <p className="parents-note">
          {openrouter
            ? 'De sleutel wordt alleen op dit toestel bewaard en nooit verstuurd, behalve naar OpenRouter bij het voorlezen van een pagina.'
            : 'De tekst wordt volledig op dit toestel herkend. Er is geen internet en geen sleutel nodig.'}
        </p>
      </div>
    </main>
  )
}