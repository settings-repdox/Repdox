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
import { Moon, Sun, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { isUserAdmin } from "@/lib/adminService";

type UserProfile = {
  id: string;
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  handle?: string | null;
};

export default function Nav() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarPath, setAvatarPath] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data?.user ?? null);
      if (data?.user) {
        isUserAdmin().then(setIsAdmin);
      }

      // If there's a logged-in user, check whether they already have a profile.
      // If not, redirect them to the Profile page to complete onboarding.
      try {
        const u = data?.user;
        if (u) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("user_id", u.id)
            .maybeSingle();
          if (!profile) {
            // only navigate if we're not already on the profile page
            if (window.location.pathname !== "/profile") {
              navigate("/profile?onboard=1");
            }
          }
        }
      } catch (err) {
        console.error("Error checking onboarding status:", err);
      }
    };
    load();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          isUserAdmin().then(setIsAdmin);
        } else {
          setIsAdmin(false);
        }
        // When auth state changes (e.g. sign in), check onboarding
        (async () => {
          const u = session?.user;
          if (!u) return;
          try {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("user_id", u.id)
              .maybeSingle();
            if (!profile) {
              if (window.location.pathname !== "/profile") {
                navigate("/profile?onboard=1");
              }
            }
          } catch (err) {
            console.error(
              "Error checking onboarding status after auth change:",
              err
            );
          }
        })();
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [navigate]);

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
            setAvatarSrc(data.signedUrl);
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
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

      // helper to pick first string url from candidates
      const pick = (...keys: string[]) => {
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
        "avatar",
        "photo_url"
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
      onProfileUpdated as EventListener
    );

    return () => {
      window.removeEventListener(
        "profile:updated",
        onProfileUpdated as EventListener
      );
    };
  }, [user]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const navigationLinks = [
    { href: "/events", label: "Events" },
    // { href: "/community", label: "Community" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  const items = [
    {
      label: "Events",
      bgColor: theme === 'dark' ? "#0D0716" : "#F3F4F6",
      textColor: theme === 'dark' ? "#fff" : "#1F2937",
      links: [
        {
          label: "Hackathons",
          href: "/events/hackathons",
          ariaLabel: "View Hackathons",
        },
        {
          label: "Model UN",
          href: "/events/model-un",
          ariaLabel: "View Model UN Events",
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
      bgColor: theme === 'dark' ? "#170D27" : "#E5E7EB",
      textColor: theme === 'dark' ? "#fff" : "#111827",
      links: [
        { label: "About Us", href: "/about", ariaLabel: "About Repdox" },
        { label: "Our Team", href: "/team", ariaLabel: "Meet Our Team" },
        { label: "Partners", href: "/partners", ariaLabel: "Our Partners" },
      ],
    },
    {
      label: "Contact",
      bgColor: theme === 'dark' ? "#271E37" : "#D1D5DB",
      textColor: theme === 'dark' ? "#fff" : "#000",
      links: [
        { label: "Email", href: "/contact", ariaLabel: "Email us" },
        { label: "Discord", href: "https://discord.gg/TbAqDgy4cw", ariaLabel: "Join Discord" },
        { label: "Instagram", href: "https://www.instagram.com/repdox.official", ariaLabel: "Follow on Instagram" },
      ],
    },
  ];

  // Mobile view: use CardNav with updated items matching desktop
  if (isMobile) {
    const mobileItems = [
      {
        label: "Menu",
        bgColor: theme === 'dark' ? "#0D0716" : "#F3F4F6",
        textColor: theme === 'dark' ? "#fff" : "#1F2937",
        links: [
          { label: "Events", href: "/events", ariaLabel: "Browse Events" },
          // { label: "Community", href: "/community", ariaLabel: "Community" },
          { label: "About", href: "/about", ariaLabel: "About Us" },
          { label: "Contact", href: "/contact", ariaLabel: "Contact Us" },
        ],
      },
      {
        label: "Account",
        bgColor: theme === 'dark' ? "#170D27" : "#E5E7EB",
        textColor: theme === 'dark' ? "#fff" : "#111827",
        links: user 
          ? [
              { label: "Profile", href: "/profile", ariaLabel: "My Profile" },
              { label: "My Events", href: "/my-events", ariaLabel: "My Events" },
              ...(isAdmin ? [{ label: "Admin Portal", href: "/admin/events", ariaLabel: "Admin Portal" }] : []),
            ]
          : [
              { label: "Sign In", href: "/signin", ariaLabel: "Sign In" },
            ]
      }
    ];

    return (
      <CardNav
        logo={logo}
        items={mobileItems}
        baseColor={theme === 'dark' ? "#0D0716" : "#fff"}
        menuColor={theme === 'dark' ? "#fff" : "#000"}
        buttonBgColor={theme === 'dark' ? "#fff" : "#000"}
        buttonTextColor={theme === 'dark' ? "#000" : "#fff"}
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/30"
      style={{
        background: scrolled
          ? 'rgba(0, 0, 0, 0.4)'
          : 'rgba(0, 0, 0, 0.2)',
        backdropFilter: scrolled
          ? 'blur(20px) saturate(200%)'
          : 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: scrolled
          ? 'blur(20px) saturate(200%)'
          : 'blur(16px) saturate(180%)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex h-full items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-8">
            <Link to="/" className="flex-shrink-0 group relative py-2">
              <div className="flex items-center">
                <span 
                  className="text-2xl font-black tracking-[0.35em] text-white transition-all duration-300 group-hover:text-purple-400"
                  style={{ 
                    fontFamily: "'Space Grotesk', sans-serif"
                  }}
                >
                  REPDOX
                </span>
              </div>
            </Link>
            
            <NavigationMenu>
              <NavigationMenuList className="gap-2">
                {navigationLinks.map((link, index) => (
                  <NavigationMenuItem key={index}>
                    <NavigationMenuLink
                      href={link.href}
                      className="relative px-5 py-2.5 text-sm font-bold text-foreground/60 hover:text-foreground transition-all duration-300 group whitespace-nowrap tracking-widest uppercase"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {link.label}
                      <motion.span
                        className="absolute bottom-1 left-5 right-5 h-0.5 bg-gradient-to-r from-purple-500 to-cyan w-0 group-hover:w-[calc(100%-40px)] transition-all origin-left"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      />
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
                <Moon className="h-5 w-5 text-purple-400" />
              )}
            </motion.button>

            {user ? (
              <div className="relative">
                <motion.button
                  onClick={() => setMenuOpen((s) => !s)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-transparent ring-purple-500/50 hover:ring-purple-500 transition-all"
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
                      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
                      const name = fullName || 
                        (typeof meta["full_name"] === "string" ? meta["full_name"] : user.email ?? "");
                      const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
                      return (
                        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
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
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/admin/events");
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-purple-600 font-bold hover:bg-accent/10 transition-colors flex items-center gap-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Admin Portal
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              <Link to="/signin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm hover:shadow-lg hover:shadow-purple-500/50 transition-shadow"
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
