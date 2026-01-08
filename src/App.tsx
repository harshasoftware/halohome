import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import { ThemeProvider } from "next-themes";
import NotFound from "./pages/NotFound";
import React, { lazy, Suspense } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import ErrorBoundary from "./components/ErrorBoundary";
import { DatabaseProvider } from "./providers/DatabaseProvider";
import { usePreventBrowserZoom } from "./hooks/usePreventBrowserZoom";

// ============================================================================
// Dynamic Imports - Route-level Code Splitting
// ============================================================================
const Workspace = lazy(() => import("./pages/Workspace"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const AstroPaymentSuccess = lazy(() => import("./pages/AstroPaymentSuccess"));
const SharePage = lazy(() => import("./pages/Share"));
const SharedGlobePage = lazy(() => import("./pages/SharedGlobe"));
const EmbedPage = lazy(() => import("./pages/Embed"));
const AISubscription = lazy(() => import("./pages/AISubscription"));
const ScoutAlgorithmBlog = lazy(() => import("./pages/ScoutAlgorithmBlog"));
const AstrologySystemsBlog = lazy(() => import("./pages/AstrologySystemsBlog"));
const DuoModeBlog = lazy(() => import("./pages/DuoModeBlog"));
const PlanetaryPrecisionBlog = lazy(() => import("./pages/PlanetaryPrecisionBlog"));
const MethodologyBlog = lazy(() => import("./pages/MethodologyBlog"));
const SampleReport = lazy(() => import("./pages/SampleReport"));
const BlogIndex = lazy(() => import("./pages/BlogIndex"));
const Benchmark = lazy(() => import("./pages/Benchmark"));

// CopilotKit runtime URL - Supabase Edge Function
const COPILOT_RUNTIME_URL = "https://eypsystctqwvphvcrmxb.supabase.co/functions/v1/copilot-runtime";

// Configure React Query caching for reduced network requests
// staleTime: 5 minutes - data considered fresh, won't refetch on component mount
// gcTime: 10 minutes - unused cache entries retained for quick re-access
// Ideal for astrology data that rarely changes during a session
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000, // 5 minutes
      gcTime: 600000, // 10 minutes
    },
  },
});

// Loading fallback for lazy routes - theme-aware version
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#050505]">
    <div className="text-center">
      <div
        className="uppercase text-slate-900 dark:text-white text-2xl font-semibold tracking-widest mb-4"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        Astrocarto
      </div>
      <div
        className="w-6 h-6 mx-auto rounded-full animate-spin border-2 border-slate-200 dark:border-white/10 border-t-slate-500 dark:border-t-white/60"
      />
    </div>
  </div>
);

// Component that applies zoom prevention at app level
const ZoomPrevention = ({ children }: { children: React.ReactNode }) => {
  usePreventBrowserZoom();
  return <>{children}</>;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="themodernfamily-ui-theme">
    <ZoomPrevention>
      <DatabaseProvider>
        <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <AuthProvider>
                <Toaster />
                <ErrorBoundary componentName="Routes">
                  <Suspense fallback={<RouteLoader />}>
                    <Routes>
                    {/* Landing page - eagerly loaded for fast initial paint */}
                    <Route path="/" element={<Landing />} />

                    {/* Lazy-loaded routes - Code Split for smaller initial bundle */}
                    <Route path="/guest" element={
                      <ErrorBoundary componentName="Workspace">
                        <Workspace />
                      </ErrorBoundary>
                    } />
                    <Route path="/payment/success" element={
                      <ErrorBoundary componentName="PaymentSuccess">
                        <PaymentSuccess />
                      </ErrorBoundary>
                    } />
                    <Route path="/astro-payment-success" element={
                      <ErrorBoundary componentName="AstroPaymentSuccess">
                        <AstroPaymentSuccess />
                      </ErrorBoundary>
                    } />
                    <Route path="/ai-subscription" element={
                      <ErrorBoundary componentName="AISubscription">
                        <AISubscription />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog" element={
                      <ErrorBoundary componentName="BlogIndex">
                        <BlogIndex />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog/scout-algorithm" element={
                      <ErrorBoundary componentName="ScoutAlgorithmBlog">
                        <ScoutAlgorithmBlog />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog/astrology-systems" element={
                      <ErrorBoundary componentName="AstrologySystemsBlog">
                        <AstrologySystemsBlog />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog/duo-mode" element={
                      <ErrorBoundary componentName="DuoModeBlog">
                        <DuoModeBlog />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog/planetary-precision" element={
                      <ErrorBoundary componentName="PlanetaryPrecisionBlog">
                        <PlanetaryPrecisionBlog />
                      </ErrorBoundary>
                    } />
                    <Route path="/blog/methodology" element={
                      <ErrorBoundary componentName="MethodologyBlog">
                        <MethodologyBlog />
                      </ErrorBoundary>
                    } />
                    <Route path="/sample-report" element={
                      <ErrorBoundary componentName="SampleReport">
                        <SampleReport />
                      </ErrorBoundary>
                    } />
                    <Route path="/benchmark" element={
                      <ErrorBoundary componentName="Benchmark">
                        <Benchmark />
                      </ErrorBoundary>
                    } />
                    <Route path="/update-password" element={<Navigate to="/" replace />} />
                    <Route path="/share/:shareId" element={
                      <ErrorBoundary componentName="SharePage">
                        <SharePage />
                      </ErrorBoundary>
                    } />
                    <Route path="/s/:shortCode" element={
                      <ErrorBoundary componentName="SharedGlobePage">
                        <SharedGlobePage />
                      </ErrorBoundary>
                    } />
                    <Route path="/embed/:shortCode" element={
                      <ErrorBoundary componentName="EmbedPage">
                        <EmbedPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/project/:projectId" element={
                      <ErrorBoundary componentName="Workspace">
                        <Workspace defaultView="map" />
                      </ErrorBoundary>
                    } />
                    <Route path="/project/:projectId/map" element={
                      <ErrorBoundary componentName="Workspace">
                        <Workspace defaultView="map" />
                      </ErrorBoundary>
                    } />

                    {/* Error routes - eagerly loaded */}
                    <Route path="/project/:projectId/settings" element={<NotFound />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </ErrorBoundary>
              </AuthProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </CopilotKit>
      </DatabaseProvider>
    </ZoomPrevention>
  </ThemeProvider>
);

export default App;
