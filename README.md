# ThinkFlow

**Gedanken sprechen. Struktur erhalten.**

ThinkFlow ist eine Voice-to-Structure App, die gesprochene Gedanken mithilfe von KI in strukturierte Ideen, Aufgaben und Projekte verwandelt.

## Features

- **Spracherkennung** - Sprich deine Gedanken einfach aus (Web Speech API)
- **KI-Strukturierung** - Automatische Analyse und Strukturierung durch OpenAI oder Anthropic
- **Lokale Speicherung** - Alle Daten werden lokal im Browser gespeichert
- **40+ Ideen-Bibliothek** - Inspiration durch vorhandene Projektideen
- **Demo-Modus** - Funktioniert auch ohne API Key

## Erste Schritte

### Lokal starten

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### API Key konfigurieren

1. Öffne die App und gehe zu **Einstellungen** (Zahnrad-Symbol)
2. Wähle deinen bevorzugten KI-Anbieter (OpenAI oder Anthropic)
3. Gib deinen API Key ein und klicke auf "Key testen & speichern"

**API Keys bekommst du hier:**
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Anthropic: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

## Deployment auf Vercel

1. Pushe das Repository zu GitHub
2. Importiere das Projekt auf [vercel.com](https://vercel.com)
3. Klicke auf "Deploy"

Keine Umgebungsvariablen erforderlich - API Keys werden vom Benutzer lokal konfiguriert.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Sprache**: TypeScript
- **Spracherkennung**: Web Speech API
- **KI**: OpenAI GPT-4o-mini / Anthropic Claude 3 Haiku
- **Speicherung**: localStorage

## Projektstruktur

```
src/
├── app/
│   ├── page.tsx           # Hauptseite
│   ├── settings/          # Einstellungen
│   └── api/               # API Routes
├── components/            # React Komponenten
├── hooks/                 # Custom Hooks
├── lib/                   # Utilities & Data
└── types/                 # TypeScript Types
```

## Lizenz

MIT
