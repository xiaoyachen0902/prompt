# 从 Demo 到生产级工具 Migration Guide

## 🎯 三大问题已解决

### 1. ✅ 外部接入 (SDK Integration)

**问题：** 只能在平台内跑 Agent，无法追踪外部项目的 LLM 调用

**解决方案：**
- 添加了 `POST /api/capture/step` 端点
- 提供 Node.js 和 Python SDK（`backend/sdk/`）
- 支持自动创建 Agent 和 Step
- Fire-and-forget 设计，不阻塞主流程

**使用方式：**
```typescript
import { PromptDebug } from './sdk/node';
const debug = new PromptDebug('http://localhost:3001');

// 在你的 OpenAI 调用后
await debug.capture({
  agentName: 'MyApp',
  stepName: 'Summarize',
  prompt: promptText,
  output: response.choices[0].message.content,
  promptTokens: response.usage.prompt_tokens,
  completionTokens: response.usage.completion_tokens,
});
```

**查看结果：** UI 中会自动出现 "MyApp" Agent 和所有捕获的运行记录

---

### 2. ✅ 评测/回归机制 (Dataset + Batch Run)

**问题：** 只能看单次输出，无法回答：
- 哪个 prompt 版本更好？
- 改动是否回归？
- 在一组输入上整体表现如何？

**解决方案：**
- 新增 `Dataset` 模型：存储测试用例集合
- 新增 `batch-run` 端点：一键在所有用例上运行 Agent
- Run 表添加 `datasetId` 和 `caseIndex` 关联

**使用方式：**

1. **创建 Dataset:**
```bash
curl -X POST http://localhost:3001/api/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "cmlc4kcfo000013ro7fk8jw4n",
    "name": "Product Description Test Cases",
    "cases": [
      {"product": "headphones", "tone": "professional"},
      {"product": "coffee maker", "tone": "casual"},
      {"product": "laptop", "tone": "technical"}
    ]
  }'
```

2. **批量运行:**
```bash
curl -X POST http://localhost:3001/api/datasets/{id}/batch-run
```

3. **查看结果:**
   - UI 中会显示 3 个 Run，每个对应一个 case
   - 可以批量查看成功率、平均成本、异常情况
   - 对比不同 prompt 版本在相同 dataset 上的表现

**回归测试流程：**
1. 修改 Agent 的 prompt template
2. 对同一个 dataset 跑 batch-run
3. 使用 Compare 功能对比前后两次的输出
4. 标注评分（rating）和备注（note）

---

### 3. ✅ StepRun 唯一键 Bug 修复

**问题：** 原来的 `@@unique([runId, stepId])` 会导致：
- 无法重跑同一个 step
- 如果 step 被复用/复制会撞键

**解决方案：**
- 改为 `@@unique([runId, orderIndex])`
- 同一个 run 中每个位置只能有一个 stepRun
- 支持未来的 "重跑单个 step" 功能（创建新 run）

**迁移方式：**
已通过 SQL 迁移自动完成：
```sql
ALTER TABLE step_runs DROP INDEX step_runs_runId_stepId_key;
ALTER TABLE step_runs ADD UNIQUE KEY step_runs_runId_orderIndex_key (runId, orderIndex);
ALTER TABLE step_runs ADD INDEX step_runs_stepId_idx (stepId);
```

---

## 📊 新功能对照表

| 功能 | Demo 版 | 生产版 | 用途 |
|------|---------|--------|------|
| Agent 执行 | ✅ | ✅ | 基础功能 |
| Replay | ✅ | ✅ | 调试迭代 |
| Compare | ✅ | ✅ | 版本对比 |
| Share | ✅ | ✅ | 团队协作 |
| **SDK 接入** | ❌ | ✅ | 生产监控 |
| **Dataset** | ❌ | ✅ | 批量评测 |
| **Batch Run** | ❌ | ✅ | 回归测试 |
| **Annotations** | ✅ | ✅ | 标注反馈 |
| **StepRun 重跑** | ❌ | ✅ | 灵活调试 |

---

## 🚀 推荐工作流

### 开发阶段
1. 在平台上创建 Agent，定义多步流程
2. 手动运行几次，调试 prompt template
3. 创建 Dataset（包含典型输入和边缘情况）
4. 跑 Batch Run，观察整体表现
5. 使用 Compare 对比不同版本

### 集成阶段
6. 将 SDK 集成到你的应用代码
7. 在关键 LLM 调用处添加 `debug.capture()`
8. 部署后自动追踪生产 LLM 调用

### 持续优化
9. 定期查看 UI 中的 captured runs
10. 发现问题时添加 rating/note/tags
11. 将问题 case 添加到 Dataset
12. 修改 prompt 后跑回归测试（Batch Run）
13. Compare 新旧版本，确认改进

---

## 📁 文件结构变化

```
backend/
├── src/routes/
│   ├── capture.ts        # 新增：SDK 接入端点
│   └── datasets.ts       # 新增：Dataset + Batch Run
├── sdk/
│   ├── node.ts           # 新增：Node.js SDK
│   └── python.py         # 新增：Python SDK
├── migrations/
│   ├── manual_migration.sql      # StepRun unique 修复
│   └── dataset_migration.sql     # Dataset 表创建
└── prisma/schema.prisma  # 更新：Dataset 模型 + Run 新字段

frontend/
├── src/types.ts          # 更新：Dataset 接口
└── src/api.ts            # 更新：datasets API 客户端
```

---

## 🧪 测试新功能

### 测试 SDK 捕获
```bash
./test_sdk.sh
```

### 测试 Dataset Batch Run
1. 启动后端: `cd backend && npm run dev`
2. 在 UI 中创建一个 Agent
3. 用 curl 创建 Dataset（见上方示例）
4. 调用 batch-run 端点
5. 在 UI "Recent Runs" 中查看 3 个新 runs

### 测试 Compare
1. 创建一个 Agent，运行一次
2. 修改 prompt template
3. 再运行一次
4. 在第二次 run 的详情页点击 "Compare"
5. 选择第一次 run，查看 diff

---

## ⚠️ 注意事项

1. **SDK 性能：** `debug.capture()` 是异步的，不应阻塞主流程。建议加 try/catch 避免平台故障影响你的应用
2. **Dataset 大小：** Batch Run 是串行执行，cases 过多会很慢。建议单个 dataset ≤ 20 cases
3. **Cost 追踪：** SDK 捕获的 cost 需要你自己计算并传入（`promptTokens * rate`）
4. **唯一键迁移：** 如果你有老数据，运行迁移前先备份数据库

---

## 🎓 最佳实践

1. **命名规范：** Agent 名称使用 "项目名-功能"，如 "Blog-Summarizer"
2. **Tags 使用：** 用 tags 区分环境（`prod`, `dev`, `staging`）和版本（`v1.0`, `v2.0`）
3. **Dataset 分组：** 为每个 Agent 创建 "基础功能"、"边缘情况"、"性能测试" 三个 Dataset
4. **定期清理：** 删除无用的 runs 和 agents，保持 UI 整洁

---

## 📈 未来增强（可选）

现在已经是生产级，但如果想更强大：

1. **Checks / Assertions:** 自动检查输出是否符合预期（JSON 格式、关键词、长度等）
2. **LLM-as-Judge:** 用 LLM 评估输出质量（需要额外 LLM 调用）
3. **Prompt Versioning:** 自动保存 prompt template 历史版本
4. **Dashboard:** 汇总统计（今日 runs、平均成本、失败率等）
5. **Webhooks:** Batch run 完成后自动通知（Slack/Email）

这些可以按需逐步添加，不会影响核心功能。
