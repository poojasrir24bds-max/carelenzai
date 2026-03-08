import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ScanPage from "./pages/ScanPage";
import ScanResults from "./pages/ScanResults";
import DentalHome from "./pages/dental/DentalHome";
import DentalScan from "./pages/dental/DentalScan";
import DentalResults from "./pages/dental/DentalResults";
import DentalHistory from "./pages/dental/DentalHistory";
import DentalStudy from "./pages/dental/DentalStudy";
import DentalChat from "./pages/dental/DentalChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login/:role" element={<Login />} />
            <Route path="/register/:role" element={<Register />} />
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/scan" element={<ScanPage />} />
            <Route path="/patient/results" element={<ScanResults />} />
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/dental" element={<DentalHome />} />
            <Route path="/dental/scan" element={<DentalScan />} />
            <Route path="/dental/results" element={<DentalResults />} />
            <Route path="/dental/history" element={<DentalHistory />} />
            <Route path="/dental/study" element={<DentalStudy />} />
            <Route path="/dental/chat" element={<DentalChat />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
