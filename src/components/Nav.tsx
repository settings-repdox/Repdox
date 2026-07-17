import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import CardNav from "@/components/ui/CardNav";
import logo from "@/assets/logo.svg";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun, ShieldCheck, Users } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

type UserProfile = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  handle?: string | null;
};

interface Metadata {
  full_name?: string;
  avatar_url?: string;
  picture?: string;
  avatar?: string | { url: string };
  photo_url?: string;
}

export default function Nav() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [fullName, setFullName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Onboarding check
  useEffect(() => {
    if (authLoading || !user) return;

    const checkOnboarding = async () => {
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile && window.location.pathname !== "/profile") {
          navigate("/profile?onboard=1");
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      }
    };

    checkOnboarding();
  }, [user, authLoading, navigate]);

  // derive avatar URL from user_profiles table, then metadata or identities
  useEffect(() => {
    setAvatarError(false);
    if (!user) {
      setAvatarSrc(null);
      return;
    }
    const fetchAvatar = async () => {
      try {
        // First try to get avatar and full_name from user_profiles table
        const { data: profile, error: profileErr } = await supabase
          .from("user_profiles")
          .select("avatar_url, full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileErr) {
          console.error("Error fetching profile in Nav:", profileErr);
        }

        if (profile?.avatar_url) {
          setAvatarPath(profile.avatar_url);
          // get signed url for private bucket
          try {
            const objectPath = profile.avatar_url.startsWith("avatars/")
              ? profile.avatar_url.substring("avatars/".length)
              : profile.avatar_url;
            const { data } = await supabase.storage
              .from("avatars")
              .createSignedUrl(objectPath, 60 * 60);

            if (data?.signedUrl) {
              setAvatarSrc(data.signedUrl);
            } else {
              setAvatarSrc(null);
            }
          } catch (e) {
            console.error("Failed to create signed URL for avatar in Nav", e);
            setAvatarSrc(null);
          }
        }

        if (profile?.full_name) {
          setFullName(profile.full_name);
        }

        // If we found a profile, stop here
        if (profile) return;
      } catch (err) {
        console.error("Error fetching profile:", err);
      }

      // Fallback to user metadata
      const meta = (user.user_metadata ?? {}) as Metadata;

      // helper to pick first string url from candidates
      const pick = (...keys: (keyof Metadata)[]) => {
        for (const k of keys) {
          const v = meta[k];
          if (typeof v === "string" && v.length > 0) return v;
        }
        return null;
      };

      // check metadata common fields
      let src: string | null = pick(
        "avatar_url",
        "picture",
        "avatar" as any, // Cast because it might be an object
        "photo_url",
      );

      // check identities (OAuth providers) for avatar in identity_data
      if (!src) {
        const identities = (
          user as unknown as { identities?: Array<Record<string, unknown>> }
        ).identities;
        if (Array.isArray(identities)) {
          for (const id of identities) {
            const idData = (id && (id.identity_data ?? {})) as Record<
              string,
              unknown
            >;
            if (typeof idData["avatar_url"] === "string") {
              src = idData["avatar_url"] as string;
              break;
            }
            if (typeof idData["picture"] === "string") {
              src = idData["picture"] as string;
              break;
            }
          }
        }
      }

      // final fallback: try user.user_metadata['avatar'] which might be an object with url
      if (!src && meta["avatar"] && typeof meta["avatar"] === "object") {
        const obj = meta["avatar"] as Record<string, unknown>;
        if (typeof obj["url"] === "string") src = obj["url"];
      }

      setAvatarSrc(src);
    };

    fetchAvatar();

    // Listen for profile updates emitted by the Profile page so the navbar reflects changes immediately
    const onProfileUpdated = async (e: Event) => {
      // Re-run the same logic to pick up new avatar
      await fetchAvatar();
    };
    window.addEventListener(
      "profile:updated",
      onProfileUpdated as EventListener,
    );

    return () => {
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated as EventListener,
      );
    };
  }, [user]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const navigationLinks = [
    { href: "/events", label: "Events" },
    { href: "/join-us", label: "Join Us" },
    // { href: "/community", label: "Community" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ];

  const items = [
    {
      label: "Events",
      bgColor: theme === "dark" ? "#0D0716" : "#F3F4F6",
      textColor: theme === "dark" ? "#fff" : "#1F2937",
      links: [
        {
          label: "Hackathons",
          href: "/events/hackathons",
          ariaLabel: "View Hackathons",
        },
        {
          label: "Gaming Tournaments",
          href: "/events/gaming",
          ariaLabel: "View Gaming Tournaments",
        },
        {
          label: "Workshops",
          href: "/events/workshops",
          ariaLabel: "View Workshops",
        },
      ],
    },
    {
      label: "Company",
      bgColor: theme === "dark" ? "#170D27" : "#E5E7EB",
      textColor: theme === "dark" ? "#fff" : "#111827",
      links: [
        { label: "About Us", href: "/about", ariaLabel: "About Repdox" },
        { label: "Join Us", href: "/join-us", ariaLabel: "Join Us" },
        { label: "Our Team", href: "/team", ariaLabel: "Meet Our Team" },
        { label: "Partners", href: "/partners", ariaLabel: "Our Partners" },
      ],
    },
    {
      label: "Contact",
      bgColor: theme === "dark" ? "#271E37" : "#D1D5DB",
      textColor: theme === "dark" ? "#fff" : "#000",
      links: [
        { label: "Email", href: "/contact", ariaLabel: "Email us" },
        {
          label: "Discord",
          href: "https://discord.gg/y9kRMNn49K",
          ariaLabel: "Join Discord",
        },
        {
          label: "Instagram",
          href: "https://www.instagram.com/repdox.official",
          ariaLabel: "Follow on Instagram",
        },
      ],
    },
  ];

  // Mobile view: use CardNav with updated items matching desktop
  if (isMobile) {
    const mobileItems = [
      {
        label: "Menu",
        bgColor: theme === "dark" ? "#0D0716" : "#F3F4F6",
        textColor: theme === "dark" ? "#fff" : "#1F2937",
        links: [
          { label: "Events", href: "/events", ariaLabel: "Browse Events" },
          { label: "Join Us", href: "/join-us", ariaLabel: "Join Us" },
          // { label: "Community", href: "/community", ariaLabel: "Community" },
          { label: "About Us", href: "/about", ariaLabel: "About Us" },
          { label: "Contact", href: "/contact", ariaLabel: "Contact Us" },
        ],
      },
      {
        label: "Account",
        bgColor: theme === "dark" ? "#170D27" : "#E5E7EB",
        textColor: theme === "dark" ? "#fff" : "#111827",
        links: user
          ? [
              { label: "Profile", href: "/profile", ariaLabel: "My Profile" },
              {
                label: "My Events",
                href: "/my-events",
                ariaLabel: "My Events",
              },
              ...(isAdmin
                ? [
                    {
                      label: "Admin: Events",
                      href: "/admin/events",
                      ariaLabel: "Admin Events",
                    },
                    {
                      label: "Admin: Volunteers",
                      href: "/admin/volunteers",
                      ariaLabel: "Admin Volunteers",
                    },
                  ]
                : []),
            ]
          : [{ label: "Sign In", href: "/signin", ariaLabel: "Sign In" }],
      },
    ];

    return (
      <CardNav
        logo={
          <span className="font-display text-[15px] font-bold tracking-[0.08em] uppercase whitespace-nowrap flex-shrink-0 text-foreground">
            Repdox
          </span>
        }
        items={mobileItems}
        baseColor={theme === "dark" ? "#141110" : "#fff"}
        menuColor={theme === "dark" ? "#f2ede7" : "#1a1512"}
        buttonBgColor={theme === "dark" ? "#f2ede7" : "#1a1512"}
        buttonTextColor={theme === "dark" ? "#1a1512" : "#f2ede7"}
        ease="power3.out"
      />
    );
  }

  // Desktop view - glassmorphism with scroll enhancement
  return (
    <motion.header
      initial={false}
      animate={{
        height: scrolled ? 56 : 64,
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 transition-colors duration-300"
      style={{
        background: theme === "dark"
          ? (scrolled ? "hsl(30 8% 8% / 0.75)" : "hsl(30 8% 8% / 0.35)")
          : (scrolled ? "hsl(36 30% 98% / 0.8)" : "hsl(36 30% 98% / 0.4)"),
        backdropFilter: scrolled
          ? "blur(20px) saturate(200%)"
          : "blur(16px) saturate(180%)",
        WebkitBackdropFilter: scrolled
          ? "blur(20px) saturate(200%)"
          : "blur(16px) saturate(180%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex h-full items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex-shrink-0 group relative py-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-sm bg-accent" />
                <span className="font-display text-xl font-bold tracking-[0.1em] text-foreground group-hover:text-accent transition-colors duration-300">
                  REPDOX
                </span>
              </div>
            </Link>

            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                {navigationLinks.map((link, index) => (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuLink
                      asChild
                      className="relative px-5 py-2.5 text-sm font-semibold text-foreground/60 hover:text-foreground transition-all duration-300 group whitespace-nowrap tracking-wide"
                    >
                      <Link to={link.href}>
                        {link.label}
                        <motion.span
                          className="absolute bottom-1 left-5 right-5 h-0.5 bg-accent w-0 group-hover:w-[calc(100%-40px)] transition-all origin-left"
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        />
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Theme Toggle */}
            <motion.button
              onClick={toggleTheme}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-accent" />
              )}
            </motion.button>

            {authLoading ? (
              <div className="h-10 w-24 bg-accent/10 animate-pulse rounded-xl" />
            ) : user ? (
              <div className="relative">
                <motion.button
                  onClick={() => setMenuOpen((s) => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-transparent ring-accent/50 hover:ring-accent transition-all"
                  aria-label="Open user menu"
                >
                  {avatarSrc && !avatarError ? (
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    (() => {
                      const meta = (user.user_metadata ?? {}) as Record<
                        string,
                        unknown
                      >;
                      const name =
                        fullName ||
                        (typeof meta["full_name"] === "string"
                          ? meta["full_name"]
                          : (user.email ?? ""));
                      const initials = name
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      return (
                        <div className="w-full h-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
                          {initials || "U"}
                        </div>
                      );
                    })()
                  )}
                </motion.button>

                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-48 bg-popover/90 backdrop-blur-xl rounded-2xl shadow-xl border border-border py-2 z-60 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/10 transition-colors"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/my-events");
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-foreground/80 hover:text-foreground hover:bg-accent/10 transition-colors"
                    >
                      My Events
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/admin/events");
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-accent font-semibold hover:bg-accent/10 transition-colors flex items-center gap-2 border-t border-border/50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Approve Events
                        </button>
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            navigate("/admin/volunteers");
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-accent font-semibold hover:bg-accent/10 transition-colors flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Manage Volunteers
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              <Link to="/signin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 rounded-xl bg-accent text-accent-foreground font-semibold text-sm hover:shadow-accent transition-shadow"
                >
                  Sign In
                </motion.button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
