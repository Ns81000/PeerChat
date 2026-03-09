import { lazy, Suspense, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";

/**
 * Wrap React.lazy with automatic retry + full-page reload on chunk load failure.
 * After a new Vercel deploy the old hashed chunk files no longer exist on the CDN,
 * so users with a stale index.html will hit a network error when navigating.
 * One silent reload fetches the new index.html and resolves the problem.
 */
function lazyRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch(() => {
      // Prevent infinite reload loops by storing a flag in sessionStorage
      const key = "chunk-reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        // Return a never-resolving promise so React doesn't render a broken module
        return new Promise<{ default: T }>(() => {});
      }
      sessionStorage.removeItem(key);
      // If we already reloaded once and it still fails, surface the error
      return Promise.reject(new Error("Failed to load page after retry"));
    }),
  );
}

const Index = lazyRetry(() => import("./pages/Index"));
const JoinPage = lazyRetry(() => import("./pages/JoinPage"));
const ChatPage = lazyRetry(() => import("./pages/ChatPage"));
const NotFound = lazyRetry(() => import("./pages/NotFound"));

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
