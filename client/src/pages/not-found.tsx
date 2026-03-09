import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2" data-testid="heading-not-found">Page Not Found</h1>
          <p className="text-muted-foreground mb-6" data-testid="text-not-found-message">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/">
              <Button className="bg-[#00A4E4] hover:bg-[#0090c9]" data-testid="button-go-home">
                Go to Home
              </Button>
            </a>
            <a href="/login">
              <Button variant="outline" data-testid="button-go-login">
                Sign In
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
