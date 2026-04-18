"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DOCUMENT_TYPE_LABELS } from "@/lib/documents/catalog";
import type {
  DocumentGenerationState,
  DocumentGenerationStatusPhase,
} from "@/lib/documents/generation-stream";
import type { DocumentType } from "@/types";

interface DocumentGenerationDialogProps {
  open: boolean;
  docType: DocumentType | null;
  generationState: DocumentGenerationState;
  isRunning: boolean;
  onOpenChange: (open: boolean) => void;
}

const PHASE_SEQUENCE: DocumentGenerationStatusPhase[] = [
  "queued",
  "thinking",
  "composing",
  "streaming",
  "complete",
];

const PHASE_LABELS: Record<DocumentGenerationStatusPhase, string> = {
  queued: "已提交",
  thinking: "分析上下文",
  composing: "整理文档",
  streaming: "回传内容",
  complete: "同步完成",
  error: "生成失败",
};

function getPhaseState(
  currentPhase: DocumentGenerationStatusPhase | null,
  phase: DocumentGenerationStatusPhase
) {
  if (!currentPhase) return "upcoming";
  if (currentPhase === "error") return "upcoming";

  const currentIndex = PHASE_SEQUENCE.indexOf(currentPhase);
  const phaseIndex = PHASE_SEQUENCE.indexOf(phase);

  if (phaseIndex < currentIndex) return "done";
  if (phaseIndex === currentIndex) return "active";
  return "upcoming";
}

export function DocumentGenerationDialog({
  open,
  docType,
  generationState,
  isRunning,
  onOpenChange,
}: DocumentGenerationDialogProps) {
  const documentLabel = docType
    ? DOCUMENT_TYPE_LABELS[docType] || docType
    : "文档";
  const currentPhase = generationState.status?.phase ?? null;
  const canClose = !isRunning;
  const hasPreview = generationState.previewText.trim().length > 0;
  const isError = generationState.status?.phase === "error";
  const isComplete = generationState.status?.phase === "complete";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !canClose) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="max-h-[88vh] max-w-5xl gap-0 overflow-hidden border-border/70 bg-background/95 p-0 shadow-2xl [&>button:last-child]:hidden"
        onEscapeKeyDown={canClose ? undefined : (event) => event.preventDefault()}
        onInteractOutside={canClose ? undefined : (event) => event.preventDefault()}
      >
        <div className="relative flex min-h-[38rem] flex-col overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.12),transparent_30%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0.02),transparent_30%)]" />
          <DialogHeader className="relative border-b border-border/60 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    {documentLabel}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px]",
                      isError && "bg-destructive/10 text-destructive"
                    )}
                  >
                    {generationState.status?.label ?? "准备生成"}
                  </Badge>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
                    {isComplete
                      ? `${documentLabel}已准备好`
                      : isError
                        ? `${documentLabel}生成中断`
                        : `正在生成${documentLabel}`}
                  </DialogTitle>
                  <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {generationState.status?.detail ??
                      "我会持续回传 AI 生成状态和正文预览，避免等待时像卡住。"}
                  </DialogDescription>
                </div>
              </div>

              <div className="hidden items-center gap-3 rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm sm:flex">
                <div className="relative flex h-14 w-14 items-center justify-center">
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full border",
                      isError
                        ? "border-destructive/30"
                        : "border-primary/25"
                    )}
                    animate={isRunning ? { rotate: 360 } : { rotate: 0 }}
                    transition={
                      isRunning
                        ? { duration: 9, repeat: Infinity, ease: "linear" }
                        : undefined
                    }
                  />
                  <motion.div
                    className={cn(
                      "absolute inset-[7px] rounded-full border border-dashed",
                      isError
                        ? "border-destructive/30"
                        : "border-emerald-500/30"
                    )}
                    animate={isRunning ? { rotate: -360 } : { rotate: 0 }}
                    transition={
                      isRunning
                        ? { duration: 7, repeat: Infinity, ease: "linear" }
                        : undefined
                    }
                  />
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      isError
                        ? "bg-destructive/10 text-destructive"
                        : isComplete
                          ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300"
                          : "bg-primary/10 text-primary"
                    )}
                  >
                    {isError ? (
                      <TriangleAlert className="h-4 w-4" />
                    ) : isComplete ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
                    AI Working
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {isComplete ? "已完成" : isError ? "已停止" : "生成进行中"}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="relative grid min-h-0 flex-1 gap-0 lg:grid-cols-[16rem,minmax(0,1fr)]">
            <div className="border-b border-border/60 bg-muted/20 p-4 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
                生成进度
              </div>

              <div className="space-y-3">
                {PHASE_SEQUENCE.map((phase, index) => {
                  const phaseState = getPhaseState(currentPhase, phase);
                  return (
                    <motion.div
                      key={phase}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "rounded-2xl border px-3 py-3 transition-colors",
                        phaseState === "done" &&
                          "border-emerald-200 bg-emerald-50/80 dark:border-emerald-500/20 dark:bg-emerald-500/10",
                        phaseState === "active" &&
                          "border-primary/30 bg-primary/5 shadow-sm",
                        phaseState === "upcoming" &&
                          "border-border/60 bg-background/70"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            phaseState === "done" &&
                              "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-emerald-950",
                            phaseState === "active" && "bg-primary text-primary-foreground",
                            phaseState === "upcoming" &&
                              "bg-muted text-muted-foreground"
                          )}
                        >
                          {phaseState === "done" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : phaseState === "active" ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {PHASE_LABELS[phase]}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {phase === "streaming"
                              ? "正文预览会实时刷新"
                              : phase === "complete"
                                ? "文档列表会同步刷新"
                                : "等待当前阶段推进"}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {isError && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-3 py-3 text-sm text-destructive">
                    <div className="font-medium">本次生成未完成</div>
                    <div className="mt-1 text-xs leading-5 text-destructive/80">
                      {generationState.error ?? "请求中断，请稍后重试。"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-border/60 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      AI 返回预览
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      这里展示模型已经回传的文档内容，不需要等整篇完成才有反馈。
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                    {hasPreview
                      ? `${generationState.previewText.length} 字符`
                      : "等待首段内容"}
                  </Badge>
                </div>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="px-5 py-5">
                  <AnimatePresence mode="wait" initial={false}>
                    {hasPreview ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="rounded-[26px] border border-border/70 bg-card/80 px-5 py-4 shadow-sm"
                      >
                        <ChatMarkdown content={generationState.previewText} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="placeholder"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="rounded-[26px] border border-dashed border-border/70 bg-card/70 px-5 py-5 shadow-sm"
                      >
                        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
                          <Sparkles className="h-4 w-4 text-primary" />
                          正在等待 AI 返回首段内容
                        </div>
                        <div className="space-y-3">
                          {[72, 90, 64, 82, 58].map((width, index) => (
                            <motion.div
                              key={width}
                              className="h-3 rounded-full bg-muted"
                              animate={{ opacity: [0.28, 0.75, 0.28] }}
                              transition={{
                                duration: 1.6,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: index * 0.12,
                              }}
                              style={{ width: `${width}%` }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              <div className="border-t border-border/60 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    {isRunning
                      ? "生成过程中会持续展示阶段变化和已返回内容。"
                      : isError
                        ? "关闭后可以重新发起一次生成。"
                        : "文档已落到右侧文档面板，可继续查看或编辑。"}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => onOpenChange(false)}
                    disabled={!canClose}
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        生成中
                      </>
                    ) : (
                      "关闭"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
