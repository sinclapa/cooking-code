---
title: "Creating an MCP (Model Context Protocol) Server from Scratch"
description: "A step-by-step guide to building your own MCP server so that AI assistants like Claude can interact with tools, APIs, and data sources in a standardised way."
pubDate: "2025-04-22"
heroImage: "/images/mcp-hero.png"
tags: ["MCP", "Claude", "AI", "TypeScript", "tools", "protocol"]
author: "Cooking Code Team"
difficulty: "intermediate"
---

The **Model Context Protocol (MCP)** is an open standard introduced by Anthropic that lets AI models like Claude interact with external tools, data sources, and services through a well-defined interface. Think of it as a universal USB-C port for AI assistants — one connector that works with any compatible peripheral.

In this article we'll build a working MCP server from scratch in TypeScript.

## Why MCP?

Before MCP, every team that wanted to give an AI assistant access to a tool had to write custom integration code — different shapes, different authentication patterns, different error handling. MCP solves this by defining:

- A **transport layer** (stdio or HTTP/SSE)
- A **capability negotiation** handshake
- Standard message types for **tools**, **resources**, and **prompts**

Once you build an MCP-compliant server, any MCP-compatible client (Claude Desktop, Cursor, custom apps) can use it automatically.

## Prerequisites

- Node.js 18+ and npm
- Basic TypeScript knowledge
- A text editor

## Project Setup

```bash
mkdir my-mcp-server
cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
npm install --save-dev typescript @types/node ts-node
```

Add a `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
```

Update `package.json` to set `"type": "module"` and add a build script:

```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## Your First MCP Server

Create `src/index.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 1. Create the server
const server = new McpServer({
  name: 'cooking-code-demo',
  version: '1.0.0',
});

// 2. Register a tool
server.tool(
  'get_recipe',
  'Fetches a simple recipe by dish name',
  {
    dish: z.string().describe('The name of the dish to look up'),
  },
  async ({ dish }) => {
    // In a real server you'd query a database or external API here
    const recipes: Record<string, string> = {
      pasta: 'Boil pasta, sauté garlic in olive oil, toss together, season with salt and parmesan.',
      omelette: 'Beat eggs with salt, cook in buttered pan, fold when set.',
      risotto: 'Toast rice, add hot stock ladle by ladle, stir constantly, finish with butter and parmesan.',
    };

    const recipe = recipes[dish.toLowerCase()];

    if (!recipe) {
      return {
        content: [{ type: 'text', text: `Sorry, I don't have a recipe for "${dish}".` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: `**${dish}**: ${recipe}` }],
    };
  }
);

// 3. Register a resource
server.resource(
  'menu',
  'cooking-code://menu',
  { mimeType: 'text/plain' },
  async () => ({
    contents: [
      {
        uri: 'cooking-code://menu',
        text: 'Available dishes: pasta, omelette, risotto',
      },
    ],
  })
);

// 4. Start listening on stdio
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Understanding the Three Primitives

MCP servers expose three types of capabilities:

### Tools 🔧

Tools are functions the AI can **call** to take actions or retrieve data. They accept typed inputs (validated with Zod schemas) and return content blocks.

```typescript
server.tool('my_tool', 'Description', { param: z.string() }, async ({ param }) => ({
  content: [{ type: 'text', text: `Result for ${param}` }],
}));
```

### Resources 📄

Resources are **data sources** the AI can read — files, database rows, API responses. They're identified by a URI.

```typescript
server.resource('my_resource', 'myapp://data/item', { mimeType: 'application/json' }, async () => ({
  contents: [{ uri: 'myapp://data/item', text: JSON.stringify({ key: 'value' }) }],
}));
```

### Prompts 💬

Prompts are **reusable message templates** the AI can use when interacting with users. They accept arguments and return a structured list of messages.

```typescript
server.prompt('review_code', 'Ask for a code review', { code: z.string() }, ({ code }) => ({
  messages: [{ role: 'user', content: { type: 'text', text: `Please review this code:\n\n${code}` } }],
}));
```

## Connecting to Claude Desktop

Once your server is built (`npm run build`), register it in Claude Desktop's configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cooking-code-demo": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop and you'll see the 🔧 tools icon — your server's tools are now available to Claude.

## Adding Real-World Integrations

Here's a more realistic tool that calls an external REST API:

```typescript
import { z } from 'zod';

server.tool(
  'search_npm',
  'Search npm for packages matching a query',
  {
    query: z.string().describe('Search query'),
    limit: z.number().int().min(1).max(10).default(5).describe('Number of results'),
  },
  async ({ query, limit }) => {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
    const response = await fetch(url);

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `npm search failed: ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json() as { objects: Array<{ package: { name: string; description: string; version: string } }> };

    const results = data.objects.map(
      (o) => `**${o.package.name}** (${o.package.version}): ${o.package.description ?? 'No description'}`
    );

    return {
      content: [{ type: 'text', text: results.join('\n') }],
    };
  }
);
```

## Testing Your Server

You can test an MCP server without a full client by piping JSON-RPC messages on stdin:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0.0.1"}}}' | node dist/index.js
```

Or use the official **MCP Inspector**:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a browser UI where you can browse your server's capabilities and call tools manually — very handy during development.

## Error Handling Best Practices

- Always return `isError: true` in the content response when a tool fails (don't throw unhandled exceptions — they break the transport).
- Use Zod's `.describe()` on every schema field; Claude uses those descriptions to understand what to pass in.
- Keep tool names short, lowercase, and underscore-separated (e.g. `get_user`, `create_ticket`).
- Validate external API responses before returning them to avoid leaking unexpected data.

## What to Build Next

Some ideas for your own MCP servers:

- **GitHub integration** — list issues, create pull requests, read file contents
- **Database explorer** — let Claude query a read-only replica of your database
- **Jira/Linear** — create and update tickets from chat
- **Local file system** — read project files without copy-pasting into the prompt
- **Browser automation** — drive Playwright from a conversation

## Wrapping Up

MCP is still young, but it's already becoming the lingua franca for AI tool integration. By building a compliant server today, you position yourself to connect with any MCP-compatible client — not just Claude. The SDK is well-documented, the protocol is straightforward, and the pay-off (giving an AI real-world agency) is immediate.

Happy cooking! 🍳
