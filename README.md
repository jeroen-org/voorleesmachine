# Voorleesmachine

Een spraakmakende voorlees-app voor kinderen: maak met één grote knop een foto van een boekpagina, en de app leest de tekst voor in het Nederlands.

**Live: [jeroen-org.github.io/voorleesmachine](https://jeroen-org.github.io/voorleesmachine/)**

[![CI](https://github.com/jeroen-org/voorleesmachine/actions/workflows/ci.yml/badge.svg)](https://github.com/jeroen-org/voorleesmachine/actions/workflows/ci.yml)
[![Deploy](https://github.com/jeroen-org/voorleesmachine/actions/workflows/deploy.yml/badge.svg)](https://github.com/jeroen-org/voorleesmachine/actions/workflows/deploy.yml)

![Startscherm van de Voorleesmachine](docs/screenshot-home.png)

## Waarom zo gebouwd

Kinderen zijn de gebruiker. Daarom is de hele UI **icon-only**: geen enkele zichtbare tekst in de kindschermen, alleen grote ronde knoppen (minimaal 64×64 px, in de praktijk veel groter), directe feedback en een "denkende uil" tijdens het verwerken. Elk icoon heeft wél een Nederlandse `aria-label`, voor toegankelijkheid én testbaarheid.

## Wat de app doet

1. **Foto maken** van een boekpagina (achtercamera) of kiezen uit de galerij
2. **Review**: deze pagina houden of opnieuw fotograferen
3. **Denken**: de uil denkt na terwijl de tekst herkend wordt (OCR)
4. **Voorlezen**: met pauze/hervatten, nog-een-keer-luisteren en grote volumeknoppen
5. **Volgende pagina**: één knop om het boek verder te lezen

Bij fouten (geen tekst gevonden, geen internet, camera werkt niet, …) toont de app een icon-only foutmelding met grote herstelknoppen — inclusief een knop om direct de volgende pagina te scannen. Tijdens gebruik blijft het scherm actief (Screen Wake Lock).

### Voor volwassenen: het tandwiel

Linksboven op het startscherm staat een semi-transparant tandwiel. Eén tik erop opent het verborgen instellingenmenu (de pagina is scrollbaar als de inhoud niet past). Daarin kies je de OCR-engine: **OpenRouter** (met API-sleutel en AI-model) of **lokaal** (Tesseract.js, volledig op het toestel zonder internet of sleutel). Ook kies je de voorleesstem: **lokaal** (de stemmen van het toestel) of **cloud** (OpenRouter, standaard `google/gemini-2.5-pro-tts`, met dezelfde API-sleutel). De OpenRouter-sleutel staat uitsluitend in de localStorage van het toestel en wordt alleen naar OpenRouter gestuurd bij het herkennen of voorlezen van een pagina.

## Onder de motorkap

| Onderdeel | Technologie |
|---|---|
| Camera | Web `getUserMedia`, achtercamera, frame via canvas (max. 1600 px JPEG) |
| Tekstherkenning | [OpenRouter](https://openrouter.ai) (standaard `google/gemini-2.5-flash`) met "verzin niets"-regel en `GEEN_TEKST`-sentinel tegen hallucinaties, of volledig lokaal via [Tesseract.js](https://github.com/naptha/tesseract.js) (taal `nld`) — keuze in het ouders-menu |
| Voorlezen | Web Speech API (`speechSynthesis`), Nederlandse stem, tekst in stukken per alinea/zin; of cloud-stem via [OpenRouter](https://openrouter.ai) (`google/gemini-2.5-pro-tts`) — keuze in het ouders-menu |
| PWA | Manifest, service worker met offline-shell, installeerbaar op Android |
| Framework | React 19 + TypeScript (strict) + Vite |

Alle services zitten achter interfaces (`src/services/`) met mocks (`src/services/mock/`): de volledige app is testbaar zonder camera, microfoon of internet. De pipeline (foto → OCR → voorlezen) staat in een pure state machine (`src/domain/state.ts`), unit-getest.

## Snel starten

Vereist: Node.js ≥ 20.19.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`. Voor de echte camera vanaf een ander toestel in het netwerk:

```bash
npm run dev:https
```

Open `https://<LAN-IP>:5173/` en accepteer het zelfgesigned certificaat (camera en service worker eisen https).

**PowerShell-gebruikers:** gebruik `npm.cmd` in plaats van `npm` (de execution policy blokkeert `npm.ps1`).

### Zonder camera of internet testen

Met `?mock=1` draait de app volledig op mocks: nep-boekpagina, standaardverhaal, gesimuleerd voorlezen. Extra varianten: `?mock=1&ocr=empty` (geen tekst gevonden) en `?mock=1&ocr=fail` (OCR faalt).

## Tests

```bash
npm run lint        # ESLint
npm run typecheck   # tsc -b
npm test            # 76 Vitest unit tests
npm run e2e         # Playwright e2e (draait op poort 5178 met ?mock=1)
```

Eénmalig voor e2e: `npx playwright install chromium`. CI draait alles bij elke push.

## Deployment

Elke push naar `main` bouwt en deployt automatisch naar GitHub Pages via `.github/workflows/deploy.yml` (build met `--base=/voorleesmachine/`). Alle verwijzingen naar statische assets zijn relatief, zodat de site op het Pages-subpad werkt.

## Privacy

- Foto's worden **alleen in het geheugen verwerkt** en nooit opgeslagen. Bij de OpenRouter-engine wordt de foto als data-URL naar OpenRouter gestuurd voor de tekstherkenning; bij de lokale engine (Tesseract.js) verlaat de foto het toestel nooit.
- Geen accounts, geen analytics, geen tracking.
- De API-sleutel staat lokaal in `localStorage` en verlaat het toestel alleen richting OpenRouter (en alleen bij de OpenRouter-engine).

## Projectdocumentatie

- [`AGENTS.md`](AGENTS.md) — werkafspraken voor coding agents (commands, conventies, commit-identiteit)
- [`plan.md`](plan.md) — gemaakte keuzes, uitgevoerde stappen en vervolgstappen

## Licentie

Nog geen opensource-licentie toegekend — persoonlijk project.
