import { useOnlineStatus } from "@/hooks/use-online-status";
import { getQueueCount } from "@/lib/offline-queue";
import { WifiOff, Wifi, CloudUpload } from "lucide-react";
import { Link } from "wouter";

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const queueCount = getQueueCount();

  if (isOnline && wasOffline && queueCount > 0) {
    return (
      <Link href="/ownbank/payment-queue">
        <div className="bg-emerald-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-emerald-600 transition-colors" data-testid="banner-sync-available">
          <CloudUpload className="h-3.5 w-3.5" />
          Back online — {queueCount} queued payment{queueCount !== 1 ? "s" : ""} ready to sync
        </div>
      </Link>
    );
  }

  if (!isOnline) {
    return (
      <div className="bg-amber-500 text-white text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2" data-testid="banner-offline">
        <WifiOff className="h-3.5 w-3.5" />
        You're offline — payments will be queued and synced when you reconnect
        {queueCount > 0 && (
          <span className="bg-white/20 rounded-full px-2 py-0.5 ml-1">{queueCount} queued</span>
        )}
      </div>
    );
  }

  return null;
}
