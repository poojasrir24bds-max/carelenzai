import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useRef, useEffect } from "react";

const languages = [
  { code: "en" as const, label: "English", short: "EN" },
  { code: "ta" as const, label: "தமிழ்", short: "தமி" },
  { code: "hi" as const, label: "हिन्दी", short: "हिं" },
  { code: "te" as const, label: "తెలుగు", short: "తెలు" },
  { code: "ml" as const, label: "മലയാളം", short: "മല" },
];

const LanguageToggle = ({ variant = "header" }: { variant?: "header" | "inline" }) => {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find(l => l.code === lang) || languages[0];

  if (variant === "header") {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-primary-foreground bg-primary-foreground/15 rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-primary-foreground/25 transition-all"
        >
          <Globe className="h-3.5 w-3.5" />
          {current.short}
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-elevated z-50 min-w-[120px] py-1 animate-in fade-in slide-in-from-top-2">
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-accent transition-colors ${
                  lang === l.code ? "text-primary bg-primary/10" : "text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex bg-muted rounded-full p-0.5 flex-wrap gap-0.5">
        {languages.map(l => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              lang === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {l.short}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageToggle;
