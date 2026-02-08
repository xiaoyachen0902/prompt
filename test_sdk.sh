#!/bin/bash
# Test SDK and new features

echo "🔧 Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!
sleep 5

echo "🧪 Testing SDK capture endpoint..."
curl -X POST http://localhost:3001/api/capture/step \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "TestAgent",
    "stepName": "HelloWorld",
    "prompt": "Say hello",
    "output": "Hello world!",
    "promptTokens": 5,
    "completionTokens": 3,
    "latencyMs": 200,
    "status": "completed"
  }'

echo ""
echo "✅ SDK test complete!"
echo "📊 Check the UI at http://localhost:5173 to see the captured run"
echo ""
echo "🛑 Press Ctrl+C to stop backend (PID: $BACKEND_PID)"
wait $BACKEND_PID
