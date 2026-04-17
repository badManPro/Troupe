"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { QuickStartAction } from "@/lib/chat/phase-chat-guidance";
import { cn } from "@/lib/utils";

interface ChatPromptSuggestionsProps {
  title: string;
  actions: QuickStartAction[];
  onSelect: (message: string) => void;
  className?: string;
}

export const ChatPromptSuggestions = memo(function ChatPromptSuggestions({
  title,
  actions,
  onSelect,
  className,
}: ChatPromptSuggestionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-primary/15 bg-primary/5 p-3 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full border-primary/20 bg-background/80">
          对话建议
        </Badge>
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{title}</span>
        </div>
        <span className="text-xs text-muted-foreground">剩余 {actions.length} 个</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto max-w-full whitespace-normal rounded-xl px-3 py-2 text-left text-xs leading-relaxed"
            onClick={() => onSelect(action.prompt)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
});
