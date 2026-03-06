import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface IntegrationCardProps {
  name: string;
  provider: string;
  logo?: React.ReactNode;
  isConnected: boolean;
  lastSync?: Date | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function IntegrationCard({
  name,
  provider,
  logo,
  isConnected,
  lastSync,
  onConnect,
  onDisconnect,
  onSync,
  isSyncing,
}: IntegrationCardProps) {
  return (
    <Card className="hover-elevate">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
              {logo || <Link2 className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{name}</h3>
              <p className="text-sm text-muted-foreground capitalize truncate">{provider}</p>
            </div>
          </div>
          <Badge
            variant={isConnected ? "default" : "secondary"}
            className={cn(
              "gap-1",
              isConnected && "bg-chart-2 hover:bg-chart-2"
            )}
          >
            {isConnected ? (
              <>
                <Check className="h-3 w-3" />
                Connected
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        {isConnected && lastSync && (
          <p className="text-xs text-muted-foreground mt-4">
            Last synced: {format(new Date(lastSync), "MMM d, yyyy 'at' h:mm a")}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          {isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onSync}
                disabled={isSyncing}
                data-testid={`button-sync-${provider}`}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                data-testid={`button-disconnect-${provider}`}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={onConnect}
              data-testid={`button-connect-${provider}`}
            >
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
