import { Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FoundingBadgeProps {
  seatNumber: number;
  isGenesis?: boolean;
  total?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Permanent "Founding Member #N of 1,000" badge. Kept forever once earned.
export function FoundingBadge({
  seatNumber,
  isGenesis = false,
  total = 1000,
  size = "md",
  className,
}: FoundingBadgeProps) {
  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };
  const iconSize = { sm: "h-3 w-3", md: "h-4 w-4", lg: "h-5 w-5" }[size];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold border whitespace-nowrap",
        isGenesis
          ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
          : "bg-[#00A4E4]/10 text-[#00A4E4] border-[#00A4E4]/40",
        sizes[size],
        className,
      )}
      data-testid={`badge-founding-${seatNumber}`}
    >
      {isGenesis ? <Crown className={iconSize} /> : <Sparkles className={iconSize} />}
      {isGenesis ? "Genesis Circle · " : ""}Founding Member #{seatNumber} of {total}
    </span>
  );
}
