import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Pill, Microscope, Wrench, ChevronRight } from "lucide-react";
import DentalBottomNav from "@/components/dental/BottomNav";
import logo from "@/assets/logo.png";

const modules = [
  {
    id: "anatomy",
    icon: BookOpen,
    title: "Tooth Anatomy",
    desc: "Structure, morphology & FDI numbering",
    color: "bg-primary/10 text-primary",
    topics: [
      { title: "Crown & Root Structure", content: "Each tooth consists of a crown (visible part) and root (embedded in alveolar bone). The crown is covered by enamel — the hardest substance in the human body. Below enamel lies dentin, which forms the bulk of the tooth. The innermost part is the pulp chamber containing nerves and blood vessels." },
      { title: "FDI Numbering System", content: "The FDI (Fédération Dentaire Internationale) system uses two digits: first digit = quadrant (1=upper right, 2=upper left, 3=lower left, 4=lower right), second digit = tooth position (1=central incisor to 8=third molar). Example: Tooth 36 = lower left first molar." },
      { title: "Types of Teeth", content: "Adults have 32 permanent teeth: 8 incisors (cutting), 4 canines (tearing), 8 premolars (crushing), 12 molars (grinding). Deciduous dentition has 20 teeth. Each type has unique morphology suited to its function." },
      { title: "Tooth Surfaces", content: "Five surfaces: Mesial (toward midline), Distal (away from midline), Buccal/Labial (toward cheek/lip), Lingual/Palatal (toward tongue/palate), Occlusal/Incisal (biting surface). Understanding surfaces is critical for cavity classification (Black's Classification)." },
    ],
  },
  {
    id: "materials",
    icon: Wrench,
    title: "Dental Materials",
    desc: "Restorative & prosthetic materials",
    color: "bg-secondary/10 text-secondary",
    topics: [
      { title: "Composite Resins", content: "Tooth-colored restorative material composed of resin matrix (Bis-GMA), filler particles (silica, quartz), and coupling agent (silane). Available in different viscosities. Requires acid etching and bonding agent. Light-cured with 450-470nm blue light." },
      { title: "Glass Ionomer Cement", content: "Sets via acid-base reaction between fluoroaluminosilicate glass and polyacrylic acid. Advantages: chemical bond to tooth, fluoride release, biocompatibility. Used for cervical restorations, liners, luting cements, and pediatric dentistry." },
      { title: "Dental Ceramics", content: "Include feldspathic porcelain, lithium disilicate (e.max), and zirconia. Used for crowns, veneers, and bridges. Properties: excellent aesthetics, biocompatibility, wear resistance. Zirconia offers superior strength (900-1200 MPa)." },
      { title: "Impression Materials", content: "Alginate (irreversible hydrocolloid): quick, affordable, limited detail. Addition silicone (PVS): excellent detail, dimensional stability. Polyether: good detail, hydrophilic. Each has specific setting times and applications." },
    ],
  },
  {
    id: "pharmacology",
    icon: Pill,
    title: "Pharmacology",
    desc: "Dental drugs & anesthesia",
    color: "bg-warning/10 text-warning",
    topics: [
      { title: "Local Anesthetics", content: "Lidocaine 2% with 1:80,000 or 1:100,000 epinephrine is the gold standard. Mechanism: blocks sodium channels → prevents nerve impulse. Onset: 2-3 min (infiltration), 5-7 min (block). Duration: 1-1.5 hrs (soft tissue). Maximum dose: 4.4 mg/kg (300mg for 70kg adult)." },
      { title: "Analgesics", content: "NSAIDs (Ibuprofen 400-600mg): first-line for dental pain. Mechanism: COX inhibitor → reduces prostaglandins. Acetaminophen: alternative for NSAID-intolerant patients. Combination therapy (NSAID + Acetaminophen) is more effective than either alone." },
      { title: "Antibiotics", content: "Amoxicillin 500mg TID × 7 days: first-line for dental infections. Alternative: Clindamycin 300mg QID (penicillin allergy). Metronidazole: anaerobic infections. Always complete full course. Prophylaxis: required for certain cardiac conditions." },
      { title: "Vasoconstrictors", content: "Epinephrine (adrenaline): most common in dental LA. Benefits: prolongs anesthesia, reduces bleeding, delays systemic absorption. Contraindication caution: uncontrolled hypertension, recent MI. Max dose: 0.04mg per appointment for cardiac patients." },
    ],
  },
  {
    id: "pathology",
    icon: Microscope,
    title: "Oral Pathology",
    desc: "Common dental conditions",
    color: "bg-destructive/10 text-destructive",
    topics: [
      { title: "Dental Caries", content: "Multifactorial disease: bacteria (S. mutans) + fermentable carbohydrates + susceptible tooth + time. Progression: enamel → dentin → pulp. Classification: G.V. Black's (Class I-VI). Prevention: fluoride, sealants, diet modification, oral hygiene." },
      { title: "Periodontal Disease", content: "Gingivitis: reversible inflammation of gingiva. Signs: redness, swelling, bleeding on probing. Periodontitis: irreversible destruction of attachment apparatus. Classification: Stages I-IV, Grades A-C. Treatment ranges from SRP to surgical intervention." },
      { title: "Oral Cancer", content: "Most common: Squamous Cell Carcinoma (90%). Risk factors: tobacco, alcohol, HPV, betel nut. Sites: lateral tongue, floor of mouth. Warning signs: non-healing ulcer >2 weeks, white/red patches, unexplained bleeding. TNM staging guides treatment." },
      { title: "Pulp Pathology", content: "Reversible pulpitis: pain with stimulus, resolves quickly. Irreversible pulpitis: spontaneous, lingering pain. Pulp necrosis: no response to vitality tests. Periapical abscess: infection beyond apex. Treatment: RCT or extraction depending on restorability." },
    ],
  },
];

const DentalStudy = () => {
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const currentModule = modules.find((m) => m.id === selectedModule);

  const speakContent = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <header className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(180,60%,45%)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => selectedModule ? (selectedTopic !== null ? setSelectedTopic(null) : setSelectedModule(null)) : navigate("/dental")} className="text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="DentalScan AI" className="h-7 w-7" />
          <span className="font-display font-bold text-white">{currentModule?.title || "Study Mode"}</span>
        </div>
      </header>

      <div className="flex-1 container py-5 space-y-3">
        {!selectedModule ? (
          <>
            <h2 className="font-display font-semibold text-base">📚 Learning Modules</h2>
            <p className="text-xs text-muted-foreground mb-2">Select a module to start learning</p>
            {modules.map((mod) => (
              <Card
                key={mod.id}
                className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => setSelectedModule(mod.id)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mod.color}`}>
                      <mod.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{mod.title}</p>
                      <p className="text-xs text-muted-foreground">{mod.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : selectedTopic === null ? (
          <>
            <h2 className="font-display font-semibold text-base">{currentModule?.title}</h2>
            <p className="text-xs text-muted-foreground mb-2">Select a topic</p>
            {currentModule?.topics.map((topic, i) => (
              <Card
                key={i}
                className="shadow-card border-border cursor-pointer hover:shadow-elevated transition-all"
                onClick={() => setSelectedTopic(i)}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <p className="font-semibold text-sm">{topic.title}</p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-base">{currentModule?.topics[selectedTopic].title}</h2>
              <button
                onClick={() => speakContent(currentModule?.topics[selectedTopic].content || "")}
                className={`p-2 rounded-full transition-all ${isSpeaking ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}
              >
                🔊
              </button>
            </div>
            <Card className="shadow-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-foreground leading-relaxed">{currentModule?.topics[selectedTopic].content}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <DentalBottomNav />
    </div>
  );
};

export default DentalStudy;
