# mcp-defuddle

MCP server that wraps [defuddle](https://github.com/kepano/defuddle) to extract clean content and metadata from web pages.

## Features

- **`fetch_and_parse`** — Fetch a URL and extract its main content as Markdown or HTML. No browser required.
- **`parse_html`** — Parse a raw HTML string and extract main content with metadata.
- YouTube transcripts via defuddle's async extractors (`use_async: true`)
- Extracts title, author, published date, description, and cleaned content
- Optional Markdown output (default), language preference, and CSS content selector override

## Installation

```bash
npx @cynosure-mcp/defuddle
```

## Tools

### `fetch_and_parse`

Fetches a URL over HTTP and extracts the main content using defuddle.

| Parameter          | Type    | Default | Description                                      |
| ------------------ | ------- | ------- | ------------------------------------------------ |
| `url`              | string  | —       | URL to fetch and parse                           |
| `markdown`         | boolean | `true`  | Return content as Markdown                       |
| `language`         | string  | —       | Preferred language (BCP 47, e.g. `en`)           |
| `use_async`        | boolean | `true`  | Enable async extractors (YouTube, Twitter, etc.) |
| `content_selector` | string  | —       | CSS selector to override auto-detection          |
| `include_replies`  | boolean | —       | Include reply/comment content                    |

## Development

```bash
npm install
npm run build
npm start
```
