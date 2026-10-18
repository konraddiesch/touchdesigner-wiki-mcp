# Agents.md

## Project structure

```
src/
  index.ts       — McpServer setup, 6 tools (search_wiki, get_wiki_page, get_operator, list_category, list_categories, operator_types)
  wiki-client.ts — MediaWiki API + HTML scraping of docs.derivative.ca
build/           — tsc output (committed, production entrypoint)
```

TypeScript, ESM (`"type": "module"`), no test/lint infrastructure.

## Commands

```sh
npm install        # install deps
npm run build      # tsc, outputs to build/
npm run dev        # tsx src/index.ts (hot-reload)
npm start          # node build/index.js (production)
npm run inspect    # npx @anthropics/inspector tsx src/index.ts
```

## Key facts

- **No API key needed** — scrapes https://docs.derivative.ca via MediaWiki API + HTML parsing.
- **No tests, no linter** — none configured.
- **`.mcp.json`** at root defines `touchdesigner-wiki` for Claude Desktop/IDE.
- **`.claude/settings.local.json`** has pre-approved permissions for all tools + `docs.derivative.ca` domain.
- Tools use `zod` schemas inline; `server.tool(name, description, schema, handler)` pattern.
- Error responses return `{ content: [...], isError: true }`.