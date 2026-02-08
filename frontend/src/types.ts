export type StepType = "action" | "reflection";
export type OnCompleteAction = "continue" | "retry" | "skip_next" | "branch" | "stop";

export interface StepConditionIfElse {
  if: string;
  then: OnCompleteAction;
  else: OnCompleteAction;
}
export interface StepConditionRoute {
  route: Array<{ when: string; toOrderIndex: number }>;
}
export type StepCondition = StepConditionIfElse | StepConditionRoute;

export interface StepChecks {
  mustContain?: string;
  mustBeJson?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface AgentStepCreate {
  name: string;
  promptTemplate: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stepType?: StepType;
  decisionPrompt?: string;
  onCompleteDefault?: OnCompleteAction;
  condition?: StepCondition;
  maxRetries?: number;
  checks?: StepChecks;
}
export interface AgentStepUpdate extends AgentStepCreate {
  id?: string;
  orderIndex: number;
}

export interface Step {
  id: string;
  name: string;
  promptTemplate: string;
  orderIndex: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  config?: string;
  stepType?: StepType;
  decisionPrompt?: string | null;
  onCompleteDefault?: OnCompleteAction | null;
  condition?: StepCondition | null;
  maxRetries?: number | null;
  checks?: StepChecks | null;
}

export interface Agent {
  id: string;
  name: string;
  maxRetries?: number | null;
  steps: Step[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  ok: boolean;
  message?: string;
  details?: string;
}

export interface StepRun {
  id: string;
  runId: string;
  stepId: string;
  step: Step;
  orderIndex: number;
  input: string | null;
  prompt: string;
  output: string | null;
  evaluation: string | null;
  nextAction: string | null;
  decisionType?: string | null;
  decisionInput?: string | null;
  decisionOutput: string | null;
  nextStepIndex: number | null;
  checkResult?: string | null; // JSON string of CheckResult
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  cost: number;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

export interface Run {
  id: string;
  agentId: string;
  agent: Agent;
  datasetId: string | null;
  dataset?: Dataset;
  caseIndex: number | null;
  shareToken: string | null;
  totalTokens: number;
  totalCost: number;
  totalLatencyMs: number;
  status: string;
  stopReason?: string | null;
  rating: number | null;
  note: string | null;
  tags: string | null;
  createdAt: string;
  stepRuns: StepRun[];
}

export interface Dataset {
  id: string;
  agentId: string;
  agent?: Agent;
  name: string;
  cases: string; // JSON string
  createdAt: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  _count?: { templates: number };
}

export interface Template {
  id: string;
  categoryId: string | null;
  category?: TemplateCategory | null;
  builtinCategoryId: string | null; // e.g. "professional", "learning"
  name: string;
  description: string;
  steps: string; // JSON
  exampleInputs: string | null;
  useCases: string | null;
  createdAt: string;
}
