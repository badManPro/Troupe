"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardCheck,
  Compass,
  ListChecks,
  ShieldAlert,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentRole } from "@/types";

interface QuickStartAction {
  label: string;
  prompt: string;
}

interface RequirementsGuideConfig {
  roleLabel: string;
  summary: string;
  goals: string[];
  topics: string[];
  deliverables: string[];
  note: string;
  actions: QuickStartAction[];
}

const PM_GUIDE: RequirementsGuideConfig = {
  roleLabel: "产品经理视角",
  summary:
    "把头脑风暴里的模糊想法收束成一份能评审、能继续设计、能指导开发的需求说明。",
  goals: [
    "说清楚产品服务谁，优先解决什么问题。",
    "把核心使用场景和主流程讲顺，不再停留在想法层。",
    "压缩首版范围，明确 MVP 边界和功能优先级。",
  ],
  topics: [
    "目标用户、使用场景、触发时机分别是什么。",
    "用户从进入产品到完成任务，关键链路怎么走。",
    "哪些功能是 P0 必须有，哪些可以延后到 P1 / P2。",
    "是否存在依赖、约束、假设和暂不做的范围。",
  ],
  deliverables: [
    "一份结构化 PRD 骨架。",
    "核心用户故事和主流程说明。",
    "P0 / P1 / P2 功能清单与 MVP 范围。",
  ],
  note: "建议先和产品经理收敛范围，再切到 QA 补验收标准和风险点。",
  actions: [
    {
      label: "先帮我搭 PRD 骨架",
      prompt:
        "我们已经进入需求定义阶段。请先告诉我这个阶段要完成什么，然后基于现有想法帮我搭一版 PRD 骨架，并指出还缺哪些关键信息需要我补充。",
    },
    {
      label: "一起收敛 MVP 范围",
      prompt:
        "请带我一起收敛 MVP，帮我把功能拆成 P0 / P1 / P2，并提醒我哪些内容首版应该先不做。",
    },
    {
      label: "整理用户故事和主流程",
      prompt:
        "请把当前想法整理成目标用户、核心场景、用户故事和主流程，并用需求定义阶段的方式继续追问我。",
    },
  ],
};

const QA_GUIDE: RequirementsGuideConfig = {
  roleLabel: "QA 评审视角",
  summary:
    "从测试和交付风险的角度检查需求是否完整，提前补齐边界场景、验收标准和模糊点。",
  goals: [
    "找出需求里容易遗漏的异常流程和边界情况。",
    "把“做完算完成”的标准定义清楚，避免后续反复返工。",
    "提前暴露上线和实现风险，降低设计开发阶段的不确定性。",
  ],
  topics: [
    "正常流程之外，失败、空状态、重复操作和权限问题怎么处理。",
    "每个核心功能的验收标准是什么，什么情况下算通过。",
    "是否有性能、数据一致性、兼容性或安全方面的隐含要求。",
    "当前 PRD 里还有哪些表述模糊、容易产生歧义。",
  ],
  deliverables: [
    "需求缺口和歧义清单。",
    "关键边界场景与异常流程补充。",
    "验收标准和主要风险点列表。",
  ],
  note: "如果主流程和功能优先级还没定住，先切回产品经理把 PRD 主体收住再来评审。",
  actions: [
    {
      label: "从 QA 角度审查需求",
      prompt:
        "请从 QA 角度审查当前需求，告诉我这个模块还缺哪些边界场景、异常流程和容易引起歧义的点。",
    },
    {
      label: "补验收标准",
      prompt:
        "请基于当前需求帮我补一版验收标准，按核心功能拆分，并指出每条标准对应的关注点。",
    },
    {
      label: "列风险和开放问题",
      prompt:
        "请帮我列出当前需求阶段最值得现在确认的风险点和开放问题，按优先级从高到低排一下。",
    },
  ],
};

function GuideBlock({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RequirementsGuideCard({
  role,
  onPromptSelect,
}: {
  role: AgentRole;
  onPromptSelect: (message: string) => void;
}) {
  const guide = role === "qa" ? QA_GUIDE : PM_GUIDE;

  return (
    <div className="mx-auto mt-6 max-w-5xl rounded-[28px] border border-primary/15 bg-primary/5 p-4 text-left shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full border-primary/20 bg-background/80">
          需求定义阶段
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {guide.roleLabel}
        </Badge>
      </div>

      <div className="mt-3 max-w-3xl">
        <h3 className="text-base font-semibold text-foreground">
          这个模块不是继续发散，而是把想法收束成可执行需求。
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {guide.summary}
        </p>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <GuideBlock title="这个模块要做什么" icon={Target} items={guide.goals} />
        <GuideBlock title="你们需要商讨什么" icon={Compass} items={guide.topics} />
        <GuideBlock
          title="完成后应该产出什么"
          icon={ClipboardCheck}
          items={guide.deliverables}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-border/60 bg-background/75 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ListChecks className="h-4 w-4 text-primary" />
          你可以直接这样开始
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {guide.actions.map((action) => (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-auto max-w-full whitespace-normal rounded-xl px-3 py-2 text-left text-xs leading-relaxed"
              onClick={() => onPromptSelect(action.prompt)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-foreground shadow-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-foreground">
        <div className="mt-0.5 rounded-full bg-amber-100 p-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
        </div>
        <div className="min-w-0">
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
            建议
          </div>
          <span className="font-medium text-foreground/90 dark:text-foreground">
            {guide.note}
          </span>
        </div>
      </div>
    </div>
  );
}
