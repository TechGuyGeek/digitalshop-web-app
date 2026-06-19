import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import {
  AIService,
  EMPTY_REGISTRATION,
  type ChatMessage,
  type Registration,
} from "@/lib/aiService";
import { registerUser } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface RegisterChatProps {
  onComplete: () => void;
}

const FIELD_LABELS: Record<keyof Registration, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  mobile_number: "Mobile number",
  password: "Password",
  gender: "Gender",
};

const RegisterChat = ({ onComplete }: RegisterChatProps) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I'll help you create your GPS Shops account. Let's start — what's your first name?",
    },
  ]);
  const [partial, setPartial] = useState<Registration>(EMPTY_REGISTRATION);
  const [missing, setMissing] = useState<string[]>(Object.keys(EMPTY_REGISTRATION));
  const [complete, setComplete] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking || complete) return;
    const nextMsgs: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setInput("");
    setThinking(true);
    try {
      const res = await AIService.registration.chat(nextMsgs, partial);
      setPartial(res.registration);
      setMissing(res.missing_fields);
      setComplete(res.complete);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (err) {
      console.error(err);
      toast.error("AI assistant is unavailable. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const submitRegistration = async () => {
    if (!complete) return;
    setSubmitting(true);
    try {
      const result = await registerUser({
        name: partial.first_name,
        surname: partial.last_name,
        dateOfBirth: partial.gender, // legacy backend: gender stored in user_age field
        email: partial.email,
        password: partial.password,
        mobileNumber: partial.mobile_number,
        language,
      });
      if (result === "SUCCESS") {
        toast.success(t("RegistrationLinkClicked"));
        onComplete();
      } else {
        toast.error(result || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error(t("Pleasecheckyourinternetconnection"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Collected so far */}
      <div className="rounded-xl border border-border bg-secondary/40 p-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Collected so far
        </div>
        <ul className="space-y-1 text-sm">
          {(Object.keys(FIELD_LABELS) as (keyof Registration)[]).map((k) => {
            const value = partial[k];
            const filled = !!value;
            const display = k === "password" && value ? "••••••••" : value || "—";
            return (
              <li key={k} className="flex justify-between gap-2">
                <span className={filled ? "text-foreground" : "text-muted-foreground"}>
                  {FIELD_LABELS[k]}
                </span>
                <span className={filled ? "text-primary font-medium" : "text-muted-foreground"}>
                  {display}
                </span>
              </li>
            );
          })}
        </ul>
        {missing.length > 0 && !complete && (
          <div className="mt-2 text-xs text-muted-foreground">
            Still needed: {missing.map((f) => FIELD_LABELS[f as keyof Registration] ?? f).join(", ")}
          </div>
        )}
      </div>

      {/* Chat transcript */}
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto rounded-xl border border-border bg-background/40 p-3 space-y-3"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[80%] rounded-2xl bg-primary text-primary-foreground px-3 py-2 text-sm"
                  : "max-w-[85%] text-sm text-foreground"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      {/* Composer or final confirmation */}
      {complete ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            <CheckCircle2 className="h-4 w-4" />
            All details collected. Ready to create your account.
          </div>
          <Button
            variant="glow"
            size="lg"
            className="w-full"
            disabled={submitting}
            onClick={submitRegistration}
          >
            {submitting ? t("Pleasewait") : t("Register")}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={input}
            placeholder="Type your reply…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={thinking}
            className="h-11 bg-secondary border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
          <Button
            variant="glow"
            size="lg"
            onClick={send}
            disabled={thinking || !input.trim()}
            className="px-3"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default RegisterChat;