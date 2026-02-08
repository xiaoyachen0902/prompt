# SDK Usage Example

## Quick Test

### Node.js/TypeScript

```typescript
// example.ts
import { PromptDebug } from './backend/sdk/node';

const debug = new PromptDebug('http://localhost:3001');

await debug.capture({
  agentName: 'TestAgent',
  stepName: 'HelloWorld',
  prompt: 'Say hello in 10 words',
  output: 'Hello! How can I assist you today?',
  promptTokens: 10,
  completionTokens: 8,
  latencyMs: 300,
  cost: 0.00005,
  status: 'completed',
});

console.log('✅ Captured! Check UI: http://localhost:5173');
```

### Python

```python
# example.py
from backend.sdk.python import PromptDebug

debug = PromptDebug("http://localhost:3001")

debug.capture(
    agent_name="TestAgent",
    step_name="HelloWorld",
    prompt="Say hello in 10 words",
    output="Hello! How can I assist you today?",
    prompt_tokens=10,
    completion_tokens=8,
    latency_ms=300,
    cost=0.00005,
    status="completed",
)

print("✅ Captured! Check UI: http://localhost:5173")
```

## Production Integration

### With OpenAI SDK (Node.js)

```typescript
import OpenAI from 'openai';
import { PromptDebug } from './sdk/node';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const debug = new PromptDebug('http://localhost:3001');

async function generateCode(description: string) {
  const prompt = `Generate TypeScript code for: ${description}`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  
  const code = response.choices[0].message.content ?? '';
  
  // Capture to debug platform
  await debug.capture({
    agentName: 'CodeGenerator',
    stepName: 'Generate',
    prompt,
    output: code,
    input: { description },
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    status: 'completed',
  });
  
  return code;
}

// Use it
const code = await generateCode('a React button component');
console.log(code);
```

### With LangChain (Python)

```python
from langchain.chat_models import ChatOpenAI
from prompt_debug import PromptDebug

llm = ChatOpenAI(model="gpt-4o-mini")
debug = PromptDebug("http://localhost:3001")

def chat_with_capture(prompt: str) -> str:
    response = llm.predict(prompt)
    
    debug.capture(
        agent_name="LangChainAgent",
        step_name="Chat",
        prompt=prompt,
        output=response,
        status="completed",
    )
    
    return response
```

## Dataset Batch Run Example

### Create Dataset via API

```bash
curl -X POST http://localhost:3001/api/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "your-agent-id",
    "name": "Test Cases - Product Descriptions",
    "cases": [
      {"product": "headphones", "tone": "professional"},
      {"product": "coffee maker", "tone": "casual"},
      {"product": "laptop", "tone": "technical"}
    ]
  }'
```

### Run Batch

```bash
curl -X POST http://localhost:3001/api/datasets/{dataset-id}/batch-run
```

This will:
1. Run your agent on all 3 cases
2. Create 3 separate runs
3. Return all run IDs
4. View results in UI grouped by dataset

## Viewing Results

1. Open `http://localhost:5173`
2. Go to **Agents** tab
3. Find your agent (e.g., "TestAgent", "CodeGenerator")
4. Click to see all runs
5. Compare runs, add ratings/notes
6. Export or share specific runs

## Next Steps

- Add more test cases to your dataset
- Set up automated batch runs in CI/CD
- Use tags to filter by environment (prod/dev/staging)
- Compare prompt versions over time
