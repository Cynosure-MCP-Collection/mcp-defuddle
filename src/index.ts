#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { JSDOM } from 'jsdom';
import { Defuddle } from 'defuddle/node';

// ── MCP Server ─────────────────────────────────────────────────────────────────

const server = new McpServer({
    name: 'Defuddle',
    version: '1.0.0',
    title: 'Defuddle Content Extractor',
    description: 'Extracts clean content and metadata from web pages using defuddle. Supports YouTube transcripts, article extraction, and more.',
    icons: [{ src: 'https://raw.githubusercontent.com/andreasjhagen/Cynosure-MCPs/main/mcp-defuddle/icon.png', mimeType: 'image/png' }],
});

// ── Shared options schema ──────────────────────────────────────────────────────

const sharedOptions = {
    markdown: z.boolean().default(true).describe(
        'Convert content to Markdown (default: true). Set to false to get cleaned HTML instead.'
    ),
    language: z.string().optional().describe(
        'Preferred language in BCP 47 format (e.g. "en", "fr", "ja"). ' +
        'Used for transcript language selection and Accept-Language header.'
    ),
    use_async: z.boolean().default(true).describe(
        'Allow async extractors to fetch from third-party APIs when no local content is available (default: true). ' +
        'Required for YouTube transcripts and other client-side-rendered pages.'
    ),
    content_selector: z.string().optional().describe(
        'CSS selector to use as the main content element, bypassing auto-detection. ' +
        'Falls back to auto-detection if the selector does not match.'
    ),
    include_replies: z.boolean().optional().describe(
        'Include reply/comment content. Defaults to site-specific extractor behaviour.'
    ),
};

// ── Helper: build Defuddle options ─────────────────────────────────────────────

function buildDefuddleOptions(params: {
    markdown: boolean;
    language?: string;
    use_async: boolean;
    content_selector?: string;
    include_replies?: boolean;
}) {
    return {
        markdown: params.markdown,
        ...(params.language ? { language: params.language } : {}),
        useAsync: params.use_async,
        ...(params.content_selector ? { contentSelector: params.content_selector } : {}),
        ...(params.include_replies !== undefined ? { includeReplies: params.include_replies } : {}),
    };
}

// ── Helper: format result ──────────────────────────────────────────────────────

function formatResult(result: Awaited<ReturnType<typeof Defuddle>>, url: string): string {
    const lines: string[] = [];

    if (result.title) lines.push(`# ${result.title}`);
    if (result.author) lines.push(`**Author:** ${result.author}`);
    if (result.published) lines.push(`**Published:** ${result.published}`);
    if (result.site) lines.push(`**Site:** ${result.site}`);
    if (result.description) lines.push(`> ${result.description}`);
    lines.push(`**URL:** ${url}`);
    lines.push('---');
    lines.push(result.content ?? '');

    return lines.join('\n\n');
}

// ── Tool: fetch_and_parse ──────────────────────────────────────────────────────

server.registerTool(
    'fetch_and_parse',
    {
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
        description:
            'Fetch a URL and extract its main content using defuddle. ' +
            'Returns clean text/markdown with metadata (title, author, date, description). ' +
            'Supports async extractors for YouTube transcripts and other JavaScript-heavy pages. ' +
            'Lighter than a full browser — no Playwright/Chromium required.',
        inputSchema: {
            url: z.string().url().describe('The URL to fetch and parse'),
            ...sharedOptions,
        },
    },
    async ({ url, markdown, language, use_async, content_selector, include_replies }) => {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    ...(language ? { 'Accept-Language': language } : {}),
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            const html = await response.text();
            const dom = new JSDOM(html, { url });
            const options = buildDefuddleOptions({ markdown, language, use_async, content_selector, include_replies });
            const result = await Defuddle(dom.window.document, url, options);

            return {
                content: [{ type: 'text' as const, text: formatResult(result, url) }],
            };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [{ type: 'text' as const, text: `Failed to fetch and parse "${url}": ${message}` }],
                isError: true,
            };
        }
    }
);

// ── Start ──────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
