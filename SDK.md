# SDK Integration Guide

## Overview

The Prompt Debug SDK allows you to capture LLM calls from your **production applications** and send them to the debug platform for tracking, analysis, and optimization.

## Installation

### Node.js/TypeScript

Copy `backend/sdk/node.ts` to your project, or install via HTTP:

```bash
# In your project
curl -o prompt-debug-sdk.ts http://localhost:3001/sdk/node.ts
```

### Python

Copy `backend/sdk/python.py` to your project:

```bash
curl -o prompt_debug.py http://localhost:3001/sdk/python.py
```

---

## Usage Examples

### Node.js + OpenAI

```typescript
import OpenAI from 'openai';
import { PromptDebug } from './prompt-debug-sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const debug = new PromptDebug('http://localhost:3001');

async function summarize(text: string) {
  const prompt = `Summarize this text:\n\n${text}`;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  
  const output = completion.choices[0].message.content ?? '';
  
  // Send to debug platform
  await debug.capture({
    agentName: 'ContentProcessor',
    stepName: 'Summarize',
    prompt,
    output,
    input: { originalLength: text.length.toString() },
    promptTokens: completion.usage?.prompt_tokens ?? 0,
    completionTokens: completion.usage?.completion_tokens ?? 0,
  });
  
  return output;
}
```

### Python + OpenAI

```python
import openai
from prompt_debug import PromptDebug

client = openai.OpenAI(api_key="...")
debug = PromptDebug("http://localhost:3001")

def summarize(text: str) -> str:
    prompt = f"Summarize this text:\n\n{text}"
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    
    output = response.choices[0].message.content
    
    # Capture to debug platform
    debug.capture(
        agent_name="ContentProcessor",
        step_name="Summarize",
        prompt=prompt,
        output=output,
        input={"originalLength": str(len(text))},
        prompt_tokens=response.usage.prompt_tokens,
        completion_tokens=response.usage.completion_tokens,
    )
    
    return output
```

---

## Auto-Capture Wrapper

### Node.js

```typescript
const result = await debug.withCapture(
  'MyAgent',
  'GenerateCode',
  promptText,
  async () => {
    const res = await openai.chat.completions.create({...});
    return {
      content: res.choices[0].message.content ?? '',
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
    };
  },
  { language: 'typescript' }
);
```

### Python

```python
result = debug.with_capture(
    agent_name="MyAgent",
    step_name="GenerateCode",
    prompt=prompt_text,
    fn=lambda: call_openai(),
    input={"language": "python"}
)
```

---

## Viewing Captured Runs

1. Open the platform UI: `http://localhost:5173`
2. Go to **Agents** tab → find your agent (e.g., "ContentProcessor")
3. Click into it → see all captured runs from your app
4. View prompts, outputs, costs in the timeline
5. Compare different executions, add ratings/notes

---

## API Endpoint

`POST /api/capture/step`

**Body:**
```json
{
  "agentName": "string",
  "stepName": "string",
  "prompt": "string",
  "output": "string (optional)",
  "input": { "key": "value" },
  "promptTokens": 0,
  "completionTokens": 0,
  "latencyMs": 0,
  "cost": 0.0,
  "status": "completed | failed",
  "errorMessage": "string (optional)",
  "metadata": {}
}
```

**Response:**
```json
{
  "runId": "...",
  "stepRunId": "...",
  "agentId": "..."
}
```

---

## Tips

- **Agent auto-creation**: If agent doesn't exist, SDK creates it automatically
- **Cost tracking**: Platform calculates aggregate cost across all captured calls
- **Filtering**: Use tags in UI to filter by environment (prod/staging), version, etc.
- **Async capture**: SDK calls are fire-and-forget (use try/catch to avoid breaking your app if platform is down)
