# Step 配置功能说明

## 概述

现在每个 Step 都可以独立配置模型和参数，让你像图中所示的 workflow 工具一样灵活定制自己的 Agent。

## 新增功能

### 1. 每个 Step 独立的模型配置

每个 Step 现在支持以下配置：

- **模型 (Model)**: 选择使用的 LLM 模型
  - GPT-4o Mini (默认)
  - GPT-4o
  - GPT-4 Turbo
  - GPT-3.5 Turbo

- **Temperature**: 控制输出的随机性 (0-2)
  - 默认值: 0.7
  - 越低越确定，越高越创意

- **Max Tokens**: 限制输出的最大 token 数 (可选)
  - 留空表示使用模型默认值

### 2. 高级配置面板

在 Agent 编辑页面，每个 Step 卡片右上角有"高级配置"按钮：

1. **点击"高级配置"** - 展开配置面板
2. **配置参数** - 设置模型、Temperature、Max Tokens
3. **点击"隐藏配置"** - 收起面板

### 3. 运行时记录

每次运行会记录每个 Step 实际使用的配置：

- 在 Run 详情页的左侧 Step 列表中，会显示每个 Step 使用的：
  - 模型名称 (如 `gpt-4o-mini`)
  - Temperature 值 (如 `T=0.7`)
  - Max Tokens 限制 (如果设置)

## 使用场景

### 场景 1: 混合模型策略

```
Step 1 (需求理解) → GPT-4o (更智能)
Step 2 (初稿生成) → GPT-4o Mini (快速且便宜)
Step 3 (润色优化) → GPT-4 Turbo (高质量)
```

### 场景 2: Temperature 控制

```
Step 1 (数据分析) → Temperature 0.3 (精确)
Step 2 (创意文案) → Temperature 1.2 (创意)
Step 3 (总结输出) → Temperature 0.5 (平衡)
```

### 场景 3: Token 预算控制

```
Step 1 (提取关键词) → Max Tokens 50
Step 2 (详细说明) → Max Tokens 500
Step 3 (简短总结) → Max Tokens 100
```

## 数据库变更

已自动应用以下数据库变更：

1. `Step` 表新增字段:
   - `model` - 存储模型名称
   - `temperature` - 存储温度参数
   - `max_tokens` - 存储 token 限制
   - `config` - JSON 字段，用于未来扩展

2. `StepRun` 表新增字段:
   - `model` - 记录实际运行使用的模型
   - `temperature` - 记录实际使用的温度
   - `max_tokens` - 记录实际使用的 token 限制

## API 变更

### 创建/更新 Agent

```typescript
// POST /api/agents
{
  "name": "My Agent",
  "steps": [
    {
      "name": "Step 1",
      "promptTemplate": "Hello {{name}}",
      "model": "gpt-4o",              // 可选，默认 gpt-4o-mini
      "temperature": 0.8,              // 可选，默认 0.7
      "maxTokens": 1000                // 可选
    }
  ]
}
```

### Run 返回数据

```typescript
{
  "stepRuns": [
    {
      "step": { "name": "Step 1" },
      "model": "gpt-4o",
      "temperature": 0.8,
      "maxTokens": 1000,
      "output": "..."
    }
  ]
}
```

## 成本优化建议

1. **第一步用强模型理解需求**
   - 使用 GPT-4o 确保理解准确

2. **中间步骤用轻量模型**
   - 使用 GPT-4o Mini 处理常规任务

3. **最后一步再用强模型把关**
   - 使用 GPT-4 Turbo 确保输出质量

这样可以在保证质量的同时，显著降低成本！

## 下一步

现在你可以：

1. ✅ 为不同 Step 选择不同模型
2. ✅ 调整 Temperature 控制输出风格
3. ✅ 设置 Max Tokens 控制成本
4. ✅ 在 Run 详情中查看实际使用的配置

这让你的 workflow 更加灵活和可控！
