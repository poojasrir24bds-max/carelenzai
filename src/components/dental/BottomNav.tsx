import { useNavigate, useLocation } from "react-router-dom";
import { Home, ScanLine, Clock, BookOpen, MessageCircle } from "lucide-react";

const tabs = [
  { path: "/dental", icon: Home, label: "Home" },
  { path: "/dental/scan", icon: ScanLine, label: "Scan" },
  { path: "/dental/history", icon: Clock, label: "History" },
  { path: "/dental/study", icon: BookOpen, label: "Study" },
  { path: "/dental/chat", icon: MessageCircle, label: "AI Chat" },
];

const DentalBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default DentalBottomNav;
