#!/bin/bash
# 自动化测试脚本 - 快速验证核心功能

set -e  # 遇到错误立即退出

echo "🚀 开始自动化测试..."
echo ""

BASE_URL="http://localhost:3001"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
PASSED=0
FAILED=0

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "测试: $name ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" -w "\n%{http_code}")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" \
            -w "\n%{http_code}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        PASSED=$((PASSED + 1))
        echo "$body"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code)"
        echo "$body"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 测试 1: 检查后端健康状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_api "获取 Agent 列表" "GET" "/api/agents" || true
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 测试 2: 创建 Agent"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
AGENT_DATA='{
  "name": "自动测试Agent",
  "steps": [
    {
      "name": "Step 1",
      "promptTemplate": "Say hello to {{name}}"
    },
    {
      "name": "Step 2",
      "promptTemplate": "Summarize the greeting: {{Step 1}}"
    }
  ]
}'

AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/agents" \
    -H "Content-Type: application/json" \
    -d "$AGENT_DATA")

AGENT_ID=$(echo $AGENT_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$AGENT_ID" ]; then
    echo -e "${RED}✗ 创建 Agent 失败${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "${GREEN}✓ 创建 Agent 成功${NC}"
    echo "Agent ID: $AGENT_ID"
    PASSED=$((PASSED + 1))
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔌 测试 3: SDK Capture 端点"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CAPTURE_DATA='{
  "agentName": "SDK测试Agent",
  "stepName": "测试步骤",
  "prompt": "这是一个测试提示词",
  "output": "这是测试输出",
  "input": {
    "test": "true",
    "timestamp": "2026-02-07"
  },
  "promptTokens": 10,
  "completionTokens": 15,
  "latencyMs": 500,
  "cost": 0.00001,
  "status": "completed"
}'

test_api "SDK Capture" "POST" "/api/capture/step" "$CAPTURE_DATA"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试 4: Dataset 功能"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -z "$AGENT_ID" ]; then
    DATASET_DATA="{
      \"agentId\": \"$AGENT_ID\",
      \"name\": \"自动测试Dataset\",
      \"cases\": [
        {\"name\": \"Alice\"},
        {\"name\": \"Bob\"},
        {\"name\": \"Charlie\"}
      ]
    }"
    
    DATASET_RESPONSE=$(curl -s -X POST "$BASE_URL/api/datasets" \
        -H "Content-Type: application/json" \
        -d "$DATASET_DATA")
    
    DATASET_ID=$(echo $DATASET_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ -z "$DATASET_ID" ]; then
        echo -e "${RED}✗ 创建 Dataset 失败${NC}"
        FAILED=$((FAILED + 1))
    else
        echo -e "${GREEN}✓ 创建 Dataset 成功${NC}"
        echo "Dataset ID: $DATASET_ID"
        PASSED=$((PASSED + 1))
    fi
else
    echo -e "${YELLOW}⚠ 跳过 Dataset 测试（需要 Agent ID）${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 测试 5: 获取数据"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
test_api "获取所有 Agents" "GET" "/api/agents" || true
echo ""
test_api "获取所有 Runs" "GET" "/api/runs" || true
echo ""

if [ ! -z "$AGENT_ID" ]; then
    test_api "获取指定 Agent" "GET" "/api/agents/$AGENT_ID" || true
    echo ""
fi

if [ ! -z "$DATASET_ID" ]; then
    test_api "获取指定 Dataset" "GET" "/api/datasets/$DATASET_ID" || true
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧹 测试 6: 清理测试数据"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -z "$DATASET_ID" ]; then
    test_api "删除 Dataset" "DELETE" "/api/datasets/$DATASET_ID" || true
    echo ""
fi

if [ ! -z "$AGENT_ID" ]; then
    test_api "删除 Agent" "DELETE" "/api/agents/$AGENT_ID" || true
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 测试结果总结"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo "总计: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}❌ 有 $FAILED 个测试失败${NC}"
    exit 1
fi
