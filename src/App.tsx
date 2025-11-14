import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MainLayout from "./components/MainLayout";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import ReportIssue from "./pages/ReportIssue";
import Admin from "./pages/Admin";
import Leaderboard from "./pages/Leaderboard";
import Block from "./pages/Block";
import Auth from "./pages/Auth";
import MapViewPage from "./pages/MapViewPage";
import Map2 from "./pages/Map2";
import SubmissionConfirmation from "./pages/SubmissionConfirmation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Routes without MainLayout */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Routes with MainLayout */}
            <Route path="/home" element={<MainLayout><Home /></MainLayout>} />
            <Route path="/map" element={<MainLayout><MapViewPage /></MainLayout>} />
            <Route path="/map2" element={<MainLayout><Map2 /></MainLayout>} />
            <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
            <Route path="/leaderboard" element={<MainLayout><Leaderboard /></MainLayout>} />
            <Route path="/report" element={<MainLayout><ReportIssue /></MainLayout>} />
            <Route path="/block/:slug" element={<MainLayout><Block /></MainLayout>} />
            <Route path="/confirmation/:reportId" element={<MainLayout><SubmissionConfirmation /></MainLayout>} />
            <Route path="/admin" element={<MainLayout><Admin /></MainLayout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
