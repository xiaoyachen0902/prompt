# 完整测试流程

## 📋 测试前准备

### 1. 确认服务运行状态

**终端 1 - 检查后端：**
```bash
cd /Users/gyouachin/Desktop/pj/prompt/backend
npm run dev
```
确认看到：`Backend listening on http://localhost:3001`

**终端 2 - 检查前端：**
```bash
cd /Users/gyouachin/Desktop/pj/prompt/frontend
npm run dev
```
确认看到：`Local: http://localhost:5173`

**浏览器测试：**
- 打开 http://localhost:5173
- 应该看到主页，显示「Agents」和「最近运行」两个标签（或英文 "Agents" / "Recent Runs"）

### 2. 语言切换（中英双语）
- 顶栏有 **「中文 | EN」** 切换
- 切换后整站文案（导航、按钮、运行结果页等）会变为对应语言
- 刷新后语言偏好会保持（localStorage）

---

## 🎯 测试用例 1：创建并运行 Agent

### 步骤 1.1：创建 Agent
1. 点击右上角 **「新建 Agent」**（或 "New Agent"）按钮
2. 输入 Agent 名称：`AI文章生成器`
3. 在左侧画布看到 Step 1，点击节点后右侧出现 Step 编辑框

### 步骤 1.2：配置三个步骤

**Step 1 - 生成大纲**
- Name: `生成大纲`
- Prompt Template:
```
你是一位专业的内容策划师。请根据以下主题生成一篇文章的大纲（3-5个要点）。

主题：{{topic}}
风格：{{style}}

要求：
- 每个要点简洁明了
- 逻辑清晰
- 适合{{style}}风格
```

**Step 2 - 撰写正文**
- Name: `撰写正文`
- Prompt Template:
```
根据以下大纲撰写文章正文。

大纲：
{{生成大纲}}

要求：
- 每段100-150字
- 语言流畅
- 结构清晰
- 有具体例子
```

**Step 3 - 润色优化**
- Name: `润色优化`
- Prompt Template:
```
优化以下文章，提升可读性和吸引力。

原文：
{{撰写正文}}

要求：
- 修正语法错误
- 优化表达
- 增加感染力
- 保持原意
```

4. 点击 **「Save」**（保存）按钮

**预期结果：**
- 跳转回主页
- Agent 列表中出现「AI文章生成器」
- 显示「3 步骤」（或 "3 steps"）

---

### 步骤 1.3：运行 Agent

1. 点击「AI文章生成器」卡片进入编辑页
2. 当前版本运行时不弹输入框，可直接点击 **「Run」**（运行）按钮（或从主页卡片点「运行」进入）
3. 若有输入变量，在运行前按提示填写（如 `topic`、`style`）

**预期结果：**
- 页面跳转到 Run 详情页
- 左侧**时间线**显示 3 个步骤，逐个变为 running → completed
- 执行时间约 20–40 秒（取决于 LLM 响应速度）

---

### 步骤 1.4：查看运行结果（最终结果页）

**检查左侧时间线：**
- ✅ 3 个步骤都显示绿色 completed 状态
- 每个步骤显示模型、耗时（如 2.3s）

**检查中间区域：**
1. 点击 **「输出」**（Output）标签：应看到最后一步的完整文章
2. 若有 **「评估」**（Evaluation）标签：表示该步骤为「反思」类型，此处为质量评估内容
3. 点击 **「提示词」**（Prompt）标签：发给 LLM 的完整 prompt（变量已替换）
4. 点击 **「输入上下文」**（Input context）标签：JSON 格式的输入/上一步输出
5. 若该步配置了决策或条件：下方会显示 **「下一步：continue/retry/stop/…」** 及决策输出原文

**检查右侧面板：**
- **摘要**：词数（Tokens）、费用（Cost）、耗时（Latency）
- **评分**：👍 / 👎 / − 可点选
- **备注与标签**：可填写备注、标签（逗号分隔），点击「保存」
- 操作按钮：**重放**、**分享链接**、**对比运行**；顶部有返回首页、返回 Agent 编辑

---

## 🎯 测试用例 2：Replay 功能

### 步骤 2.1：Replay 整个 Run
1. 在 Run 详情页，点击右侧 **"Replay"** 按钮
2. 等待执行完成

**预期结果：**
- URL 变化（新的 runId）
- 重新执行了所有 3 个步骤
- 输出可能略有不同（LLM 的随机性）

---

### 步骤 2.2：从中间步骤 Replay
1. 点击浏览器后退，回到第一次运行的详情页
2. 在左侧时间线点击 **Step 2（撰写正文）**
3. 点击步骤下方的 **「从此处重放」**（Replay from here）按钮

**预期结果：**
- 创建新的 Run
- 只重新执行 Step 2 和 Step 3
- Step 1 的输出被复用（不重新调用 LLM）

---

## 🎯 测试用例 3：Compare 对比功能

### 步骤 3.1：修改 Prompt 并重新运行
1. 点击右上角 **"Home"** 回到主页
2. 点击 "AI文章生成器"
3. 修改 Step 3 的 Prompt Template，在最后加上：
```
要求字数控制在 300 字以内。
```
4. 点击 **"Save"**
5. 输入相同的变量（topic: `人工智能对教育的影响`, style: `专业学术`）
6. 点击 **"Run Agent"**
7. 等待完成

---

### 步骤 3.2：对比两次运行
1. 在新运行的详情页，点击右侧 **「对比」**（Compare）按钮
2. 在弹出的对话框中，选择之前的运行（第一次运行）
3. 选择要对比的步骤，切换「输出对比」/「Prompt 对比」查看差异

**预期结果：**
- 弹出对话框显示每个步骤的对比（Output diff / Prompt diff）
- Step 3 提示词显示差异（高亮新增内容）
- 可逐步骤查看 diff

---

## 🎯 测试用例 4：Share 分享功能

### 步骤 4.1：创建分享链接
1. 在任意 Run 详情页，点击右侧 **「分享」**（Share）按钮
2. 链接会自动复制，页面提示「链接已复制」；分享链接形如 `http://localhost:5173/r/abc123`

### 步骤 4.2：测试分享链接
1. 打开浏览器隐身窗口（或新标签页）
2. 粘贴分享链接并访问

**预期结果：**
- 显示只读的 Run 详情页（Shared）
- 可查看所有步骤、输出、提示词、摘要
- 无重放、分享、对比等操作按钮（只读模式）

---

## 🎯 测试用例 5：Annotations 标注功能

### 步骤 5.1：评分和标注
1. 在 Run 详情页右侧 **「评分」**、**「备注与标签」** 区域：
2. 点击 **👍**（好评）按钮
3. 在「添加备注…」输入框输入：`输出质量很好，逻辑清晰`
4. 在「标签（逗号分隔）」输入框输入：`test, baseline, v1.0`
5. 点击 **「保存」**

**预期结果：**
- 评分按钮高亮
- 备注与标签已保存，刷新后仍存在

---

### 步骤 5.2：在列表中查看标注
1. 点击顶栏 **首页**（Home）返回
2. 切换到 **「最近运行」**（Recent Runs）标签

**预期结果：**
- 看到所有运行记录
- 刚标注的运行显示评分与标签

---

## 🎯 测试用例 6：Delete 删除功能

### 步骤 6.1：删除 Run
1. 在「最近运行」列表中找到一个测试 Run
2. 点击该 Run 卡片上的删除入口（若有菜单则选 **「删除」**）
3. 在确认对话框中确认 **「删除」**

**预期结果：**
- Run 从列表消失，其他 Runs 不受影响

---

### 步骤 6.2：删除 Agent
1. 在「Agents」标签中找到一个测试 Agent
2. 点击删除入口，在确认对话框确认 **「删除」**

**预期结果：**
- Agent 从列表消失，其下所有 Runs 级联删除

---

## 🎯 测试用例 7：SDK 捕获功能

### 步骤 7.1：测试 SDK 端点

**打开新终端运行：**
```bash
curl -X POST http://localhost:3001/api/capture/step \
  -H "Content-Type: application/json" \
  -d '{
    "agentName": "外部应用测试",
    "stepName": "生成摘要",
    "prompt": "请用一句话总结：人工智能正在改变我们的生活方式",
    "output": "人工智能通过自动化和智能化技术，正在深刻改变人们的工作、学习和日常生活方式。",
    "input": {
      "source": "external_app",
      "version": "1.0"
    },
    "promptTokens": 15,
    "completionTokens": 25,
    "latencyMs": 800,
    "cost": 0.00002,
    "status": "completed"
  }'
```

**预期结果：**
```json
{
  "runId": "cml...",
  "stepRunId": "cml...",
  "agentId": "cml..."
}
```

---

### 步骤 7.2：在 UI 中查看捕获的数据
1. 回到浏览器，刷新主页
2. 在 "Agents" 列表中应该看到新的 Agent：**"外部应用测试"**
3. 点击进入，看到 1 个 step
4. 切换到 "Recent Runs"，看到捕获的运行记录

**预期结果：**
- Agent 自动创建
- Step 自动创建
- Run 正确记录了 tokens、cost、latency
- 可以正常查看 input、prompt、output

---

## 🎯 测试用例 8：Dataset 批量测试

### 步骤 8.1：创建 Dataset

**先获取 Agent ID：**
1. 在浏览器中点击 "AI文章生成器"
2. 从 URL 复制 agentId（如 `http://localhost:5173/agents/cmlc4kcfo000013ro7fk8jw4n`）

**运行创建命令：**
```bash
curl -X POST http://localhost:3001/api/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "你的AgentID",
    "name": "多主题测试集",
    "cases": [
      {
        "topic": "区块链技术的应用",
        "style": "通俗易懂"
      },
      {
        "topic": "气候变化的影响",
        "style": "科学严谨"
      },
      {
        "topic": "远程工作的优劣",
        "style": "客观中立"
      }
    ]
  }'
```

**预期结果：**
```json
{
  "id": "cml...",
  "agentId": "...",
  "name": "多主题测试集",
  "cases": "[...]",
  "createdAt": "..."
}
```
记住返回的 Dataset ID。

---

### 步骤 8.2：批量运行
```bash
curl -X POST http://localhost:3001/api/datasets/你的DatasetID/batch-run
```

**预期结果：**
- 命令执行约 1-2 分钟（执行 3 个完整的 Agent runs）
- 返回包含 3 个 runId 的数组

---

### 步骤 8.3：查看批量运行结果
1. 在浏览器中切换到 "Recent Runs" 标签
2. 应该看到 3 个新的运行记录
3. 每个运行对应一个测试用例

**验证：**
- Run 1: topic = "区块链技术的应用"
- Run 2: topic = "气候变化的影响"
- Run 3: topic = "远程工作的优劣"

4. 对比这 3 个 runs，观察：
   - 不同主题的输出质量
   - Token 消耗差异
   - 成本对比

---

## 🎯 测试用例 9：使用内置模板

### 步骤 9.1：从模板创建 Agent
1. 回到主页「Agents」标签
2. 点击 **「模板」**（Templates）按钮
3. 在弹窗中选择分类（如「开发」），选择模板如 **「Code Generate → Review」**（生成代码并审查）
4. 点击 **「创建 Agent」**

**预期结果：**
- 自动创建对应名称的 Agent，包含 2 个步骤（Generate Code、Review Code）
- 跳转到该 Agent 编辑页

---

### 步骤 9.2：测试模板 Agent
1. 在编辑页可查看/修改各 Step 的 Prompt；运行前若有变量需在运行流程中填写
2. 点击 **「Run」** 运行

**预期结果：**
- Step 1 生成代码，Step 2 对代码进行 review 并给出改进建议

---

## 🎯 测试用例 10：Agent 决策与分支（3.0）

### 步骤 10.1：Step 类型与「完成后默认」
1. 编辑任意 Agent，点击某个 Step 节点
2. 在右侧找到 **「结果与分支」**（Outcome / Branch）区域
3. **步骤类型**：选择「执行」（Action）或「反思（仅评估，不进入上下文）」（Reflection）
4. **完成后默认**：选择「继续」「重试（最多 3 次）」「跳过下一步」「分支」「提前结束」之一
5. 保存 Agent

**说明：** 反思步骤的 LLM 输出只写入「评估」，不进入下一步的上下文，适合做质量自检。

### 步骤 10.2：决策 Prompt（可选）
1. 在同一 Step 的 **「决策 Prompt（可选）」** 中输入一段 prompt，例如：
   - 使用 `{{output}}` 引用本步输出，让 LLM 回复：`CONTINUE` / `RETRY` / `SKIP_NEXT` / `STOP` / `BRANCH 步骤序号`
2. 运行 Agent 后，在 Run 详情页该步骤下方应看到 **「下一步：xxx」** 及决策输出原文

### 步骤 10.3：条件（if/else）
1. 不填决策 Prompt 时，可填 **「条件（if/else，可选）」**：
   - **若**：例如 `output contains error`（由 LLM 判断 yes/no）
   - **则** / **否则**：选择 continue、retry、skip_next、stop 等
2. 运行后，该步骤会根据条件结果走「则」或「否则」分支

### 步骤 10.4：运行结果页中的新内容
- 若该步为 **反思**：会多出 **「评估」** 标签页，内容为反思输出
- 若该步有决策或条件：步骤下方显示 **「下一步：…」** 及 **「→ 步骤 N」**（若为 branch）
- **提前结束**（stop）：后续步骤不再执行，Run 正常完成

---

## 🎯 测试用例 11：错误处理

### 步骤 11.1：测试无效的 API Key
1. 停止后端服务（Ctrl+C）
2. 编辑 `backend/.env`，将 `OPENAI_API_KEY` 改为无效值
3. 重启后端：`npm run dev`
4. 尝试运行任意 Agent

**预期结果：**
- Run 显示 failed 状态
- 在 StepRun 的错误信息中显示 API 错误
- 其他功能（查看历史、删除等）仍然正常

### 步骤 11.2：恢复配置
1. 将 `.env` 中的 API Key 改回正确值
2. 重启后端

---

## 📊 测试检查清单

完成以上测试后，确认以下功能都正常：

### 核心功能
- [ ] 创建 Agent（多个 steps）
- [ ] 编辑 Agent（修改 prompt、模型等）
- [ ] 删除 Agent
- [ ] 运行 Agent
- [ ] 查看 Run 详情（时间线、输出、提示词、输入上下文）

### 高级功能
- [ ] Replay 整个 Run / 从此处重放
- [ ] Compare 两个 Runs（输出对比、Prompt 对比）
- [ ] Share 生成只读链接
- [ ] 评分、备注与标签（保存后持久化）

### Agent 3.0（决策与分支）
- [ ] Step 类型：执行 / 反思（评估不进上下文）
- [ ] 完成后默认：继续、重试、跳过下一步、分支、提前结束
- [ ] 决策 Prompt（LLM 决定下一步）
- [ ] 条件 if/else（LLM 判断条件后走则/否则）
- [ ] Run 结果页：评估标签、下一步/决策输出、→ 步骤 N

### 新功能（2.0）
- [ ] SDK Capture 端点
- [ ] 自动创建 Agent/Step
- [ ] Dataset 创建、Batch Run、查看批量运行结果

### 中英双语
- [ ] 顶栏语言切换「中文 | EN」
- [ ] 最终结果页（时间线、输出、提示词、摘要、评分、备注等）随语言切换

### UI/UX
- [ ] 页面切换流畅
- [ ] 数据实时更新
- [ ] 错误提示清晰
- [ ] 删除操作有确认
- [ ] Monaco Editor 正常显示

### 数据持久化
- [ ] 刷新页面后数据保留
- [ ] 重启服务后数据保留
- [ ] 级联删除正确执行

---

## 🐛 如果遇到问题

### 问题 1：运行失败
**检查：**
```bash
# 查看后端日志
cd /Users/gyouachin/Desktop/pj/prompt/backend
# 查看终端输出

# 检查数据库连接
mysql -u root -p1990cxyc -h 127.0.0.1 -e "USE prompt_debug; SHOW TABLES;"
```

### 问题 2：UI 空白或错误
**解决：**
```bash
# 清除前端缓存
cd /Users/gyouachin/Desktop/pj/prompt/frontend
rm -rf node_modules/.vite
npm run dev
```

### 问题 3：Monaco Editor 不显示
**检查：**
- 浏览器控制台是否有错误
- 确认 `height="100%"` 的容器有明确高度

### 问题 4：SDK 捕获失败
**检查：**
```bash
# 测试后端是否运行
curl http://localhost:3001/api/agents

# 测试 capture 端点
curl -X POST http://localhost:3001/api/capture/step \
  -H "Content-Type: application/json" \
  -d '{"agentName":"test","stepName":"test","prompt":"test","status":"completed"}'
```

---

## ✅ 测试完成

如果所有测试都通过，恭喜！你的 Prompt Debug 平台已经可以投入使用了。

**下一步建议：**
1. 将 SDK 集成到你的实际项目中
2. 创建更多测试 Datasets
3. 邀请团队成员试用
4. 根据使用反馈继续优化

测试愉快！🚀
