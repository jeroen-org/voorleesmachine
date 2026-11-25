import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ParentsScreen } from './ParentsScreen'
import { loadSettings } from './settings'
import { L } from '../components/labels'

describe('ParentsScreen', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('bewaart de sleutel en het model', async () => {
    const user = userEvent.setup()
    render(<ParentsScreen onBack={() => {}} />)

    await user.type(screen.getByLabelText('Geheime sleutel (OpenRouter)'), 'sk-or-test-123')
    await user.clear(screen.getByLabelText('AI-model'))
    await user.type(screen.getByLabelText('AI-model'), 'google/gemini-2.0-flash-001')
    await user.click(screen.getByRole('button', { name: L.saveSettings }))

    expect(loadSettings(window.localStorage)).toMatchObject({
      apiKey: 'sk-or-test-123',
      model: 'google/gemini-2.0-flash-001',
      ocrEngine: 'openrouter',
    })
    expect(screen.getByRole('img', { name: L.keyStored })).toBeInTheDocument()
  })

  it('toont bij het openen de opgeslagen instellingen', () => {
    window.localStorage.setItem(
      'voorleesmachine:settings',
      JSON.stringify({ apiKey: 'sk-or-bestaand', model: 'mijn-model' }),
    )
    render(<ParentsScreen onBack={() => {}} />)
    expect(screen.getByLabelText('Geheime sleutel (OpenRouter)')).toHaveValue('sk-or-bestaand')
    expect(screen.getByLabelText('AI-model')).toHaveValue('mijn-model')
  })

  it('verbergt de sleutelvelden bij de lokale engine en bewaart die keuze', async () => {
    const user = userEvent.setup()
    render(<ParentsScreen onBack={() => {}} />)

    expect(screen.getByLabelText('Geheime sleutel (OpenRouter)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: L.ocrEngineLocal }))
    expect(screen.queryByLabelText('Geheime sleutel (OpenRouter)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: L.saveSettings }))
    expect(loadSettings(window.localStorage).ocrEngine).toBe('local')
  })

  it('toont cloud-stemvelden bij de cloud-TTS-engine en bewaart die', async () => {
    const user = userEvent.setup()
    render(<ParentsScreen onBack={() => {}} />)

    expect(screen.queryByLabelText(L.cloudModel)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: L.ttsEngineCloud }))
    expect(screen.getByLabelText(L.cloudModel)).toBeInTheDocument()

    await user.clear(screen.getByLabelText(L.cloudModel))
    await user.type(screen.getByLabelText(L.cloudModel), 'elevenlabs/eleven-v3')
    await user.click(screen.getByRole('button', { name: L.saveSettings }))

    const settings = loadSettings(window.localStorage)
    expect(settings.ttsEngine).toBe('cloud')
    expect(settings.cloudModel).toBe('elevenlabs/eleven-v3')
  })
})
