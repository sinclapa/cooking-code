---
title: "Getting Started with Claude: An AI That Cooks Up Conversations"
description: "A hands-on look at Claude, Anthropic's AI assistant, and how developers can put it to work in real projects."
pubDate: "2025-04-20"
heroImage: "/images/claude-hero.png"
tags: ["AI", "Claude", "Anthropic", "LLM", "productivity"]
author: "Cooking Code Team"
---

If you've been exploring the AI landscape lately, you've probably stumbled across **Claude** — Anthropic's conversational AI assistant. I spent a few weeks cooking up projects with it and wanted to share what I've learned.

## What Is Claude?

Claude is a large language model (LLM) built by [Anthropic](https://www.anthropic.com/). Unlike some AI systems that try to do everything at once, Claude is designed with **safety and helpfulness** in mind from the ground up. The result? An AI that's genuinely pleasant to work with, understands context deeply, and is surprisingly good at nuanced reasoning.

At the time of writing, the flagship model is **Claude 3.5 Sonnet**, with Claude 3 Opus available for heavier tasks and Claude 3 Haiku for fast, lightweight work.

## Setting Up the API

Getting started with the Claude API is refreshingly straightforward.

### 1. Create an Anthropic Account

Head over to [console.anthropic.com](https://console.anthropic.com/) and sign up. Once your account is active, navigate to **API Keys** and generate a new key.

### 2. Install the SDK

```bash
npm install @anthropic-ai/sdk
```

### 3. Your First Request

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const message = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'Explain the concept of recursion as if I were a chef.',
    },
  ],
});

console.log(message.content[0].text);
```

Run it and you'll get something like:

> _"Imagine you're writing a recipe for a Russian nesting doll cake. To make the outer cake, you need to first make a smaller cake to put inside it. To make that smaller cake, you need an even smaller cake inside it — and so on, until you reach the tiny innermost cake that needs no filling. That smallest cake is your **base case**. Once you've made it, you can work your way back out, stacking cake inside cake, until the whole dessert is assembled. That's recursion: a process that calls itself, getting simpler each time, until it hits the base case and unwinds."_

## What Makes Claude Different?

### Long Context Window

Claude 3.5 Sonnet supports a **200,000-token context window** — that's roughly 150,000 words. You can drop in an entire codebase, a book, or a lengthy research paper and ask questions about the whole thing.

### Constitutional AI

Anthropic trains Claude using a technique called [Constitutional AI (CAI)](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback). Rather than relying solely on human feedback to steer the model's behavior, CAI provides the model with a set of principles — a "constitution" — that it uses to critique and revise its own outputs. The practical result is a model that's less likely to produce harmful content and more consistent in its helpfulness.

### Extended Thinking

Claude's latest models support **extended thinking** — a mode where the model reasons through a problem step-by-step before giving its final answer. You can enable it with:

```typescript
const message = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 16000,
  thinking: {
    type: 'enabled',
    budget_tokens: 10000,
  },
  messages: [{ role: 'user', content: 'What is the best strategy for a chess endgame with a king and rook vs. a lone king?' }],
});
```

## Practical Use Cases

Here are a few recipes (see what I did there?) I've been enjoying:

| Use Case | Why Claude Excels |
|---|---|
| **Code review** | Understands large diffs in context; catches subtle logic errors |
| **Documentation writing** | Clear, well-structured prose that matches your project's tone |
| **Data extraction** | Parse messy text or HTML into structured JSON reliably |
| **Summarisation** | Handles long documents with precision, not hallucination |
| **Test generation** | Writes meaningful test cases, including edge cases |

## Tips for Better Results

1. **Be specific in your system prompt.** Tell Claude exactly who it is and what format you want back.
2. **Use XML tags for structured input.** Claude is trained to handle `<context>`, `<instructions>`, and `<example>` tags well.
3. **Prefer explicit over implicit.** Don't say "clean up this code"; say "refactor this function to remove duplication and add JSDoc comments."
4. **Iterate.** If the first response isn't quite right, don't start over — just ask Claude to refine it.

## Wrapping Up

Claude is a serious contender in the AI assistant space, and the developer experience around the API is polished and easy to get started with. Whether you're building a chatbot, a coding assistant, or a document-processing pipeline, it's worth adding to your toolkit.

In future posts, we'll explore how to pair Claude with **tool use** and **MCP (Model Context Protocol)** to give it access to real-world data and actions. Stay tuned!
