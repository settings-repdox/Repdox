// src/App.tsx
// Complete App with Email Verification routes integrated

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import IntroLoader from "@/components/IntroLoader";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
import { BackgroundProvider } from "@/components/BackgroundSystem/BackgroundContext";
import LightPillarBackground from "@/components/BackgroundSystem/LightPillarBackground";
import Footer from "@/components/Footer";
import { useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
// Implement code splitting

// Lazy load pages
const Index = lazy(() => import("./pages/Index"));
const EventsList = lazy(() => import("./pages/EventsList"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const AddEvent = lazy(() => import("./pages/AddEvent"));
const MyEvents = lazy(() => import("./pages/MyEvents"));
const Contact = lazy(() => import("./pages/Contact"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const About = lazy(() => import("./pages/About"));
const PrivacyPolicy = lazy(() => import("./pages/Privacy_policy"));
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
const AdminScanner = lazy(() => import("./pages/AdminScanner"));
const Volunteers = lazy(() => import("./pages/Volunteers"));
const DiscordLink = lazy(() => import("./pages/DiscordLink"));
const AdminVolunteers = lazy(() => import("./pages/AdminVolunteers"));

import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

// Simple fallback loader if PageLoader doesn't exist yet
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function AppContent() {
  const location = useLocation();
  const hideFooterRoutes = ["/signin", "/signup"];
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

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
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/volunteers" element={<Volunteers />} />

            {/* NEW: Email Verification Routes (Public - No Auth Required) */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/solve-for-india/register" element={<SolveForIndiaRegister />} />
            <Route path="/auth/discord-link" element={<DiscordLink />} />

            {/* Profile Routes - Public Access (own profile requires auth internally) */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
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
              path="/admin/scanner"
              element={
                <ProtectedRoute>
                  <AdminScanner />
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

  // Check if intro should be shown (only on first session)
  useEffect(() => {
    try {
      const hasSeenIntro = sessionStorage.getItem("hasSeenIntro");
      const skipInitial = sessionStorage.getItem("skipInitialLoad");

      if (skipInitial) {
        sessionStorage.removeItem("skipInitialLoad");
        // Coming from navigation, don't show anything
      } else if (!hasSeenIntro) {
        setShowIntro(true); // Show intro only if NOT seen before
      }
    } catch (e) {
      console.warn("[App] Error determining intro display:", e);
    }
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
    <ThemeProvider>
      <Analytics />
      <SpeedInsights />
      <BackgroundProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              {!showIntro && <LightPillarBackground />}
              <CommandPalette />
              {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
};

export default App;
