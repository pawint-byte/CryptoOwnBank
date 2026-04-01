import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BrainCircuit, Send, Plus, History, ArrowLeft, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistant() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: limits } = useQuery<any>({ queryKey: ["/api/subscription/limits"] });
  const { data: usage } = useQuery<{ limit: number | null; used: number; tier: string }>({
    queryKey: ["/api/ai/usage"],
  });
  const { data: historyData } = useQuery<any[]>({
    queryKey: ["/api/ai/history"],
    enabled: showHistory,
  });

  const { data: portfolio } = useQuery<any>({ queryKey: ["/api/portfolio/summary"] });
  const { data: walletBalances } = useQuery<any[]>({ queryKey: ["/api/wallets"] });

  const tier = usage?.tier || limits?.tier || "free";
  const isFree = tier === "free";
  const chatLimit = usage?.limit;
  const chatsUsed = usage?.used || 0;
  const isUnlimited = chatLimit === null;
  const hasChatsLeft = isUnlimited || chatsUsed < (chatLimit || 0);

  const buildPortfolioContext = () => {
    const parts: string[] = [];
    if (portfolio) {
      if (portfolio.totalValue) parts.push(`Total portfolio value: $${Number(portfolio.totalValue).toLocaleString()}`);
      if (portfolio.positions?.length) {
        const top = portfolio.positions.slice(0, 10).map((p: any) =>
          `${p.assetSymbol}: ${Number(p.quantity).toFixed(4)} (${p.percentOfTotal ? p.percentOfTotal + "%" : ""})`
        ).join(", ");
        parts.push(`Top holdings: ${top}`);
      }
    }
    if (walletBalances && Array.isArray(walletBalances)) {
      const chains = new Set(walletBalances.map((w: any) => w.chain));
      parts.push(`Connected chains: ${Array.from(chains).join(", ")}`);
      parts.push(`Wallet count: ${walletBalances.length}`);
    }
    return parts.length > 0 ? parts.join("\n") : undefined;
  };

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const newMessages = [...messages, { role: "user" as const, content: userMessage }];
      const res = await apiRequest("POST", "/api/ai/chat", {
        messages: newMessages,
        sessionId,
        portfolioContext: buildPortfolioContext(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to get AI response";
      if (msg.includes("used all")) {
        toast({ title: "Chat limit reached", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    },
  });

  const loadSessionMutation = useMutation({
    mutationFn: async (sid: string) => {
      const res = await apiRequest("GET", `/api/ai/session/${sid}`);
      return res.json();
    },
    onSuccess: (data, sid) => {
      setSessionId(sid);
      setMessages(data.map((m: any) => ({ role: m.role, content: m.content })));
      setShowHistory(false);
    },
  });

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    chatMutation.mutate(trimmed);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setShowHistory(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isFree) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Portfolio Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask questions about your portfolio, crypto concepts, and platform features</p>
          </div>
        </div>
        <UpgradePrompt feature="AI Portfolio Assistant" />
      </div>
    );
  }

  if (showHistory) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)} data-testid="button-back-chat">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-bold">Chat History</h1>
        </div>
        {!historyData ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : historyData.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No previous conversations</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {historyData.map((s: any) => (
              <Card
                key={s.sessionId}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => loadSessionMutation.mutate(s.sessionId)}
                data-testid={`card-session-${s.sessionId}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate max-w-[70%]">{s.lastMessage}</p>
                    <Badge variant="secondary" className="text-xs">{s.messageCount} msgs</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(s.lastAt).toLocaleDateString()} {new Date(s.lastAt).toLocaleTimeString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Portfolio Assistant</h1>
            <p className="text-sm text-muted-foreground">
              {isUnlimited
                ? "Unlimited conversations"
                : `${chatsUsed} / ${chatLimit} chats used this month`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} data-testid="button-history">
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button variant="outline" size="sm" onClick={handleNewChat} data-testid="button-new-chat">
            <Plus className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
              <BrainCircuit className="h-16 w-16 text-muted-foreground/30" />
              <div>
                <h3 className="text-lg font-semibold text-muted-foreground">How can I help?</h3>
                <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                  Ask me about your portfolio, crypto concepts, tax strategies, platform features, or anything crypto-related.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 max-w-lg">
                {[
                  "What is my portfolio allocation?",
                  "How do RLUSD vaults work?",
                  "Explain tax-loss harvesting",
                  "What DCA strategies make sense?",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs text-left justify-start h-auto py-2 px-3"
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    data-testid={`button-suggestion-${suggestion.slice(0, 20).replace(/\s/g, "-")}`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
                data-testid={`message-${msg.role}-${i}`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-3">
          {!hasChatsLeft ? (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-2">Monthly chat limit reached</p>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings">Upgrade Plan</a>
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio, crypto concepts, or platform features..."
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
                disabled={chatMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                size="icon"
                className="shrink-0"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            AI responses are for informational purposes only. This is not financial advice.
          </p>
        </div>
      </Card>
    </div>
  );
}
