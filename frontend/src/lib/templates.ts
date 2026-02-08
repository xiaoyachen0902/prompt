export type TemplateLocale = "zh" | "en";

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: "professional" | "learning" | "code" | "travel" | "advanced" | "creative";
  steps: Array<{ name: string; promptTemplate: string }>;
  exampleInputs?: Record<string, string>;
  useCases?: string[];
  /** English display content (optional) */
  nameEn?: string;
  descriptionEn?: string;
  useCasesEn?: string[];
  exampleInputsEn?: Record<string, string>;
  stepsEn?: Array<{ name: string; promptTemplate: string }>;
}

export function getTemplateForLocale(t: AgentTemplate, locale: TemplateLocale) {
  return {
    name: locale === "en" && t.nameEn ? t.nameEn : t.name,
    description: locale === "en" && t.descriptionEn ? t.descriptionEn : t.description,
    useCases: locale === "en" && t.useCasesEn ? t.useCasesEn : (t.useCases ?? []),
    exampleInputs: locale === "en" && t.exampleInputsEn ? t.exampleInputsEn : (t.exampleInputs ?? {}),
    steps: locale === "en" && t.stepsEn ? t.stepsEn : t.steps,
  };
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  // Professional / Work
  {
    id: "research-decision",
    name: "Research → Decision Memo",
    description: "把一堆资料变成能拍板的决策文档。适合产品选型、技术方案评估、市场调研。",
    category: "professional",
    useCases: ["产品选型", "技术方案评估", "市场调研", "投资判断"],
    exampleInputs: {
      question: "我们应该选择 PostgreSQL 还是 MySQL 作为主数据库？",
      materials: "团队熟悉 MySQL，但 PostgreSQL 的 JSON 支持更好...",
    },
    steps: [
      {
        name: "Research",
        promptTemplate: `分析以下问题和资料，提取关键信息点和不确定性。

问题：{{question}}

资料：
{{materials}}

要求：
- 列出关键信息点（3-5个）
- 标注不确定的地方
- 提出需要进一步调查的问题`,
      },
      {
        name: "Synthesize",
        promptTemplate: `基于研究结果，汇总不同观点。

研究结果：
{{Research}}

要求：
- 总结主要观点
- 标注共识点
- 标注分歧点
- 列出假设条件`,
      },
      {
        name: "Evaluate Options",
        promptTemplate: `列出所有可选方案，并分析优缺点。

综合分析：
{{Synthesize}}

要求：
- 列出 2-4 个可选方案
- 每个方案的优点、缺点、风险
- 需要满足的前提假设`,
      },
      {
        name: "Decision Memo",
        promptTemplate: `生成一页纸决策文档。

方案评估：
{{Evaluate Options}}

要求：
- 明确推荐方案（1个）
- 推荐理由（3点以内）
- 主要风险及缓解措施
- Next Steps（可执行的行动项）
- 字数 300 字以内`,
      },
    ],
    nameEn: "Research → Decision Memo",
    descriptionEn: "Turn research into a decision memo. For product selection, technical evaluation, market research.",
    useCasesEn: ["Product selection", "Technical evaluation", "Market research", "Investment decision"],
    exampleInputsEn: {
      question: "Should we choose PostgreSQL or MySQL as our primary database?",
      materials: "Team is familiar with MySQL, but PostgreSQL has better JSON support...",
    },
    stepsEn: [
      { name: "Research", promptTemplate: `Analyze the question and materials, extract key points and uncertainties.

Question: {{question}}

Materials:
{{materials}}

Requirements:
- List key points (3-5)
- Note uncertainties
- Suggest follow-up questions` },
      { name: "Synthesize", promptTemplate: `Summarize different views from the research.

Research:
{{Research}}

Requirements:
- Summarize main points
- Note consensus and disagreement
- List assumptions` },
      { name: "Evaluate Options", promptTemplate: `List options and analyze pros/cons.

Synthesis:
{{Synthesize}}

Requirements:
- List 2-4 options
- Pros, cons, risks per option
- Prerequisites` },
      { name: "Decision Memo", promptTemplate: `Produce a one-page decision memo.

Evaluation:
{{Evaluate Options}}

Requirements:
- One recommended option
- Up to 3 reasons
- Key risks and mitigations
- Next steps (actionable)
- Within ~300 words` },
    ],
  },
  {
    id: "requirements-design",
    name: "Requirements → Design → Risks",
    description: "把模糊需求变成可实施方案。适合产品 PRD、技术需求拆解、客户需求澄清。",
    category: "professional",
    useCases: ["产品 PRD", "技术需求拆解", "客户需求澄清"],
    exampleInputs: {
      requirement: "用户希望能在手机上快速记录想法",
    },
    steps: [
      {
        name: "Clarify Requirements",
        promptTemplate: `澄清模糊的需求，提出关键问题。

原始需求：
{{requirement}}

要求：
- 列出需要明确的问题（5-8个）
- 推测可能的用户场景
- 识别约束条件（技术、时间、预算）`,
      },
      {
        name: "Propose Design",
        promptTemplate: `基于澄清的需求，提出设计方案。

澄清结果：
{{Clarify Requirements}}

要求：
- 核心功能（3-5个）
- 用户流程（简要描述）
- 技术选型建议
- MVP 范围`,
      },
      {
        name: "Identify Edge Cases",
        promptTemplate: `识别边缘情况和异常场景。

设计方案：
{{Propose Design}}

要求：
- 列出 5-10 个边缘情况
- 每个情况的处理方式
- 可能的用户困惑点`,
      },
      {
        name: "Risk & Mitigation",
        promptTemplate: `风险评估和缓解措施。

设计和边缘情况：
{{Propose Design}}
{{Identify Edge Cases}}

要求：
- 列出主要风险（技术、用户体验、业务）
- 每个风险的缓解措施
- 建议的验证方式（如何测试）`,
      },
    ],
    nameEn: "Requirements → Design → Risks",
    descriptionEn: "Turn vague requirements into actionable design. For PRD, technical breakdown, customer clarification.",
    useCasesEn: ["Product PRD", "Technical breakdown", "Customer clarification"],
    exampleInputsEn: { requirement: "User wants to quickly capture ideas on mobile" },
    stepsEn: [
      { name: "Clarify Requirements", promptTemplate: `Clarify vague requirements and key questions.\n\nOriginal: {{requirement}}\n\nRequirements: List 5-8 clarifying questions; infer user scenarios; identify constraints (tech, time, budget).` },
      { name: "Propose Design", promptTemplate: `Propose design from clarified requirements.\n\nClarification: {{Clarify Requirements}}\n\nRequirements: Core features (3-5); user flow; tech choices; MVP scope.` },
      { name: "Identify Edge Cases", promptTemplate: `Identify edge cases and exceptions.\n\nDesign: {{Propose Design}}\n\nRequirements: List 5-10 edge cases; handling per case; possible user confusion.` },
      { name: "Risk & Mitigation", promptTemplate: `Risks and mitigations.\n\nDesign & edges: {{Propose Design}} {{Identify Edge Cases}}\n\nRequirements: Main risks (tech, UX, business); mitigation per risk; how to validate.` },
    ],
  },
  {
    id: "meeting-action",
    name: "Meeting → Action Items → Follow-ups",
    description: "会议记录转化为可执行的行动项。企业场景必备。",
    category: "professional",
    nameEn: "Meeting → Action Items → Follow-ups",
    descriptionEn: "Turn meeting notes into actionable items. Essential for teams.",
    useCases: ["会议记录", "项目同步", "决策跟进"],
    useCasesEn: ["Meeting notes", "Project sync", "Decision follow-up"],
    exampleInputs: {
      notes: "讨论了新功能的优先级，Bob 提出需要先做用户调研...",
    },
    exampleInputsEn: { notes: "Discussed feature priority; Bob suggested user research first..." },
    steps: [
      {
        name: "Summarize Discussion",
        promptTemplate: `总结会议讨论内容。

会议记录：
{{notes}}

要求：
- 主要讨论点（3-5个）
- 达成的共识
- 未解决的问题
- 参与者的关键观点`,
      },
      {
        name: "Extract Action Items",
        promptTemplate: `提取可执行的行动项。

会议总结：
{{Summarize Discussion}}

要求：
- 列出所有 Action Items
- 每项注明：负责人、截止时间、优先级
- 按优先级排序
- 标注依赖关系`,
      },
      {
        name: "Generate Follow-up Messages",
        promptTemplate: `生成跟进消息模板。

Action Items：
{{Extract Action Items}}

要求：
- 给每个负责人的跟进消息（简短、友好）
- 给团队的会议纪要（200字以内）
- 下次会议的建议议程`,
      },
    ],
    stepsEn: [
      { name: "Summarize Discussion", promptTemplate: `Summarize the meeting.\n\nNotes: {{notes}}\n\nRequirements: Main points (3-5); consensus; open issues; key views.` },
      { name: "Extract Action Items", promptTemplate: `Extract action items.\n\nSummary: {{Summarize Discussion}}\n\nRequirements: List items with owner, due date, priority; dependencies.` },
      { name: "Generate Follow-up Messages", promptTemplate: `Generate follow-up messages.\n\nActions: {{Extract Action Items}}\n\nRequirements: Short message per owner; team summary (~200 words); suggested next agenda.` },
    ],
  },

  // Learning / Study
  {
    id: "learn-test",
    name: "Read → Question → Explain → Test",
    description: "真正学会，而不是看完。适合学习技术文档、论文、新领域知识。",
    category: "learning",
    nameEn: "Read → Question → Explain → Test",
    descriptionEn: "Learn for real: summarize, question, explain, self-test. For docs, papers, new topics.",
    useCases: ["学技术文档", "看论文", "自学新领域"],
    useCasesEn: ["Tech docs", "Papers", "New domains"],
    exampleInputs: {
      content: "React Hooks 是 React 16.8 引入的新特性，允许在函数组件中使用 state...",
    },
    exampleInputsEn: { content: "React Hooks (16.8) let you use state in function components..." },
    steps: [
      {
        name: "Summarize Key Concepts",
        promptTemplate: `提取核心概念。

学习内容：
{{content}}

要求：
- 列出 3-5 个核心概念
- 每个概念用一句话解释
- 标注概念之间的关系`,
      },
      {
        name: "Generate Questions",
        promptTemplate: `生成理解检查问题。

核心概念：
{{Summarize Key Concepts}}

要求：
- 生成 5-8 个问题
- 包含：概念理解、应用场景、对比分析
- 从易到难排序`,
      },
      {
        name: "Explain in Simple Terms",
        promptTemplate: `用简单语言解释。

概念和问题：
{{Summarize Key Concepts}}

要求：
- 用类比或例子解释每个核心概念
- 避免术语，假设读者是外行
- 用生活化的例子`,
      },
      {
        name: "Self-Test (Q&A)",
        promptTemplate: `回答之前生成的问题。

问题列表：
{{Generate Questions}}

参考：
{{Summarize Key Concepts}}
{{Explain in Simple Terms}}

要求：
- 回答每个问题（50字以内/题）
- 标注信心等级（确定/不确定）
- 列出需要进一步学习的点`,
      },
    ],
    stepsEn: [
      { name: "Summarize Key Concepts", promptTemplate: `Extract core concepts from: {{content}}\n\nRequirements: 3-5 concepts; one-line explanation each; relationships.` },
      { name: "Generate Questions", promptTemplate: `Generate check questions. Concepts: {{Summarize Key Concepts}}\n\nRequirements: 5-8 questions; understanding, application, comparison; easy to hard.` },
      { name: "Explain in Simple Terms", promptTemplate: `Explain simply. Concepts: {{Summarize Key Concepts}}\n\nRequirements: Analogies/examples; no jargon; layman-friendly.` },
      { name: "Self-Test (Q&A)", promptTemplate: `Answer the questions. Questions: {{Generate Questions}}. Ref: {{Summarize Key Concepts}} {{Explain in Simple Terms}}\n\nRequirements: Short answer per question; confidence level; what to study next.` },
    ],
  },
  {
    id: "concept-deep",
    name: "Concept → Example → Counterexample",
    description: "避免'以为自己懂了'。通过正反例深度理解概念。",
    category: "learning",
    nameEn: "Concept → Example → Counterexample",
    descriptionEn: "Avoid false confidence: understand via examples and counterexamples.",
    useCases: ["理解抽象概念", "掌握编程原则", "学习设计模式"],
    useCasesEn: ["Abstract concepts", "Programming principles", "Design patterns"],
    exampleInputs: {
      concept: "单一职责原则（Single Responsibility Principle）",
    },
    exampleInputsEn: { concept: "Single Responsibility Principle" },
    steps: [
      {
        name: "Define Concept",
        promptTemplate: `精确定义概念。

概念：{{concept}}

要求：
- 给出正式定义
- 解释核心思想
- 说明为什么重要
- 常见误区`,
      },
      {
        name: "Give Correct Example",
        promptTemplate: `提供正确示例。

概念定义：
{{Define Concept}}

要求：
- 给出 2-3 个正确使用的例子
- 解释为什么符合概念
- 指出关键特征`,
      },
      {
        name: "Give Counterexample",
        promptTemplate: `提供反例。

概念和正例：
{{Define Concept}}
{{Give Correct Example}}

要求：
- 给出 2-3 个违反概念的例子
- 解释为什么错误
- 说明如何改正`,
      },
      {
        name: "List Common Mistakes",
        promptTemplate: `列出常见错误。

概念、正例、反例：
{{Define Concept}}
{{Give Correct Example}}
{{Give Counterexample}}

要求：
- 列出 5 个常见错误
- 每个错误的原因
- 如何避免`,
      },
    ],
    stepsEn: [
      { name: "Define Concept", promptTemplate: `Define the concept: {{concept}}\n\nRequirements: Formal definition; core idea; why it matters; common pitfalls.` },
      { name: "Give Correct Example", promptTemplate: `Give correct examples. Definition: {{Define Concept}}\n\nRequirements: 2-3 examples; why they fit; key traits.` },
      { name: "Give Counterexample", promptTemplate: `Give counterexamples. Concept & examples: {{Define Concept}} {{Give Correct Example}}\n\nRequirements: 2-3 violating examples; why wrong; how to fix.` },
      { name: "List Common Mistakes", promptTemplate: `List common mistakes. All above: {{Define Concept}} {{Give Correct Example}} {{Give Counterexample}}\n\nRequirements: 5 common mistakes; cause each; how to avoid.` },
    ],
  },

  // Travel / Life
  {
    id: "travel-plan",
    name: "Travel Plan → Optimize → Backup",
    description: "真正可执行的旅行计划。考虑偏好、预算、应急方案。",
    category: "travel",
    nameEn: "Travel Plan → Optimize → Backup",
    descriptionEn: "Actionable travel plan: preferences, budget, backup options.",
    useCases: ["旅行规划", "周末出游", "商务出差"],
    useCasesEn: ["Trip planning", "Weekend getaway", "Business travel"],
    exampleInputs: {
      destination: "京都",
      days: "3天",
      budget: "5000元",
      interests: "历史文化、美食",
    },
    exampleInputsEn: { destination: "Kyoto", days: "3 days", budget: "5000", interests: "History, culture, food" },
    steps: [
      {
        name: "Understand Preferences",
        promptTemplate: `理解旅行偏好。

目的地：{{destination}}
时长：{{days}}
预算：{{budget}}
兴趣：{{interests}}

要求：
- 分析旅行者类型
- 列出核心需求
- 识别约束条件
- 建议最佳旅行时间`,
      },
      {
        name: "Initial Plan",
        promptTemplate: `生成初步行程。

偏好分析：
{{Understand Preferences}}

要求：
- 每天的行程安排
- 景点选择和理由
- 餐饮建议
- 住宿建议
- 预估花费明细`,
      },
      {
        name: "Optimize",
        promptTemplate: `优化行程。

初步行程：
{{Initial Plan}}

优化维度：
- 减少通勤时间（地理位置相近的安排在一起）
- 提升体验（避免过度赶路）
- 预留弹性时间
- 性价比优化

输出优化后的完整行程。`,
      },
      {
        name: "Backup Plan",
        promptTemplate: `制定应急方案。

优化行程：
{{Optimize}}

要求：
- 下雨天备选方案
- 景点关闭的替代
- 身体疲劳的调整
- 超支的节省建议
- 紧急联系信息清单`,
      },
    ],
    stepsEn: [
      { name: "Understand Preferences", promptTemplate: `Understand travel preferences. Destination: {{destination}}, Days: {{days}}, Budget: {{budget}}, Interests: {{interests}}\n\nRequirements: Traveler type; core needs; constraints; best time.` },
      { name: "Initial Plan", promptTemplate: `Draft itinerary. Preferences: {{Understand Preferences}}\n\nRequirements: Daily schedule; attractions & reasons; food; lodging; cost estimate.` },
      { name: "Optimize", promptTemplate: `Optimize itinerary. Draft: {{Initial Plan}}\n\nOptimize: less transit; better pace; buffer time; value. Output full itinerary.` },
      { name: "Backup Plan", promptTemplate: `Backup plan. Optimized: {{Optimize}}\n\nRequirements: Rain plan; closed-attraction alternatives; fatigue adjustment; budget tips; emergency contacts.` },
    ],
  },
  {
    id: "restaurant-choice",
    name: "Explore → Compare → Choose",
    description: "吃什么不再纠结。科学选餐厅。",
    category: "travel",
    nameEn: "Explore → Compare → Choose",
    descriptionEn: "Decide where to eat: explore, compare, choose.",
    useCases: ["选餐厅", "聚会安排", "美食探索"],
    useCasesEn: ["Pick restaurant", "Group dinner", "Food discovery"],
    exampleInputs: {
      location: "三里屯",
      occasion: "朋友聚会",
      people: "5人",
      preferences: "川菜或日料",
    },
    exampleInputsEn: { location: "Sanlitun", occasion: "Friends gathering", people: "5", preferences: "Sichuan or Japanese" },
    steps: [
      {
        name: "Explore Options",
        promptTemplate: `探索餐厅选项。

地点：{{location}}
场合：{{occasion}}
人数：{{people}}
偏好：{{preferences}}

要求：
- 列出 5-8 家餐厅
- 每家的特色菜
- 人均价格
- 氛围描述`,
      },
      {
        name: "Compare Pros & Cons",
        promptTemplate: `对比优缺点。

餐厅列表：
{{Explore Options}}

对比维度：
- 菜品质量
- 环境氛围
- 性价比
- 预订难度
- 交通便利性

做成对比表格。`,
      },
      {
        name: "Choose Best",
        promptTemplate: `选择最佳方案。

对比结果：
{{Compare Pros & Cons}}

要求：
- 选出最佳餐厅（1家）
- 备选方案（1家）
- 推荐菜品（3-5道）
- 预订建议`,
      },
      {
        name: "Justify Choice",
        promptTemplate: `说明选择理由。

最终选择：
{{Choose Best}}

要求：
- 解释为什么选这家（3个理由）
- 这家最大的优势
- 需要注意的事项
- 如果去了会后悔的可能原因`,
      },
    ],
    stepsEn: [
      { name: "Explore Options", promptTemplate: `Explore options. Location: {{location}}, Occasion: {{occasion}}, People: {{people}}, Preferences: {{preferences}}\n\nRequirements: 5-8 restaurants; specialties; price; vibe.` },
      { name: "Compare Pros & Cons", promptTemplate: `Compare. List: {{Explore Options}}\n\nDimensions: food, vibe, value, booking, transport. Output comparison table.` },
      { name: "Choose Best", promptTemplate: `Pick best. Comparison: {{Compare Pros & Cons}}\n\nRequirements: 1 pick; 1 backup; 3-5 dishes; booking tips.` },
      { name: "Justify Choice", promptTemplate: `Justify. Choice: {{Choose Best}}\n\nRequirements: 3 reasons; main advantage; caveats; possible regrets.` },
    ],
  },

  // Advanced / high-value templates
  {
    id: "hypothesis-experiment",
    name: "Problem → Hypothesis → Experiment",
    description: "科研式思考流程。适合 A/B 测试、研究型任务、创新探索。",
    category: "advanced",
    nameEn: "Problem → Hypothesis → Experiment",
    descriptionEn: "Scientific flow: hypothesis and experiment. For A/B tests, research, exploration.",
    useCases: ["A/B 测试", "产品实验", "研究型任务"],
    useCasesEn: ["A/B testing", "Product experiments", "Research tasks"],
    exampleInputs: {
      problem: "用户留存率低",
      context: "上周注册用户 1000 人，7 天后只剩 200 人活跃",
    },
    exampleInputsEn: { problem: "Low user retention", context: "1000 signups last week, 200 active after 7 days" },
    steps: [
      {
        name: "Define Problem",
        promptTemplate: `精确定义问题。

问题：{{problem}}
背景：{{context}}

要求：
- 问题的具体表现（数据）
- 为什么重要
- 当前的假设原因
- 可测量的指标`,
      },
      {
        name: "Generate Hypotheses",
        promptTemplate: `生成假设。

问题定义：
{{Define Problem}}

要求：
- 列出 3-5 个可能的原因假设
- 每个假设的依据
- 假设之间的关系
- 按可能性排序`,
      },
      {
        name: "Design Experiments",
        promptTemplate: `设计实验验证假设。

假设列表：
{{Generate Hypotheses}}

要求：
- 为每个假设设计实验方案
- 实验条件和对照组
- 需要的数据和工具
- 预期时长和成本
- 成功/失败的判断标准`,
      },
      {
        name: "Draw Conclusion",
        promptTemplate: `（假设实验已完成）总结结论。

实验设计：
{{Design Experiments}}

模拟实验结果：
[假设] 假设 1 验证通过，假设 2 部分通过，假设 3 失败

要求：
- 得出的结论
- 可采取的行动
- 新的问题或假设
- 建议的下一步`,
      },
    ],
    stepsEn: [
      { name: "Define Problem", promptTemplate: `Define the problem. Problem: {{problem}}, Context: {{context}}\n\nRequirements: Symptoms; why it matters; current hypotheses; measurable metrics.` },
      { name: "Generate Hypotheses", promptTemplate: `Generate hypotheses. Definition: {{Define Problem}}\n\nRequirements: 3-5 possible causes; evidence each; relationships; order by likelihood.` },
      { name: "Design Experiments", promptTemplate: `Design experiments. Hypotheses: {{Generate Hypotheses}}\n\nRequirements: Experiment per hypothesis; conditions & control; data & tools; duration & cost; success/fail criteria.` },
      { name: "Draw Conclusion", promptTemplate: `(Assume experiments done) Summarize. Design: {{Design Experiments}}. Simulated results: [H1 passed, H2 partial, H3 failed]\n\nRequirements: Conclusion; actions; new questions; next steps.` },
    ],
  },
  {
    id: "pros-cons-decision",
    name: "Pros → Cons → Trade-offs → Decision",
    description: "高级判断型分析。适合重大决策、方案对比。",
    category: "advanced",
    nameEn: "Pros → Cons → Trade-offs → Decision",
    descriptionEn: "Structured decision analysis. For major decisions, option comparison.",
    useCases: ["战略决策", "技术选型", "商业判断"],
    useCasesEn: ["Strategy", "Tech selection", "Business judgment"],
    exampleInputs: {
      decision: "是否要重构整个后端架构",
      context: "当前系统维护成本高，但业务稳定运行",
    },
    exampleInputsEn: { decision: "Whether to refactor the entire backend", context: "High maintenance cost but stable" },
    steps: [
      {
        name: "Pros",
        promptTemplate: `列出所有优点。

决策：{{decision}}
背景：{{context}}

要求：
- 短期优点（3-5个）
- 长期优点（3-5个）
- 量化收益（如果可能）
- 谁会受益`,
      },
      {
        name: "Cons",
        promptTemplate: `列出所有缺点。

决策背景：
{{context}}

优点分析：
{{Pros}}

要求：
- 短期缺点和风险
- 长期缺点和风险
- 量化成本（如果可能）
- 谁会受损`,
      },
      {
        name: "Trade-offs",
        promptTemplate: `分析权衡。

优点：
{{Pros}}

缺点：
{{Cons}}

要求：
- 关键的权衡点（3-4个）
- 哪些是必须接受的
- 哪些可以缓解
- 不同利益相关者的视角`,
      },
      {
        name: "Recommendation",
        promptTemplate: `给出建议。

完整分析：
{{Pros}}
{{Cons}}
{{Trade-offs}}

要求：
- 明确建议（做/不做/部分做/延后）
- 推荐理由（最重要的 3 点）
- 如果做，关键成功因素
- 如果不做，替代方案
- 决策的时间窗口`,
      },
    ],
    stepsEn: [
      { name: "Pros", promptTemplate: `List pros. Decision: {{decision}}, Context: {{context}}\n\nRequirements: Short-term pros (3-5); long-term (3-5); quantify if possible; who benefits.` },
      { name: "Cons", promptTemplate: `List cons. Context: {{context}}, Pros: {{Pros}}\n\nRequirements: Short/long-term cons & risks; quantify; who is hurt.` },
      { name: "Trade-offs", promptTemplate: `Analyze trade-offs. Pros: {{Pros}}, Cons: {{Cons}}\n\nRequirements: Key trade-offs (3-4); must-accept; mitigatable; stakeholder views.` },
      { name: "Recommendation", promptTemplate: `Recommend. Analysis: {{Pros}} {{Cons}} {{Trade-offs}}\n\nRequirements: Clear recommendation; top 3 reasons; success factors or alternatives; time window.` },
    ],
  },

  // Code / Development
  {
    id: "code-review",
    name: "Code Generate → Review",
    description: "生成代码并自动审查。适合快速原型、学习示例、代码质量检查。",
    category: "code",
    nameEn: "Code Generate → Review",
    descriptionEn: "Generate code and review. For prototypes, learning, quality check.",
    useCases: ["代码原型", "学习示例", "代码审查"],
    useCasesEn: ["Prototype", "Learning", "Code review"],
    exampleInputs: {
      description: "一个 React 按钮组件，支持 primary 和 secondary 样式",
      language: "typescript",
    },
    exampleInputsEn: { description: "A React button component with primary and secondary styles", language: "typescript" },
    steps: [
      {
        name: "Generate Code",
        promptTemplate: `生成代码。

需求：{{description}}
语言：{{language}}

要求：
- 完整可运行的代码
- 包含必要的注释
- 遵循最佳实践
- 类型安全（如果适用）
- 处理边缘情况`,
      },
      {
        name: "Review Code",
        promptTemplate: `审查代码质量。

代码：
{{Generate Code}}

审查维度：
- 正确性（是否满足需求）
- 可读性和代码风格
- 性能问题
- 安全隐患
- 可维护性
- 改进建议（3-5条具体建议）`,
      },
    ],
    stepsEn: [
      { name: "Generate Code", promptTemplate: `Generate code. Requirement: {{description}}, Language: {{language}}\n\nRequirements: Runnable; comments; best practices; type-safe; edge cases.` },
      { name: "Review Code", promptTemplate: `Review code. Code: {{Generate Code}}\n\nCheck: Correctness; readability; performance; security; maintainability; 3-5 concrete suggestions.` },
    ],
  },
  {
    id: "debug-fix",
    name: "Bug Analysis → Fix → Test",
    description: "系统化调试和修复Bug。分析问题、提出方案、验证修复。",
    category: "code",
    nameEn: "Bug Analysis → Fix → Test",
    descriptionEn: "Systematic debug and fix: analyze, propose, verify.",
    useCases: ["Bug修复", "问题排查", "代码调试"],
    useCasesEn: ["Bug fix", "Troubleshooting", "Debugging"],
    exampleInputs: {
      bug: "用户点击提交按钮后，表单没有响应",
      code: "function handleSubmit() { submitForm(); }",
      error: "TypeError: Cannot read property 'value' of null",
    },
    exampleInputsEn: { bug: "Form does not respond on submit", code: "function handleSubmit() { submitForm(); }", error: "TypeError: Cannot read property 'value' of null" },
    steps: [
      {
        name: "Analyze Bug",
        promptTemplate: `分析Bug根因。

Bug描述：{{bug}}

相关代码：
{{code}}

错误信息：
{{error}}

要求：
- 描述问题现象
- 推测可能的原因（3-5个）
- 需要检查的地方
- 重现步骤`,
      },
      {
        name: "Propose Fix",
        promptTemplate: `提出修复方案。

Bug分析：
{{Analyze Bug}}

要求：
- 提供修复后的代码
- 解释修改的原因
- 说明为什么这样能解决问题
- 是否有副作用`,
      },
      {
        name: "Test Plan",
        promptTemplate: `制定测试计划。

修复方案：
{{Propose Fix}}

要求：
- 单元测试用例（3-5个）
- 边缘情况测试
- 回归测试项
- 验证步骤`,
      },
    ],
    stepsEn: [
      { name: "Analyze Bug", promptTemplate: `Analyze root cause. Bug: {{bug}}, Code: {{code}}, Error: {{error}}\n\nRequirements: Describe symptom; 3-5 possible causes; what to check; repro steps.` },
      { name: "Propose Fix", promptTemplate: `Propose fix. Analysis: {{Analyze Bug}}\n\nRequirements: Fixed code; why; why it fixes; side effects.` },
      { name: "Test Plan", promptTemplate: `Test plan. Fix: {{Propose Fix}}\n\nRequirements: 3-5 unit tests; edge cases; regression; verification.` },
    ],
  },
  {
    id: "api-design",
    name: "API Design → Docs → Examples",
    description: "设计RESTful API接口。从需求到文档到示例代码。",
    category: "code",
    nameEn: "API Design → Docs → Examples",
    descriptionEn: "Design RESTful API: design, docs, example code.",
    useCases: ["API设计", "接口文档", "后端开发"],
    useCasesEn: ["API design", "API docs", "Backend dev"],
    exampleInputs: {
      feature: "用户管理系统",
      operations: "注册、登录、获取用户信息、更新资料",
    },
    exampleInputsEn: { feature: "User management", operations: "Register, login, get user, update profile" },
    steps: [
      {
        name: "Design API",
        promptTemplate: `设计API接口。

功能：{{feature}}
需要的操作：{{operations}}

要求：
- RESTful风格的端点设计
- HTTP方法（GET/POST/PUT/DELETE）
- 请求参数和响应格式
- 状态码定义
- 认证方式`,
      },
      {
        name: "API Documentation",
        promptTemplate: `生成API文档。

API设计：
{{Design API}}

要求（OpenAPI格式）：
- 每个端点的详细说明
- 请求示例（JSON）
- 响应示例（成功和失败）
- 错误码说明
- 认证要求`,
      },
      {
        name: "Code Examples",
        promptTemplate: `生成调用示例。

API文档：
{{API Documentation}}

要求：
- JavaScript/Fetch 示例
- Python/Requests 示例
- cURL 命令示例
- 包含认证header
- 包含错误处理`,
      },
    ],
    stepsEn: [
      { name: "Design API", promptTemplate: `Design API. Feature: {{feature}}, Operations: {{operations}}\n\nRequirements: RESTful endpoints; HTTP methods; params & response; status codes; auth.` },
      { name: "API Documentation", promptTemplate: `API docs. Design: {{Design API}}\n\nRequirements (OpenAPI): Per-endpoint description; request/response examples; error codes; auth.` },
      { name: "Code Examples", promptTemplate: `Code examples. Docs: {{API Documentation}}\n\nRequirements: JS/Fetch; Python/Requests; cURL; auth header; error handling.` },
    ],
  },
  {
    id: "refactor-optimize",
    name: "Code Analysis → Refactor → Optimize",
    description: "代码重构和性能优化。分析现有代码，提出改进方案。",
    category: "code",
    nameEn: "Code Analysis → Refactor → Optimize",
    descriptionEn: "Refactor and optimize. Analyze code, propose improvements.",
    useCases: ["代码重构", "性能优化", "技术债清理"],
    useCasesEn: ["Refactoring", "Performance", "Tech debt"],
    exampleInputs: {
      code: "一段包含重复逻辑和性能问题的代码",
      language: "javascript",
    },
    exampleInputsEn: { code: "Code with duplication and performance issues", language: "javascript" },
    steps: [
      {
        name: "Analyze Code",
        promptTemplate: `分析代码问题。

代码：
{{code}}

语言：{{language}}

要求：
- 识别代码异味（Code Smells）
- 重复代码
- 性能瓶颈
- 复杂度问题
- 可读性问题`,
      },
      {
        name: "Refactor Plan",
        promptTemplate: `制定重构计划。

代码分析：
{{Analyze Code}}

要求：
- 重构优先级（高/中/低）
- 每项的改进方向
- 预期收益
- 风险评估
- 建议的重构步骤`,
      },
      {
        name: "Optimized Code",
        promptTemplate: `提供优化后的代码。

重构计划：
{{Refactor Plan}}

原始代码：
{{code}}

要求：
- 重构后的完整代码
- 关键改动的注释说明
- 性能对比（如果适用）
- 保持功能一致性`,
      },
    ],
    stepsEn: [
      { name: "Analyze Code", promptTemplate: `Analyze code. Code: {{code}}, Language: {{language}}\n\nRequirements: Code smells; duplication; bottlenecks; complexity; readability.` },
      { name: "Refactor Plan", promptTemplate: `Refactor plan. Analysis: {{Analyze Code}}\n\nRequirements: Priority (H/M/L); improvement per item; benefits; risks; steps.` },
      { name: "Optimized Code", promptTemplate: `Optimized code. Plan: {{Refactor Plan}}, Original: {{code}}\n\nRequirements: Full refactored code; comment key changes; performance comparison; same behavior.` },
    ],
  },
  {
    id: "test-cases",
    name: "Test Strategy → Cases → Coverage",
    description: "完整的测试用例设计。从策略到具体用例到覆盖率分析。",
    category: "code",
    nameEn: "Test Strategy → Cases → Coverage",
    descriptionEn: "Test design: strategy, cases, coverage.",
    useCases: ["测试设计", "质量保证", "TDD开发"],
    useCasesEn: ["Test design", "QA", "TDD"],
    exampleInputs: {
      feature: "购物车功能",
      code: "CartManager class",
    },
    exampleInputsEn: { feature: "Shopping cart", code: "CartManager class" },
    steps: [
      {
        name: "Test Strategy",
        promptTemplate: `制定测试策略。

功能：{{feature}}
代码：{{code}}

要求：
- 需要测试的方面（单元/集成/E2E）
- 测试重点
- 边缘情况
- 测试环境要求`,
      },
      {
        name: "Generate Test Cases",
        promptTemplate: `生成测试用例。

测试策略：
{{Test Strategy}}

要求：
- 正常场景测试（5-8个）
- 边界条件测试（3-5个）
- 异常场景测试（3-5个）
- 每个用例包含：输入、期望输出、断言`,
      },
      {
        name: "Test Code",
        promptTemplate: `生成测试代码。

测试用例：
{{Generate Test Cases}}

原始代码：
{{code}}

要求：
- 使用常见测试框架（Jest/Pytest等）
- 完整的测试代码
- Setup和Teardown
- Mock和Stub（如果需要）
- 覆盖率说明`,
      },
    ],
    stepsEn: [
      { name: "Test Strategy", promptTemplate: `Test strategy. Feature: {{feature}}, Code: {{code}}\n\nRequirements: Unit/integration/E2E; focus; edge cases; env.` },
      { name: "Generate Test Cases", promptTemplate: `Test cases. Strategy: {{Test Strategy}}\n\nRequirements: 5-8 normal; 3-5 boundary; 3-5 exception; input, expected, assertion per case.` },
      { name: "Test Code", promptTemplate: `Test code. Cases: {{Generate Test Cases}}, Code: {{code}}\n\nRequirements: Jest/Pytest etc.; full code; setup/teardown; mocks; coverage note.` },
    ],
  },
  {
    id: "architecture-design",
    name: "Requirements → Architecture → Components",
    description: "系统架构设计。从需求到架构图到组件设计。",
    category: "code",
    nameEn: "Requirements → Architecture → Components",
    descriptionEn: "System architecture: requirements, architecture, components.",
    useCases: ["系统设计", "架构规划", "技术选型"],
    useCasesEn: ["System design", "Architecture", "Tech selection"],
    exampleInputs: {
      system: "电商平台",
      requirements: "支持10万用户，高可用，可扩展",
    },
    exampleInputsEn: { system: "E-commerce platform", requirements: "100k users, high availability, scalable" },
    steps: [
      {
        name: "Analyze Requirements",
        promptTemplate: `分析需求和约束。

系统：{{system}}
需求：{{requirements}}

要求：
- 功能需求列表
- 非功能需求（性能、可用性、安全性）
- 技术约束
- 业务约束
- 估算规模（QPS、数据量等）`,
      },
      {
        name: "Design Architecture",
        promptTemplate: `设计系统架构。

需求分析：
{{Analyze Requirements}}

要求：
- 整体架构（分层/微服务/等）
- 主要组件及职责
- 数据流向
- 技术栈选择及理由
- 扩展性设计`,
      },
      {
        name: "Component Design",
        promptTemplate: `详细设计核心组件。

架构设计：
{{Design Architecture}}

要求：
- 选择3-4个核心组件详细设计
- 每个组件的：
  - 接口定义
  - 数据模型
  - 关键算法
  - 依赖关系
  - 部署方式`,
      },
    ],
    stepsEn: [
      { name: "Analyze Requirements", promptTemplate: `Analyze requirements. System: {{system}}, Requirements: {{requirements}}\n\nRequirements: Functional list; NFRs (perf, availability, security); tech & business constraints; scale (QPS, data).` },
      { name: "Design Architecture", promptTemplate: `Design architecture. Analysis: {{Analyze Requirements}}\n\nRequirements: Overall (layers/microservices); main components & roles; data flow; tech stack & rationale; scalability.` },
      { name: "Component Design", promptTemplate: `Design core components. Architecture: {{Design Architecture}}\n\nRequirements: 3-4 components; per component: interface, data model, key logic, dependencies, deployment.` },
    ],
  },

  // Creative
  {
    id: "outline-draft-polish",
    name: "Outline → Draft → Polish",
    description: "结构化写作流程。适合文章、报告、演讲稿。",
    category: "creative",
    nameEn: "Outline → Draft → Polish",
    descriptionEn: "Structured writing: outline, draft, polish. For articles, reports, talks.",
    useCases: ["写文章", "做报告", "准备演讲"],
    useCasesEn: ["Articles", "Reports", "Talks"],
    exampleInputs: {
      topic: "AI 如何改变教育",
      audience: "教育工作者",
      length: "1500字",
    },
    exampleInputsEn: { topic: "How AI is changing education", audience: "Educators", length: "1500 words" },
    steps: [
      {
        name: "Generate Outline",
        promptTemplate: `生成文章大纲。

主题：{{topic}}
受众：{{audience}}
长度：{{length}}

要求：
- 3-5 个主要部分
- 每部分 2-3 个要点
- 逻辑清晰
- 突出重点`,
      },
      {
        name: "Write Draft",
        promptTemplate: `根据大纲撰写初稿。

大纲：
{{Generate Outline}}

要求：
- 每段 100-150 字
- 语言流畅
- 有具体例子
- 符合目标长度`,
      },
      {
        name: "Polish",
        promptTemplate: `优化文章。

初稿：
{{Write Draft}}

优化方向：
- 修正语法错误
- 提升可读性
- 增强感染力
- 确保逻辑连贯
- 优化开头和结尾`,
      },
    ],
    stepsEn: [
      { name: "Generate Outline", promptTemplate: `Generate outline. Topic: {{topic}}, Audience: {{audience}}, Length: {{length}}\n\nRequirements: 3-5 sections; 2-3 points each; clear logic; highlight key points.` },
      { name: "Write Draft", promptTemplate: `Write draft. Outline: {{Generate Outline}}\n\nRequirements: 100-150 words per paragraph; fluent; concrete examples; meet length.` },
      { name: "Polish", promptTemplate: `Polish. Draft: {{Write Draft}}\n\nImprove: grammar; readability; impact; coherence; opening & closing.` },
    ],
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: "professional", name: "工作", color: "blue" },
  { id: "learning", name: "学习", color: "green" },
  { id: "code", name: "开发", color: "indigo" },
  { id: "travel", name: "生活旅游", color: "purple" },
  { id: "advanced", name: "高级分析", color: "orange" },
  { id: "creative", name: "创意", color: "pink" },
] as const;
