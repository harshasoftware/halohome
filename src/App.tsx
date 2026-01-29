import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import { ThemeProvider, useTheme } from "next-themes";
import NotFound from "./pages/NotFound";
import React, { lazy, Suspense, useEffect } from "react";
import { CopilotKit } from "@copilotkit/react-core";
import ErrorBoundary from "./components/ErrorBoundary";
import LazyErrorBoundary from "./components/LazyErrorBoundary";
import { DatabaseProvider } from "./providers/DatabaseProvider";
import { usePreventBrowserZoom } from "./hooks/usePreventBrowserZoom";
import { useIsMobile } from "@/hooks/use-mobile";

// ============================================================================
// Dynamic Imports - Route-level Code Splitting
// ============================================================================
const VastuWorkspace = lazy(() => import("./pages/VastuWorkspace"));
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

// CopilotKit runtime URL - Supabase Edge Function with AG-UI protocol
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
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}
      >
        Halo Home
      </div>
      <div
        className="w-6 h-6 mx-auto rounded-full animate-spin border-2 border-[#F0A6B3]/30 dark:border-[#F0A6B3]/10 border-t-[#F0A6B3] dark:border-t-[#F0A6B3]"
      />
    </div>
  </div>
);

// Enforce light theme on /guest route
const GuestThemeEnforcer = ({ children }: { children: React.ReactNode }) => {
  const { setTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/guest') {
      setTheme('light');
      // Remove the initial loader class since React has mounted
      document.documentElement.classList.remove('guest-light');
    }
  }, [location.pathname, setTheme]);

  return <>{children}</>;
};

// Component that applies zoom prevention at app level
const ZoomPrevention = ({ children }: { children: React.ReactNode }) => {
  usePreventBrowserZoom();
  return <>{children}</>;
};

// CopilotKit wrapper with custom AG-UI runtime
const CopilotKitWithAuth = ({ children }: { children: React.ReactNode }) => {
  return (
    <CopilotKit runtimeUrl={COPILOT_RUNTIME_URL}>
      {children}
    </CopilotKit>
  );
};

// Block mobile access to the responsive web app; redirect to Scan waitlist on landing.
const DesktopOnlyAppGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isMobile = useIsMobile(768);

  const blocked =
    location.pathname === "/app" ||
    location.pathname === "/guest" ||
    location.pathname.startsWith("/project/") ||
    location.pathname === "/ai-subscription";

  useEffect(() => {
    if (!isMobile || !blocked) return;
    // Always send mobile users to the Scan waitlist section on landing.
    window.location.replace("/#waitlist");
  }, [isMobile, blocked]);

  if (isMobile && blocked) return null;
  return <>{children}</>;
};

const Login = lazy(() => import("./pages/Login"));

// Protected Route Wrapper
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteLoader />;
  }

  // Check for authenticated AND non-anonymous user
  if (!user || user.is_anonymous) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" storageKey="themodernfamily-ui-theme">
    <ZoomPrevention>
      <DatabaseProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <CopilotKitWithAuth>
                <Toaster />
                <GuestThemeEnforcer>
                  <DesktopOnlyAppGate>
                    <ErrorBoundary componentName="Routes">
                      <Suspense fallback={<RouteLoader />}>
                        <Routes>
                          {/* Landing page - eagerly loaded for fast initial paint */}
                          <Route path="/" element={<Landing />} />

                          {/* Public Login Route */}
                          <Route path="/login" element={
                            <LazyErrorBoundary componentName="Login">
                              <Login />
                            </LazyErrorBoundary>
                          } />

                          {/* Main app route - Protected */}
                          <Route path="/app" element={
                            <RequireAuth>
                              <LazyErrorBoundary componentName="Workspace">
                                <Workspace />
                              </LazyErrorBoundary>
                            </RequireAuth>
                          } />

                          {/* Guest route - Public */}
                          <Route path="/guest" element={
                            <LazyErrorBoundary componentName="Workspace">
                              <Workspace />
                            </LazyErrorBoundary>
                          } />

                          <Route path="/payment/success" element={
                            <LazyErrorBoundary componentName="PaymentSuccess">
                              <PaymentSuccess />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/astro-payment-success" element={
                            <LazyErrorBoundary componentName="AstroPaymentSuccess">
                              <AstroPaymentSuccess />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/ai-subscription" element={
                            <RequireAuth>
                              <LazyErrorBoundary componentName="AISubscription">
                                <AISubscription />
                              </LazyErrorBoundary>
                            </RequireAuth>
                          } />
                          <Route path="/blog" element={
                            <LazyErrorBoundary componentName="BlogIndex">
                              <BlogIndex />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/blog/scout-algorithm" element={
                            <LazyErrorBoundary componentName="ScoutAlgorithmBlog">
                              <ScoutAlgorithmBlog />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/blog/astrology-systems" element={
                            <LazyErrorBoundary componentName="AstrologySystemsBlog">
                              <AstrologySystemsBlog />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/blog/duo-mode" element={
                            <LazyErrorBoundary componentName="DuoModeBlog">
                              <DuoModeBlog />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/blog/planetary-precision" element={
                            <LazyErrorBoundary componentName="PlanetaryPrecisionBlog">
                              <PlanetaryPrecisionBlog />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/blog/methodology" element={
                            <LazyErrorBoundary componentName="MethodologyBlog">
                              <MethodologyBlog />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/sample-report" element={
                            <LazyErrorBoundary componentName="SampleReport">
                              <SampleReport />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/benchmark" element={
                            <LazyErrorBoundary componentName="Benchmark">
                              <Benchmark />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/update-password" element={<Navigate to="/" replace />} />
                          <Route path="/share/:shareId" element={
                            <LazyErrorBoundary componentName="SharePage">
                              <SharePage />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/s/:shortCode" element={
                            <LazyErrorBoundary componentName="SharedGlobePage">
                              <SharedGlobePage />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/embed/:shortCode" element={
                            <LazyErrorBoundary componentName="EmbedPage">
                              <EmbedPage />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/project/:projectId" element={
                            <LazyErrorBoundary componentName="Workspace">
                              <Workspace defaultView="map" />
                            </LazyErrorBoundary>
                          } />
                          <Route path="/project/:projectId/map" element={
                            <LazyErrorBoundary componentName="Workspace">
                              <Workspace defaultView="map" />
                            </LazyErrorBoundary>
                          } />

                          {/* Error routes - eagerly loaded */}
                          <Route path="/project/:projectId/settings" element={<NotFound />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </DesktopOnlyAppGate>
                </GuestThemeEnforcer>
              </CopilotKitWithAuth>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </DatabaseProvider>
    </ZoomPrevention>
  </ThemeProvider>
);

export default App;
