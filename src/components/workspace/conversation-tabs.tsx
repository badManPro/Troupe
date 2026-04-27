"use client";

import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types";

interface ConversationTabsProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (conversationId: string) => void;
}

export function ConversationTabs({
  conversations,
  activeConversationId,
  onSelect,
}: ConversationTabsProps) {
  return (
    <div className="border-b border-border/55 bg-background/32 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">
          当前角色会话
        </div>
        <div className="rounded-full border border-border/60 bg-background/55 px-2 py-0.5 text-[10px] text-muted-foreground">
          {conversations.length} 条
        </div>
      </div>

      <div className="mt-2 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 pr-4">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "min-w-0 max-w-[12rem] rounded-xl border px-3 py-2 text-left text-xs transition-all",
                activeConversationId === conversation.id
                  ? "border-primary/35 bg-primary/12 text-primary shadow-[0_10px_28px_hsl(255_92%_76%/0.12)]"
                  : "border-border/60 bg-background/55 text-muted-foreground hover:border-primary/20 hover:bg-accent/30 hover:text-foreground"
              )}
              title={conversation.title ?? conversation.label}
            >
              <div className="truncate font-medium">
                {conversation.label || "新对话"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
