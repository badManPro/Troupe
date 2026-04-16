"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  formatQuestionnaireResponse,
} from "@/lib/chat/questionnaire";
import type { ChatQuestionnaire } from "@/types/chat";

interface QuestionnaireCardProps {
  questionnaire: ChatQuestionnaire;
  disabled?: boolean;
  onSubmit: (message: string) => void;
}

export function QuestionnaireCard({
  questionnaire,
  disabled = false,
  onSubmit,
}: QuestionnaireCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const canSubmit = questionnaire.questions.every((question) =>
    Boolean(answers[question.id]?.trim())
  );

  return (
    <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
      <div className="mb-4 flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <div className="text-sm font-medium text-foreground">
            {questionnaire.title}
          </div>
          {questionnaire.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {questionnaire.description}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {questionnaire.questions.map((question, index) => {
          const value = answers[question.id] ?? "";

          return (
            <div key={question.id} className="space-y-2">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-foreground">
                  {index + 1}. {question.prompt}
                </label>
                {question.description && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {question.description}
                  </p>
                )}
              </div>

              {question.fieldType === "single_choice" && question.options ? (
                <div className="flex flex-wrap gap-2">
                  {question.options.map((option) => {
                    const selected = value === option.label;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.label,
                          }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-left text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-background/80",
                          disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : question.fieldType === "long_text" ? (
                <Textarea
                  value={value}
                  disabled={disabled}
                  placeholder={question.placeholder}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  rows={3}
                  className="resize-y bg-background"
                />
              ) : (
                <Input
                  value={value}
                  disabled={disabled}
                  placeholder={question.placeholder}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  className="bg-background"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          disabled={!canSubmit || disabled}
          onClick={() => onSubmit(formatQuestionnaireResponse(questionnaire, answers))}
        >
          提交回答
        </Button>
      </div>
    </div>
  );
}
