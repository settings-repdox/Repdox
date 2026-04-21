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
import PageLoader from "@/components/PageLoader";
import Nav from "@/components/Nav";
import CommandPalette from "@/components/CommandPalette";
import { BackgroundProvider } from "@/components/BackgroundSystem/BackgroundContext";
import Footer from "@/components/Footer";
import { useLocation } from "react-router-dom";
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
const Volunteer = lazy(() => import("./pages/Volunteer"));
const DiscordLink = lazy(() => import("./pages/DiscordLink"));

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
            <Route path="/volunteer" element={<Volunteer />} />

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
  const [isPageLoading, setIsPageLoading] = useState(false);
  const loadingTimeoutRef = useRef<number | null>(null);
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
      } else {
        // Reload - show top bar on initial page load
        setIsPageLoading(true);
        loadingTimeoutRef.current = window.setTimeout(() => {
          setIsPageLoading(false);
          loadingTimeoutRef.current = null;
        }, 900);
      }
    } catch (e) {
      console.warn("[App] Error determining intro display:", e);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Show top bar loading on navigation clicks
  useEffect(() => {
    // Skip setting up navigation listeners until intro is complete
    if (showIntro && isFirstLoad.current) {
      return;
    }

    const showTempLoading = () => {
      setIsPageLoading(true);
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = window.setTimeout(() => {
        setIsPageLoading(false);
        loadingTimeoutRef.current = null;
      }, 900);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor =
        target.closest && (target.closest("a") as HTMLAnchorElement | null);
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      )
        return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        return;
      }

      // Prevent default navigation
      e.preventDefault();

      // Start loading animation
      setIsPageLoading(true);

      try {
        const url = new URL(href);
        const path = url.pathname + url.search + url.hash;
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
        setIsPageLoading(false);
      } catch (err) {
        window.location.href = href;
      }
    };

    const onPop = () => {
      try {
        sessionStorage.setItem("skipInitialLoad", "true");
      } catch (err: unknown) {
        console.debug("[App] sessionStorage set failed (onPop):", err);
      }
    };

    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPop);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPop);
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [showIntro]);

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
      <BackgroundProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />

            <BrowserRouter>
              <CommandPalette />
              {showIntro && <IntroLoader onComplete={handleIntroComplete} />}
              {isPageLoading && !showIntro && <PageLoader />}
              <AppContent />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </BackgroundProvider>
    </ThemeProvider>
  );
};

export default App;
