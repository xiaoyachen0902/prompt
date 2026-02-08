# 快速入门指南

## 🚀 5 分钟上手

### 1. 启动服务

**终端 1 - 后端:**
```bash
cd backend
npm run dev
```

**终端 2 - 前端:**
```bash
cd frontend
npm run dev
```

访问: http://localhost:5173

---

### 2. 创建第一个 Agent

1. 点击 "New Agent"
2. 输入名称: `写作助手`
3. 添加 3 个步骤:

**Step 1 - 大纲:**
```
根据主题生成文章大纲。
主题: {{topic}}
```

**Step 2 - 正文:**
```
根据大纲撰写正文，要求：
- 每段100字左右
- 通俗易懂
- 有具体例子

大纲：{{step_0}}
```

**Step 3 - 优化:**
```
优化以下文章，提升可读性和专业性。

原文：{{step_1}}
```

4. 点击 "Save Agent"

---

### 3. 运行测试

1. 点击刚创建的 "写作助手"
2. 在输入框输入: `topic: AI 对教育的影响`
3. 点击 "Run Agent"
4. 等待执行完成（约10-30秒）

**观察结果:**
- 左侧时间线显示 3 个步骤进度
- 中间区域查看每步的输出/提示词/输入
- 右侧查看总成本和延迟

---

### 4. 试试高级功能

#### 📝 修改并重跑
1. 返回 Agent 列表
2. 点击 "写作助手" 进入编辑
3. 修改 Step 3 的 prompt: 增加 "要求字数不超过 500 字"
4. 保存后再次运行
5. 对比两次结果（点击 "Compare"）

#### 🔁 Replay
1. 点开任意一次运行
2. 在左侧时间线选择 "Step 2"
3. 点击 "Replay from here"
4. 系统会重用 Step 1 的输出，重新执行 Step 2 和 3

#### 📊 批量评测
创建 Dataset 测试多个主题:

```bash
curl -X POST http://localhost:3001/api/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "你的AgentID",
    "name": "多主题测试",
    "cases": [
      {"topic": "AI对教育的影响"},
      {"topic": "远程工作的优缺点"},
      {"topic": "可再生能源的未来"}
    ]
  }'
```

然后运行批量测试:
```bash
curl -X POST http://localhost:3001/api/datasets/DatasetID/batch-run
```

在 UI "Recent Runs" 查看 3 次运行结果，对比成本和质量。

---

## 🔌 集成到你的项目

### Node.js 示例

```typescript
// my-app.ts
import { PromptDebug } from './backend/sdk/node';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const debug = new PromptDebug('http://localhost:3001');

async function generateBlogPost(topic: string) {
  const prompt = `Write a 200-word blog post about: ${topic}`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
  });
  
  const output = response.choices[0].message.content ?? '';
  
  // 自动记录到调试平台
  await debug.capture({
    agentName: 'BlogGenerator',
    stepName: 'Generate',
    prompt,
    output,
    input: { topic },
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  });
  
  return output;
}

// 使用
const post = await generateBlogPost('The future of AI');
console.log(post);
```

运行后，打开 http://localhost:5173，在 Agents 列表会自动出现 "BlogGenerator"，所有调用记录都能在 UI 中查看！

---

## 💡 实用技巧

### 1. 使用变量传递上下文
```
步骤 1: 生成JSON: {"name": "Alice", "age": 25}

步骤 2: 根据用户信息推荐书籍：
用户：{{step_0}}
```

系统会自动将上一步输出作为变量替换。

### 2. 标注评分和备注
- 运行完成后在右侧点击 👍/👎 评分
- 添加 Note 记录问题（如 "输出太长" "格式错误"）
- 添加 Tags（如 `prod`, `bug`, `v1.2`）
- 在列表页按 tag 筛选

### 3. 分享运行结果
1. 点击 "Share" 生成只读链接
2. 发给团队成员，无需登录即可查看
3. 适合向 PM 展示 LLM 输出或讨论 prompt 问题

### 4. 对比不同版本
1. 修改 prompt 前先 Run 一次作为 baseline
2. 修改后再 Run
3. 使用 Compare 查看逐步 diff
4. 决定是否采用新版本

---

## 📋 常见问题

**Q: 运行失败怎么办？**
A: 检查 `.env` 中 `OPENAI_API_KEY` 是否正确，查看 backend 终端日志

**Q: 成本如何计算？**
A: 基于 OpenAI 官方定价（prompt tokens + completion tokens）自动计算

**Q: 能用其他 LLM 吗？**
A: 可以！设置 `OPENAI_BASE_URL` 为兼容 OpenAI 格式的端点（如 Ollama, vLLM）

**Q: 数据存在哪里？**
A: MySQL 数据库（见 `backend/.env` 中 `DATABASE_URL`）

**Q: 怎么删除 Agent/Run？**
A: 在列表页点击三个点菜单 → Delete

---

## 🎯 下一步

- 阅读 [SDK.md](./SDK.md) 了解完整 SDK 用法
- 阅读 [MIGRATION.md](./MIGRATION.md) 了解生产级特性
- 查看 [SDK_EXAMPLES.md](./SDK_EXAMPLES.md) 查看更多代码示例

开始使用吧！🚀
