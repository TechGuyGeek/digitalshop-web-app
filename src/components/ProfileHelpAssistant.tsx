import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { getHelpEnabled, onHelpPrefChange } from "@/lib/helpPref";

const MUTED_KEY = "gpsshops_profilehelp_muted";

function chunkText(text: string, maxLen = 160): string[] {
  const parts = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [text];
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if (s.length <= maxLen) { out.push(s); continue; }
    // split long sentences on commas / spaces
    const sub = s.split(/,\s+/);
    let buf = "";
    for (const piece of sub) {
      if ((buf + ", " + piece).length > maxLen && buf) { out.push(buf); buf = piece; }
      else buf = buf ? buf + ", " + piece : piece;
    }
    if (buf) out.push(buf);
  }
  return out;
}

function speakChunks(text: string, lang: string, onStart: () => void, onEnd: () => void) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const chunks = chunkText(text);
  let started = false;
  chunks.forEach((chunk, idx) => {
    const u = new SpeechSynthesisUtterance(chunk);
    u.lang = lang || "en-GB";
    u.rate = 1; u.pitch = 1;
    u.onstart = () => { if (!started) { started = true; onStart(); } };
    if (idx === chunks.length - 1) u.onend = onEnd;
    u.onerror = () => { if (idx === chunks.length - 1) onEnd(); };
    synth.speak(u);
  });
}

interface Props {
  translationKey?: string;
}

export default function ProfileHelpAssistant({ translationKey = "HELPUSERPROFILE" }: Props) {
  const { t, language, loading } = useLanguage();
  const KEY = translationKey;
  const [helpEnabled, setHelpEnabledState] = useState<boolean>(() => getHelpEnabled());
  useEffect(() => onHelpPrefChange(setHelpEnabledState), []);
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem(MUTED_KEY);
    if (stored !== null) return stored === "1";
    return false;
  });
  const [speaking, setSpeaking] = useState(false);
  const [visible, setVisible] = useState(true);
  const spokenRef = useRef(false);

  const message = t(KEY);
  const ttsOk = typeof window !== "undefined" && "speechSynthesis" in window;
  // Auto-hide duration scales with text length (~80ms per char), min 15s, max 90s.
  const hideMs = Math.min(90000, Math.max(15000, message.length * 80));

  useEffect(() => {
    if (spokenRef.current) return;
    if (loading) return;
    if (message === KEY) return; // translations not loaded yet
    spokenRef.current = true;
    if (muted || !ttsOk) return;
    try { speakChunks(message, language, () => setSpeaking(true), () => setSpeaking(false)); } catch {}
    return () => {
      if (ttsOk) { try { window.speechSynthesis.cancel(); } catch {} }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, message]);

  useEffect(() => {
    const id = setTimeout(() => {
      setVisible(false);
      if (ttsOk) { try { window.speechSynthesis.cancel(); } catch {} }
    }, hideMs);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideMs]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTED_KEY, next ? "1" : "0"); } catch {}
      if (next && ttsOk) {
        try { window.speechSynthesis.cancel(); } catch {}
        setSpeaking(false);
      } else if (!next && ttsOk) {
        try { speakChunks(message, language, () => setSpeaking(true), () => setSpeaking(false)); } catch {}
      }
      return next;
    });
  };

  if (!helpEnabled) return null;

  return (
    <div
      className={`mb-4 rounded-2xl border border-border bg-secondary/40 p-4 flex items-start gap-3 transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0 pointer-events-none h-0 p-0 m-0 overflow-hidden border-0"}`}
    >
      <img
        src={`${import.meta.env.BASE_URL}gpsshops-mascot.png`}
        alt={t("AIAssistant_Title")}
        className={`h-14 w-14 shrink-0 object-contain drop-shadow-lg ${speaking ? "animate-mascot-bounce" : ""}`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-heading font-semibold text-foreground">
          {t("AIAssistant_Title")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{message}</p>
      </div>
      {ttsOk && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={toggleMute}
          aria-label={muted ? t("AIAssistant_Unmute") : t("AIAssistant_Mute")}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}