# TouchDesigner Wiki MCP Server

Ein MCP (Model Context Protocol) Server, der Live-Zugriff auf die [TouchDesigner Dokumentation](https://docs.derivative.ca) ermöglicht.

## Features

- **Wiki-Suche**: Durchsuche die gesamte TouchDesigner-Dokumentation
- **Seiten abrufen**: Hole den vollständigen Inhalt von Wiki-Seiten
- **Operator-Dokumentation**: Schneller Zugriff auf Operator-Dokumentation (CHOP, TOP, SOP, etc.)
- **Kategorien durchsuchen**: Liste alle Seiten in einer Kategorie
- **Operator-Übersicht**: Schnellreferenz für alle Operator-Familien

## Installation

```bash
cd ~/Code/touchdesigner-wiki-mcp
npm install
npm run build
```

## Verwendung

### Mit Claude Code

Füge den Server zu deiner Claude Code Konfiguration hinzu (`~/.claude.json`) — oder nutze die `.mcp.json` im Repo-Root, die den Server bereits registriert:

```json
{
  "mcpServers": {
    "touchdesigner-wiki": {
      "command": "node",
      "args": ["${HOME}/Code/touchdesigner-wiki-mcp/build/index.js"]
    }
  }
}
```

### Mit MCP Inspector

```bash
npm run inspect
```

## Verfügbare Tools

### `search_wiki`
Durchsucht die TouchDesigner-Dokumentation.

```
query: "noise chop"
limit: 10
```

### `get_wiki_page`
Ruft eine spezifische Wiki-Seite ab.

```
title: "Noise TOP"
format: "html" | "wikitext"
```

### `get_operator`
Holt Dokumentation für einen bestimmten Operator.

```
name: "Noise"
type: "CHOP" | "TOP" | "SOP" | "DAT" | "COMP" | "MAT" | "POP" | "auto"
```

### `list_category`
Listet alle Seiten in einer Kategorie.

```
category: "TOPs"
limit: 50
```

### `list_categories`
Zeigt alle verfügbaren Wiki-Kategorien.

### `operator_types`
Gibt eine Übersicht aller TouchDesigner Operator-Familien.

## Entwicklung

```bash
# Development mode (mit tsx)
npm run dev

# Build
npm run build

# Production
npm start
```

## Lizenz

MIT
