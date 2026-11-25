# Plan — Voorleesmachine

Dit document beschrijft de gemaakte keuzes, de uitgevoerde stappen (met commits) en de vervolgstappen. Werk het bij wanneer stappen voltooid worden of nieuwe besluiten vallen.

## Gemaakte keuzes

| Onderwerp | Keuze | Motivatie |
|---|---|---|
| Platform | PWA (React + Vite + TypeScript) eerst | Beste testbaarheid (Vitest + Playwright), werkt direct in de browser; Android via Capacitor als latere stap |
| OCR | Standaard AI via OpenRouter (`google/gemini-2.5-flash`), of volledig lokaal via Tesseract.js (`nld`) — keuze in het ouders-menu | OpenRouter geeft zeer goede NL-kwaliteit en filtert paginanummers/bijschriften; lokale engine werkt zonder internet of sleutel en houdt foto's op het toestel |
| TTS | Web Speech API (lokaal) of OpenRouter-cloud-stem (`google/gemini-2.5-pro-tts`) — keuze in het ouders-menu | Lokaal is gratis/offline; cloud geeft natuurlijke intonatie met dezelfde OpenRouter-sleutel |
| Taal | Alleen Nederlands | Kleinste scope, Nederlandstalige boeken |
| Privacy | Foto's alleen in het geheugen, nooit bewaard | Doelgroep is kinderen (AVG-gevoelig) |

## Uitgevoerde stappen

| # | Stap | Commit | Resultaat | Verificatie |
|---|---|---|---|---|
| 1 | Scaffold | `7876141`, `f7d0ce9` | Vite + React + TS, ESLint/Prettier, Vitest, Playwright-config, CI-workflow, AGENTS.md | lint/typecheck/test groen |
| 2 | Domeinlaag | `f158631` | `appReducer` state machine (6 schermen), interfaces `ICamera`/`IOcr`/`ITts`, mocks, tekstvalidatie, foutmapping, `abortableDelay` | 33 unit tests |
| 3 | UI-schermen op mocks | `2134330` | 6 icon-only schermen, SVG-iconenset, Nederlandse labels, denk-uil-animatie, volume-stippen, `HoldToOpenButton`, `useVoorlees`-hook, galerij-input | Integratietests over de hele flow |
| 4 | Echte camera | `f7f481f` | `browserCamera.ts`: `getUserMedia` met achtercamera, wachten op eerste beeld, frame → canvas (max. 1600px JPEG), review-stap | Unit tests + flow-tests |
| 5 | OCR via OpenRouter + ouders-menu | `7fae650` | `openrouterOcr.ts` met cleanup-prompt, timeout, foutcodes (`no-api-key`/`no-internet`/`timeout`/`failed`); settings in localStorage (`voorleesmachine:settings`); ouders-scherm met sleutel + model | 16 extra tests (service, settings, scherm) |
| 6 | TTS via Web Speech API | `93f69fa` | `webSpeechTts.ts`: nl-NL-stemkeuze, chunking per alinea/zin (max. ~200 tekens), pauze/hervatten, volume-herstart huidig stuk, generation-guard tegen late events | 9 tests met nep-synthesizer |
| 7 | Foutafhandeling + herkansing | `93fed58` | Automatische tweede poging bij leeg OCR-resultaat; foutpictogrammen per foutcode met herstelknop | Extra flow-test (retry wordt aangeroepen) |
| 8 | PWA | `9f7e7eb` | Manifest, 4 PWA-iconen via `scripts/make-icons.ps1` (GDI+), handgeschreven `sw.js` met offline-shell, registratie in `main.tsx`, meta-tags | Build bevat alle assets |
| 9 | E2E + CI | `726d0e8` | 3 Playwright-tests op `?mock=1` (happy flow, geen-tekst-foutpad, PWA-checks); Vitest sluit `e2e/` uit | E2E groen in Chromium |
| 10 | Documentatie | `0571171` | AGENTS.md uitgebreid (commands, services, tandwiel) | — |
| 11 | Dev server op LAN | `0b48bb0`+ | `server.host: true` en `preview.host: true`; app bereikbaar op `http://<LAN-IP>:5173` (bijv. vanaf een gsm) | HTTP 200 op localhost én LAN-IP |
| 12 | HTTPS voor dev over LAN | — | `npm run dev:https` met `@vitejs/plugin-basic-ssl` (expliciet goedgekeurd): echte camera werkt op `https://<LAN-IP>:5173` na accepteren van het certificaat; e2e draait nog steeds http | HTTPS 200 op localhost én LAN-IP, http geweigerd; lint/typecheck/test/e2e groen |
| 13 | Zwart camerabeeld fix | `a855f65` | Opgelost: StrictMode startte de camera dubbel; oude aanvraag wiste de live stream. Nu annuleert elke `open()` de vorige op hetzelfde video-element en wist `close()` alleen de eigen stream | 2 nieuwe unit tests voor beide race-scenario's |
| 14 | TTS-foutstate, tandwiel, wake lock | `322a607` | `ttsState: 'failed'` met luidspreker-fout-icoon op het leesscherm (echte synthesefouten waren eerder onzichtbaar); `GearIcon` nu echt tandwiel; Screen Wake Lock API houdt het scherm aan zolang de app open is (met herhaalaanvraag bij zichtbaar worden); e2e kreeg eigen poort 5178 (geen conflict meer met de dev-server) | 72 unit tests + 3 e2e groen |
| 15 | Volgende-pagina op foutscherm | — | Verduidelijking van stap 14: de volgende-pagina-knop hoort op het **OCR-foutscherm** (o.a. "geen tekst gevonden"). ErrorScreen toont nu onder "Probeer opnieuw" ook de oranje volgende-pagina-knop (uitgezonderd camerafouten); het TTS-fouticoon blijft apart bestaan | unit- + e2e-test: foutscherm → volgende pagina → camera |
| 16 | Anti-hallucinatie OCR | `a3c6a8b` | Oorzaak: foto zonder tekst (bijv. plafond) + prompt die een boekpagina met tekst veronderstelde → Gemini verzon een berenverhaal. Fix: prompt vereist letterlijke tekst ("Verzin niets") en `GEEN_TEKST`-sentinel bij geen leesbare tekst; sentinel wordt in de service tot een lege string gemapt → bestaande herkansing + "geen tekst gevonden"-foutflow (met volgende-pagina-knop) | 4 nieuwe unit tests (sentinel-varianten, leeg antwoord, echte tekst met "Geen..."-begin passeert) |
| 17 | Tandwiel-icoon symmetrisch | `d0d9e9a` | `GearIcon` was met de hand overgeschreven en stond scheef. Nu wordt het tandwielpad wiskundig opgebouwd (8 tanden, boogsegmenten rond exact het middelpunt) en visueel geverifieerd met een Playwright-screenshot op drie groottes | lint/typecheck/test groen; screenshot-check |
| 18 | GitHub Pages deployment | `4c371de` | Subpad-bestendig gemaakt (service worker, manifest, index.html: relatieve paden), deploy-workflow met `--base=/voorleesmachine/`, site op https://jeroen-org.github.io/voorleesmachine/ | build-check: subpad-referenties correct in `dist/`; live URL 200 + sw.js/manifest bereikbaar; Deploy-run `success` |
| 19 | Commit-identiteit vastgelegd | `31c26eb` | AGENTS.md: agent commit altijd als `Voorleesmachine <dev@voorleesmachine.local>`; menselijke commits blijven `jeroenvdw` | — |
| 20 | README | — | README.md met live-URL, badges, screenshot van de live site (`docs/screenshot-home.png`), uitleg, commands, tests, deployment en privacy | — |
| 21 | Lokale OCR-engine (Tesseract.js) | — | `tesseractOcr.ts` (IOcr) met hergebruikte worker, `nld` via CDN, cleanup van paginanummers/lege regels, timeout 90 s; `ocrEngine`-instelling (`openrouter` standaard / `local`); `createServices()` kiest de engine; ouders-menu met engine-toggle en verborgen sleutel/modelvelden bij `local` | lint/typecheck/build groen; 87 unit tests |
| 22 | Natuurlijkere TTS + cloud-stem | — | Chunker-fix (zinnen over regeleindes samenvoegen, woordafbreking, whitespace, clause-fallback); OCR-prompt vult ontbrekende leestekens aan; `ttsEngine`-instelling (`local`/`cloud`), lokale stemkeuze + betere stemheuristiek, cloud-stem via OpenRouter `/api/v1/audio/speech` (`openRouterTts.ts`, standaard `google/gemini-2.5-pro-tts`) met dezelfde sleutel | lint/typecheck/build groen; 102 unit tests |

### Actuele status

- Happy path werkt volledig op mocks (`?mock=1`) én met echte camera + OpenRouter + Web Speech; eerste gesproken woord binnen ~8 s na de foto.
- OCR draait standaard via OpenRouter; in het ouders-menu is ook een volledig lokale Tesseract.js-engine (`nld`) te kiezen die zonder internet of sleutel werkt.
- TTS draait standaard lokaal (Web Speech); in het ouders-menu is ook een OpenRouter-cloud-stem (`google/gemini-2.5-pro-tts`) te kiezen, met dezelfde API-sleutel. De chunker voegt zinnen over regeleindes samen zodat de stem niet midden in een zin pauzeert.
- 102 unit tests en 3 e2e-tests slagen; `lint`, `typecheck` en `build` zijn foutloos.
- CI (GitHub Actions) draait lint, typecheck, unit tests en e2e op elke push.
- Voor de OpenRouter-engine is een geldige API-key in het ouders-menu nodig; zonder key toont de app de sleutel-foutstate. De lokale engine heeft dat niet nodig.

## Vervolgstappen

Volgorde op volgorde van nut; elke stap = eigen commit met groene tests.

### Fase A — direct bruikbaar maken (P1)

1. **E2E met echte foto-fixtures**: gebruik echte foto's van kinderboekpagina's als testfixtures (bijv. `e2e/fixtures/`) en test de OpenRouter-integratie tegen een opgenomen API-respons (gestubde `fetch`), zodat prompt-wijzigingen regressietesten krijgen.
   - DoD: fixture-driven test groen; OCR-prompt versiebeheer.
2. **Hosting + installatie-ervaring**: deploy `dist/` naar gratis hosting (GitHub Pages/Netlify), test "installeren" op Android Chrome, check manifest/iconen via Lighthouse.
   - DoD: publieke URL waarop de app geïnstalleerd kan worden; Lighthouse PWA-audit groen.
3. **Veldtest met een kind en een echt boek**: controleer foto-hoek, belichting, volumegedrag en of de denk-animatie lang genoeg/kort genoeg voelt; noteer verbeterpunten.
   - DoD: lijstje bevindingen → mini-stapjes in deze lijst.

### Fase B — lees-ervaring (P2)

4. **Boekmodus (FR14)**: na afloop van een pagina direct terug naar de camera (al openstaan), zodat een boek pagina voor pagina voorgelezen wordt zonder menu's.
   - DoD: flow-test in e2e; toggle in ouders-menu.
5. **Laatste positie onthouden (FR15)**: laatst gelezen pagina/tekst lokaal bewaren en aanbieden bij de start.
   - DoD: unit tests + e2e.
6. **Voorleessnelheid instelbaar** in het ouders-menu (rate van de TTS, standaard 0.95).
   - DoD: instelling zichtbaar in `ITts.speak` en getest.
7. **Cloud-stem als optie (P2)**: ✅ gedaan (stap 22) — OpenRouter-cloud-TTS (`google/gemini-2.5-pro-tts`) als keuze in het ouders-menu, met dezelfde API-sleutel. Vervolg: rate/pitch-instellingen voor de lokale stem.

### Fase C — robuustheid (P2)

8. **Tesseract.js als offline-OCR-fallback**: ✅ gedaan (stap 21) — lokale `nld`-engine is nu een keuze in het ouders-menu. Vervolg: automatische fallback bij `no-internet`/ontbrekende sleutel en lazy-load van de worker.
9. **Cloudflare Worker-proxy voor de API-key** (gratis tier): server-side key, browser stuurt geen geheim meer mee; ouders-menu krijgt proxy-URL-instelling.
   - DoD: OCR werkt via proxy; huidige key-pad blijft als alternatief werken.
10. **Capacitor Android-build**: `@capacitor/core`/`cli`/`android` (expliciete goedkeuring nodig volgens AGENTS.md), APK-build, native camera/TTS-check; eventueel ML Kit-OCR-plugin als snelle on-device optie.
    - DoD: installeerbare APK; web-versie blijft ongewijzigd werken.

### Fase D — fijne kantjes (P3)

11. Betere foutdiagnose bij wazige foto's (scherpte-metric lokaal) met gerichte hint.
12. Meerdere pagina's achter elkaar laten inspreken (wachtrij) vóór het maken van de volgende foto.
13. Meertaligheid (NL+EN) als ouders-instelling, met taalstem per OCR-resultaat.
14. Periodieke `npm audit`-taak in CI en Dependabot/renovate-configuratie.

## Niet gepland (bewust)

- Geen accounts, geen analytics/tracking op kindschermen, geen tekstlabels in kind-schermen, geen extra dependencies zonder expliciete opdracht.
