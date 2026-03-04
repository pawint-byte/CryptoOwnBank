import { AlertTriangle } from "lucide-react";

export function XrplDisclaimer() {
  return (
    <div
      className="flex items-start gap-3 rounded-lg border border-[#00A4E4]/30 bg-[#00A4E4]/5 p-4 text-sm"
      data-testid="xrpl-disclaimer"
    >
      <AlertTriangle className="h-5 w-5 text-[#00A4E4] shrink-0 mt-0.5" />
      <p className="text-muted-foreground">
        This is not financial advice. Not a bank. You control your keys and
        funds at all times. All transactions are signed client-side via your
        cold wallet — we never store or access your private keys.
      </p>
    </div>
  );
}
