import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";

type LegacyCheckInData = {
  plan: {
    status: string;
    lastCheckIn: string | null;
    nextCheckInDue: string | null;
    gracePeriodDays: number;
    graceStartedAt: string | null;
  } | null;
} | null;

const DAY_MS = 1000 * 60 * 60 * 24;

export function LegacyCheckInCard() {
  const { toast } = useToast();

  const { data } = useQuery<LegacyCheckInData>({
    queryKey: ["/api/legacy-plan"],
    retry: false,
  });

  const checkIn = useMutation({
    mutationFn: () => apiRequest("POST", "/api/legacy-plan/check-in"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/legacy-plan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({ title: "Checked in!", description: "Your Legacy Plan timer has been reset." });
    },
    onError: () => toast({ title: "Error", description: "Check-in failed", variant: "destructive" }),
  });

  const plan = data?.plan;
  if (!plan || plan.status === "triggered") return null;

  const now = new Date();
  const nextDue = plan.nextCheckInDue ? new Date(plan.nextCheckInDue) : null;
  const daysUntilDue = nextDue ? Math.ceil((nextDue.getTime() - now.getTime()) / DAY_MS) : null;
  const isGrace = plan.status === "grace";
  const isDue = isGrace || (daysUntilDue !== null && daysUntilDue <= 0);
  const isSoon = !isDue && daysUntilDue !== null && daysUntilDue <= 7;

  let graceDaysLeft: number | null = null;
  if (isGrace) {
    const graceStart = plan.graceStartedAt ? new Date(plan.graceStartedAt) : now;
    const graceEnd = new Date(graceStart);
    graceEnd.setDate(graceEnd.getDate() + (plan.gracePeriodDays || 14));
    graceDaysLeft = Math.ceil((graceEnd.getTime() - now.getTime()) / DAY_MS);
  }

  const tone = isDue
    ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
    : isSoon
      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";

  const Icon = isDue ? AlertTriangle : isSoon ? AlertTriangle : ShieldCheck;
  const iconTone = isDue ? "text-red-500" : isSoon ? "text-amber-500" : "text-green-600";
  const titleTone = isDue
    ? "text-red-800 dark:text-red-200"
    : isSoon
      ? "text-amber-800 dark:text-amber-200"
      : "text-green-800 dark:text-green-200";
  const subTone = isDue
    ? "text-red-700 dark:text-red-300"
    : isSoon
      ? "text-amber-700 dark:text-amber-300"
      : "text-green-700 dark:text-green-300";

  const title = isGrace
    ? "Legacy Plan: check in now"
    : isDue
      ? "Legacy Plan: check-in due now"
      : isSoon
        ? `Legacy Plan: check-in due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`
        : "Legacy Plan: you're all set";

  const subtitle = isGrace
    ? `You missed a check-in. ${graceDaysLeft !== null && graceDaysLeft > 0 ? `${graceDaysLeft} day${graceDaysLeft !== 1 ? "s" : ""} left` : "Expiring soon"} before your beneficiaries are notified.`
    : isDue
      ? "Confirm you're active to reset your timer."
      : daysUntilDue !== null
        ? `Next check-in due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}.${plan.lastCheckIn ? ` Last: ${new Date(plan.lastCheckIn).toLocaleDateString()}.` : ""}`
        : "Tap to confirm you're active and reset your timer.";

  const btnTone = isDue
    ? "bg-red-600 hover:bg-red-700 text-white"
    : isSoon
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "";

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${tone}`}
      data-testid="card-dashboard-checkin"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconTone}`} />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${titleTone}`} data-testid="text-checkin-title">{title}</p>
          <p className={`text-xs mt-0.5 ${subTone}`}>{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          className={btnTone}
          onClick={() => checkIn.mutate()}
          disabled={checkIn.isPending}
          data-testid="button-dashboard-checkin"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          {checkIn.isPending ? "Checking in..." : "I'm Still Here"}
        </Button>
        <Link href="/legacy-plan">
          <Button variant="ghost" size="sm" data-testid="link-manage-legacy-plan">
            Manage
            <ChevronRight className="h-4 w-4 ml-0.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
