import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AIService, EMPTY_REGISTRATION, type ChatMessage, type Registration } from "@/lib/aiService";
import mascot from "@/assets/gpsshops-mascot.png.asset.json";

interface Props {
  values: Partial<Registration>;
  onFieldsUpdate: (fields: Partial<Registration>) => void;
  onComplete?: (reg: Registration) => void;
}

type SR = any;

function getSpeechRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  // @ts-expect-error vendor prefix
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

const ttsSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

export default function VoiceRegisterAssistant({ values, onFieldsUpdate, onComplete }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<string>("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [input, setInput] = useState("");
  const [lastReply, setLastReply] = useState("");
  const [heard, setHeard] = useState("");
  const [started, setStarted] = useState(false);

  const partialRef = useRef<Partial<Registration>>(values);
  const recognitionRef = useRef<any>(null);
  const mutedRef = useRef(muted);
  const completeRef = useRef(false);

  useEffect(() => { partialRef.current = values; }, [values]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const SR = getSpeechRecognition();
  const speechOk = !!SR;
  const speakOk = ttsSupported();

  // Auto-start intro on mount (best effort — mic may still need a tap on mobile)
  useEffect(() => {
    const id = setTimeout(() => { handleStart(); }, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      if (speakOk) window.speechSynthesis.cancel();
    };
  }, [speakOk]);

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const speak = (text: string, thenListen = false) =>
    new Promise<void>((resolve) => {
      if (!speakOk || mutedRef.current || !text) { if (thenListen) startListening(); return resolve(); }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1; u.pitch = 1;
        u.onend = () => { if (thenListen && !completeRef.current) startListening(); resolve(); };
        u.onerror = () => { if (thenListen && !completeRef.current) startListening(); resolve(); };
        setStatus("AI is speaking…");
        window.speechSynthesis.speak(u);
      } catch { resolve(); }
    });

  const sendToAI = async (userText: string) => {
    if (!userText.trim()) return;
    setHeard(userText);
    const newMsgs: ChatMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(newMsgs);
    setThinking(true);
    setStatus("AI is thinking…");
    try {
      const res = await AIService.registration.chat(newMsgs, partialRef.current);
      // merge fields
      const merged: Partial<Registration> = { ...partialRef.current };
      (Object.keys(EMPTY_REGISTRATION) as (keyof Registration)[]).forEach((k) => {
        const v = res.registration[k];
        if (v && String(v).trim()) merged[k] = v;
      });
      partialRef.current = merged;
      onFieldsUpdate(merged);
      setMessages([...newMsgs, { role: "assistant", content: res.reply }]);
      setLastReply(res.reply);
      setThinking(false);
      if (res.complete) {
        completeRef.current = true;
        stopListening();
        setStatus("Registration details complete ✓");
        await speak(res.reply, false);
        onComplete?.(res.registration);
      } else {
        await speak(res.reply, true);
        setStatus("");
      }
    } catch (e: any) {
      setThinking(false);
      setStatus(`Error: ${e?.message || "AI request failed"}`);
    }
  };

  const startListening = () => {
    if (!SR || completeRef.current) return;
    try {
      const rec = new SR();
      rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.maxAlternatives = 5;
      rec.onstart = () => { setListening(true); setStatus("Listening…"); };
      rec.onerror = (e: any) => {
        setListening(false);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          setStatus("Microphone permission denied. Please allow mic access.");
        } else if (e?.error === "no-speech") {
          setStatus("I didn't catch that. Tap the mascot to try again.");
        } else {
          setStatus(`Mic error: ${e?.error || "unknown"}`);
        }
      };
      rec.onend = () => setListening(false);
      rec.onresult = (event: any) => {
        // Collect all alternatives and pick the best one for gender-like answers
        const alts: string[] = [];
        for (const result of Array.from(event.results) as any[]) {
          for (let i = 0; i < result.length; i++) alts.push(result[i].transcript);
        }
        const primary = alts[0]?.trim() || "";
        const normalized = normalizeTranscript(primary, alts);
        if (normalized) sendToAI(normalized);
      };
      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setStatus(`Mic error: ${err?.message || "could not start"}`);
    }
  };

  const handleStart = async () => {
    if (completeRef.current) return;
    setStarted(true);
    const intro = "Hi! I'm your GPS Shops registration assistant. I can help you sign up — just tell me your details.";
    setLastReply(intro);
    setMessages([{ role: "assistant", content: intro }]);
    await speak(intro, speechOk);
  };

  const handleMicClick = () => {
    if (!speechOk) return;
    if (listening) stopListening();
    else if (!started) handleStart();
    else startListening();
  };

  const handleTextSend = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    if (!started) setStarted(true);
    sendToAI(t);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next && speakOk) window.speechSynthesis.cancel();
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleMicClick}
          aria-label={listening ? "Stop listening" : "Start voice assistant"}
          className={`relative shrink-0 rounded-full transition-transform hover:scale-105 ${listening ? "animate-pulse ring-4 ring-primary/50" : ""}`}
        >
          <img src={mascot.url} alt="GPS Shops AI assistant" className="h-16 w-16 object-contain drop-shadow-lg" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-heading font-semibold text-foreground">GPS Shops AI Assistant</div>
          <div className="text-xs text-muted-foreground truncate">
            {!speechOk && !started && "Voice not supported — use text below"}
            {speechOk && !started && "Tap the mascot to talk, or type below"}
            {started && (status || (lastReply ? `AI: ${lastReply}` : ""))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {speechOk && (
            <Button type="button" size="icon" variant={listening ? "default" : "outline"} onClick={handleMicClick} aria-label="Mic">
              {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          )}
          {speakOk && (
            <Button type="button" size="icon" variant="outline" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {heard && (
        <div className="text-xs text-muted-foreground italic">I heard: "{heard}"</div>
      )}

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleTextSend(); } }}
          placeholder={thinking ? "AI is thinking…" : "Type a reply…"}
          disabled={thinking}
          className="h-10 bg-background"
        />
        <Button type="button" size="icon" onClick={handleTextSend} disabled={thinking || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}