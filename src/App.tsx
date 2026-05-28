// src/App.tsx
// Complete App with Email Verification routes integrated

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import IntroLoader from "@/components/IntroLoader";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
// import LightPillarBackground from "@/components/BackgroundSystem/LightPillarBackground";
const LightPillarBackground = lazy(() => import("@/components/BackgroundSystem/LightPillarBackground"));
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import PageLoader from "@/components/PageLoader";
import SecurityErrorBoundary from "@/components/SecurityErrorBoundary";
import { useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
// Implement code splitting

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const EventsList = lazy(() => import("./pages/EventsList"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const EventRegistrations = lazy(() => import("./pages/EventRegistrations"));
const EventTeams = lazy(() => import("./pages/EventTeams"));
const AddEvent = lazy(() => import("./pages/AddEvent"));
const MyEvents = lazy(() => import("./pages/MyEvents"));
const Contact = lazy(() => import("./pages/Contact"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/Privacy_policy"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Profile = lazy(() => import("./pages/Profile"));
// COMMUNITY FEATURE COMMENTED OUT FOR RELEASE
// const Community = lazy(() => import("./pages/Community"));
// const CommentDetail = lazy(() => import("./pages/CommentDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Notifications = lazy(() => import("./pages/Notifications"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const SolveForIndiaRegister = lazy(() => import("./pages/solveforindia/Register"));
const AdminEvents = lazy(() => import("./pages/AdminEvents"));
const Volunteers = lazy(() => import("./pages/Volunteers"));
const DiscordLink = lazy(() => import("./pages/DiscordLink"));
const AdminVolunteers = lazy(() => import("./pages/AdminVolunteers"));
const FAQ = lazy(() => import("./pages/FAQ"));
const HostingGuidelines = lazy(() => import("./pages/HostingGuidelines"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Return null to prevent the old page loader from flashing on lazy loads
const LoadingFallback = () => null;

function AppContent() {
  const location = useLocation();
  const { user, loading, isProfileComplete } = useAuth();
  
  console.log("AppContent Render State:", { user, loading, isProfileComplete, pathname: location.pathname });
  
  const hideFooterRoutes = ["/signin", "/signup"];
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  // Define routes that are allowed without being signed in (auth pages)
  const isAuthRoute = ["/signin", "/signup", "/auth/callback"].includes(location.pathname);

  // Show nothing while loading auth state to prevent flash of loading screen
  if (loading) {
    return null;
  }

  // Only apply checks if the user is authenticated (logged in)
  if (user) {
    // 1. If authenticated, but email is not verified, they must be on /verify-email (or callback/signin)
    const isVerified = !!user.email_confirmed_at;
    if (!isVerified) {
      if (location.pathname !== "/verify-email" && location.pathname !== "/auth/callback") {
        return <Navigate to={`/verify-email?email=${encodeURIComponent(user.email || "")}`} replace />;
      }
    } else {
      // 2. If authenticated and verified, but profile is not complete (e.g. missing name or dob),
      // they must complete it. Only allow them on /profile page (or its sub-routes) or callback.
      if (!isProfileComplete) {
        const isOnProfilePage = location.pathname === "/profile" || location.pathname.startsWith("/profile/");
        const isCallback = location.pathname === "/auth/callback";
        if (!isOnProfilePage && !isCallback) {
          return <Navigate to="/profile?onboard=true" replace />;
        }
      }
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1 md:pt-16">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/events" element={<EventsList />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/join-us" element={<Volunteers />} />

            {/* NEW: Email Verification Routes (Public - No Auth Required) */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/solve-for-india/register" element={<SolveForIndiaRegister />} />
            <Route path="/auth/discord-link" element={<DiscordLink />} />

            {/* Profile Routes - Public Access (own profile requires auth internally) */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route
              path="/events/:slug/registrations"
              element={
                <ProtectedRoute>
                  <EventRegistrations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:slug/teams"
              element={
                <ProtectedRoute>
                  <EventTeams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <ProtectedRoute>
                  <AddEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:slug/edit"
              element={
                <ProtectedRoute>
                  <AddEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-events"
              element={
                <ProtectedRoute>
                  <MyEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events"
              element={
                <ProtectedRoute>
                  <AdminEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/volunteers"
              element={
                <ProtectedRoute>
                  <AdminVolunteers />
                </ProtectedRoute>
              }
            />

            <Route path="/faq" element={<FAQ />} />
            <Route path="/hosting-guidelines" element={<HostingGuidelines />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
}

const App = () => {
  const [showIntro, setShowIntro] = useState(false);
  const isFirstLoad = useRef(true);

  console.log("App Render State:", { showIntro });

  // Check if intro should be shown (fresh tab or after being idle for 30 minutes)
  useEffect(() => {
    try {
      const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
      const skipInitial = sessionStorage.getItem("skipInitialLoad");
      const lastActivityStr = localStorage.getItem("lastActivity");

      let shouldShow = false;

      if (skipInitial) {
        sessionStorage.removeItem("skipInitialLoad");
        // Coming from navigation, don't show anything
      } else if (!hasSeenIntro) {
        // Fresh tab (sessionStorage is scoped to a single tab and is empty on new tabs)
        shouldShow = true;
      } else if (lastActivityStr) {
        // Check if idle for more than 30 minutes (30 * 60 * 1000 ms)
        const lastActivity = parseInt(lastActivityStr, 10);
        if (!isNaN(lastActivity) && Date.now() - lastActivity > 30 * 60 * 1000) {
          shouldShow = true;
        }
      }

      if (shouldShow) {
        setShowIntro(true);
      }
    } catch (e) {
      console.warn("[App] Error determining intro display:", e);
    }
  }, []);

  // Track user activity in localStorage (throttled to save writes)
  useEffect(() => {
    let lastWriteTime = 0;
    
    const updateActivity = () => {
      const now = Date.now();
      if (now - lastWriteTime > 10000) { // 10 seconds throttle
        lastWriteTime = now;
        try {
          localStorage.setItem("lastActivity", now.toString());
        } catch (e) {
          console.debug("[App] Failed to write lastActivity to localStorage:", e);
        }
      }
    };

    // Record initial activity on mount
    updateActivity();

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach(name => {
      window.addEventListener(name, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(name => {
        window.removeEventListener(name, updateActivity);
      });
    };
  }, []);

  useEffect(() => {
    const onPop = () => {
      try {
        sessionStorage.setItem("skipInitialLoad", "true");
      } catch (err: unknown) {
        console.debug("[App] sessionStorage set failed (onPop):", err);
      }
    };

    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const handleIntroComplete = () => {
    setShowIntro(false);
    isFirstLoad.current = false;
    try {
      sessionStorage.setItem("hasSeenIntro", "true");
    } catch (err: unknown) {
      console.debug("[App] sessionStorage set failed (introComplete):", err);
    }
  };

  return (
    <SecurityErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Analytics />
          <SpeedInsights />
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />

              <BrowserRouter>
                <ScrollToTop />
                {!showIntro && (
                  <Suspense fallback={null}>
                    <LightPillarBackground />
                  </Suspense>
                )}
                <CommandPalette />
                {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
                <AppContent />
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </AuthProvider>
    </SecurityErrorBoundary>
  );
};

export default App;
