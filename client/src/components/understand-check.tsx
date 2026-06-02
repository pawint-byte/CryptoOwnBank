import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * UnderstandCheck — the "School of CryptoOwnBank" teach-verify block.
 *
 * The house rhythm for every high-stakes / irreversible member moment:
 *   1. Explain   — one plain sentence: what's about to happen + what can't be undone.
 *   2. Verify    — a small, specific check that proves they got the ONE thing that matters.
 *   3. Proceed   — only unlocks once the check is answered correctly.
 *
 * A wrong answer never scolds and never permanently blocks: it re-explains warmly
 * and lets them try again. Use this ONLY at genuinely irreversible forks — keep
 * reversible actions frictionless.
 */

export interface UnderstandOption {
  label: string;
  correct?: boolean;
}

export interface UnderstandCheckProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The "Explain" headline. */
  title: string;
  /** Plain-language explanation: what happens and what can't be undone. */
  explanation: React.ReactNode;
  /** The single comprehension question that matters here. */
  question: string;
  /** Answer choices. Mark exactly one (or more) with `correct: true`. */
  options: UnderstandOption[];
  /** Warm re-explanation shown after a wrong answer (no scolding). */
  incorrectFeedback: React.ReactNode;
  /** Label for the final proceed button (only enabled once correct). */
  proceedLabel: string;
  /** Called when the member answers correctly and clicks proceed. */
  onConfirmed: () => void;
  /** Optional cancel/back label. Defaults to "Not yet". */
  cancelLabel?: string;
  testId?: string;
}

export function UnderstandCheck({
  open,
  onOpenChange,
  title,
  explanation,
  question,
  options,
  incorrectFeedback,
  proceedLabel,
  onConfirmed,
  cancelLabel = "Not yet",
  testId = "understand-check",
}: UnderstandCheckProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect">("idle");

  // Reset every time the dialog re-opens so a previous pass can't carry over.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setStatus("idle");
    }
  }, [open]);

  const handlePick = (index: number) => {
    setSelected(index);
    setStatus(options[index]?.correct ? "correct" : "incorrect");
  };

  const handleProceed = () => {
    if (status !== "correct") return;
    onConfirmed();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid={`dialog-${testId}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-[#00A4E4]" />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground pt-1">{explanation}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm font-medium" data-testid={`text-${testId}-question`}>
            {question}
          </p>
          <div className="space-y-2" role="radiogroup" aria-label={question}>
            {options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrectPick = isSelected && status === "correct";
              const isWrongPick = isSelected && status === "incorrect";
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handlePick(i)}
                  data-testid={`button-${testId}-option-${i}`}
                  className={cn(
                    "w-full text-left rounded-md border px-3 py-2 text-sm transition-colors hover-elevate active-elevate-2",
                    isCorrectPick && "border-green-600 bg-green-600/10",
                    isWrongPick && "border-amber-600 bg-amber-600/10",
                    !isSelected && "border-border",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {isCorrectPick && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>

          {status === "incorrect" && (
            <div
              className="rounded-md border border-amber-600/40 bg-amber-600/10 p-3 text-sm"
              data-testid={`text-${testId}-feedback`}
            >
              <p className="font-medium mb-1 flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Let's go over that once more
              </p>
              <div className="text-muted-foreground">{incorrectFeedback}</div>
            </div>
          )}

          {status === "correct" && (
            <div
              className="rounded-md border border-green-600/40 bg-green-600/10 p-3 text-sm text-green-700 dark:text-green-400"
              data-testid={`text-${testId}-confirmed`}
            >
              That's right. You've got it.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            data-testid={`button-${testId}-cancel`}
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleProceed}
            disabled={status !== "correct"}
            data-testid={`button-${testId}-proceed`}
          >
            {proceedLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
