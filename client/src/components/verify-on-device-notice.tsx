import { ShieldAlert } from "lucide-react";

interface VerifyOnDeviceNoticeProps {
  walletLabel?: string;
  className?: string;
}

export function VerifyOnDeviceNotice({
  walletLabel = "your wallet",
  className = "",
}: VerifyOnDeviceNoticeProps) {
  return (
    <div
      role="note"
      aria-label="Verify the transaction on your wallet device before approving"
      className={`rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 ${className}`}
      data-testid="notice-verify-on-device"
    >
      <div className="flex gap-3 items-start">
        <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
            Verify on {walletLabel} — not just here.
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90">
            Before approving, read the destination address and amount on{" "}
            <strong>{walletLabel}'s own screen</strong> and confirm they match what you
            intended. That screen is the most trustworthy place to check the key fields,
            because we can&rsquo;t see or alter what your wallet shows you. Never approve
            a transaction without reading those details first.
          </p>
        </div>
      </div>
    </div>
  );
}
