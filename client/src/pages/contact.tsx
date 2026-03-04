import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const FEEDBACK_TYPES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "question", label: "Question" },
  { value: "feedback", label: "General Feedback" },
  { value: "security", label: "Security Concern" },
];

export default function Contact() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !type || !message) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, type, message }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send");
      }
      setSent(true);
      toast({ title: "Feedback sent!", description: "We'll get back to you soon." });
    } catch (err: any) {
      toast({
        title: "Failed to send",
        description: err.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="text-feedback-sent">Message Sent</h2>
            <p className="text-muted-foreground text-sm">
              Thanks for reaching out. We'll review your message and get back to you if needed.
            </p>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#00A4E4]/10 mx-auto">
            <MessageSquare className="h-6 w-6 text-[#00A4E4]" />
          </div>
          <h1 className="text-2xl font-bold" data-testid="heading-contact">Contact & Feedback</h1>
          <p className="text-muted-foreground text-sm">
            Found a bug? Have a suggestion? Want to ask something? We'd love to hear from you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="input-feedback-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-feedback-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>What's this about?</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-feedback-type">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value} data-testid={`option-feedback-${ft.value}`}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Your Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us what's on your mind..."
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="textarea-feedback-message"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {message.length}/5000
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#00A4E4] text-white"
                disabled={sending || !name || !email || !type || !message}
                data-testid="button-send-feedback"
              >
                {sending ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Your message goes directly to the CryptoOwnBank team. We typically respond within 24–48 hours.
        </p>
      </div>
    </div>
  );
}
