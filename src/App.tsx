import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

const Index = lazy(() => import("./pages/Index"));
const JoinPage = lazy(() => import("./pages/JoinPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 animate-fade-in">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
      <span className="text-xs text-muted-foreground">Loading...</span>
    </div>
  </div>
);

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/chat/:pin" element={<ChatPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
