import { Globe } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

const LanguageToggle = ({ variant = "header" }: { variant?: "header" | "inline" }) => {
  const { lang, setLang } = useLanguage();

  if (variant === "header") {
    return (
      <button
        onClick={() => setLang(lang === "en" ? "ta" : "en")}
        className="flex items-center gap-1 text-primary-foreground bg-primary-foreground/15 rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-primary-foreground/25 transition-all"
      >
        <Globe className="h-3.5 w-3.5" />
        {lang === "en" ? "தமிழ்" : "EN"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex bg-muted rounded-full p-0.5">
        <button
          onClick={() => setLang("en")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          English
        </button>
        <button
          onClick={() => setLang("ta")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            lang === "ta" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          தமிழ்
        </button>
      </div>
    </div>
  );
};

export default LanguageToggle;
