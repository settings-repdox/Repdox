import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadAvatar as uploadAvatarService,
  getAvatarSignedUrl,
  deleteUserAccount,
  createVerification,
  verifyToken,
} from "@/lib/profileService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProfileCard from "@/components/ProfileCard";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Save,
  Upload,
  LogOut,
  User as UserIcon,
  Briefcase,
  Phone,
  MapPin,
  Globe,
  Calendar,
  QrCode,
  Settings,
  Users,
  CheckCircle2,
  AlertCircle,
  Info,
  Award,
} from "lucide-react";
import Dashboard from "./Dashboard";
import EmailChangeModal from "@/components/EmailChangeModal";
import AchievementCard from "@/components/AchievementCard";
import {
  getUserAchievements,
  type Achievement,
} from "@/lib/achievementService";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  phone: string | null;
  website: string | null;
  company: string | null;
  job_title: string | null;
  handle?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_url?: string | null;
  instagram_url?: string | null;
  portfolio_url?: string | null;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

const sections = [
  { id: "preferences", label: "Preferences", icon: Settings },
  { id: "personal", label: "Personal Info", icon: UserIcon },
  { id: "dashboard", label: "Dashboard", icon: Users },
  { id: "achievements", label: "Achievements", icon: Award },
  { id: "professional", label: "Professional", icon: Briefcase },
  { id: "contact", label: "Contact", icon: Phone },
  { id: "card", label: "Digital Card", icon: QrCode },
  { id: "security", label: "Security", icon: UserIcon },
];

export default function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSection, setActiveSection] = useState("personal");
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);

  const calculateProfileCompletion = () => {
    if (!profile) return { percentage: 0, missing: [] };

    const fields = [
      { key: "full_name", label: "Full Name", value: profile.full_name },
      {
        key: "date_of_birth",
        label: "Date of Birth",
        value: profile.date_of_birth,
      },
      { key: "bio", label: "Bio", value: profile.bio },
      {
        key: "avatar_url",
        label: "Profile Picture",
        value: profile.avatar_url,
      },
      { key: "phone", label: "Phone Number", value: profile.phone },
      { key: "website", label: "Website", value: profile.website },
      { key: "company", label: "Company", value: profile.company },
      { key: "job_title", label: "Job Title", value: profile.job_title },
    ];

    const completed = fields.filter(
      (field) => field.value && field.value.toString().trim() !== "",
    );
    const missing = fields.filter(
      (field) => !field.value || field.value.toString().trim() === "",
    );
    const percentage = Math.round((completed.length / fields.length) * 100);

    return { percentage, missing: missing.map((f) => f.label) };
  };

  const { percentage: completionPercentage, missing: missingFields } =
    calculateProfileCompletion();

  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (user?.id) {
      getUserAchievements(user.id).then(setAchievements);
    }
  }, [user?.id, profile]);

  // if a ?section= parameter is present, switch to it (dashboard only when viewing own profile)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get("section");
    if (!section) return;

    if (section === "dashboard") {
      // only allow dashboard when viewing own profile (no userId) or it's the current user
      if (!userId || (user && profile && user.id === profile.user_id)) {
        setActiveSection("dashboard");
      }
    } else {
      setActiveSection(section);
    }
  }, [location.search, user, profile, userId]);

  // Form states
  const [fullName, setFullName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cardMode, setCardMode] = useState<"personal" | "event">("personal");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [selectedEventReg, setSelectedEventReg] = useState<any>(null);

  const isOwnProfile =
    !userId || (user && profile && user.id === profile.user_id);

  const [preferences, setPreferences] = useState({
    theme: "auto",
    emailNotifications: true,
    eventReminders: true,
  });

  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verification states
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");

  const loadUserProfile = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      // VIEWING ANOTHER USER'S PROFILE
      if (userId) {

        const { data: profileData, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(
            "[Profile] Error loading other user profile:",
            profileError,
          );
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);

          // Populate form fields with the viewed user's data
          setFullName(profileData.full_name || "");
          setHandle(profileData.handle || "");
          setBio(profileData.bio || "");
          setJobTitle(profileData.job_title || "");
          setCompany(profileData.company || "");
          setWebsite(profileData.website || "");
          setPhone(profileData.phone || "");
          setDateOfBirth(profileData.date_of_birth || "");
          setLinkedinUrl(profileData.linkedin_url || "");
          setGithubUrl(profileData.github_url || "");
          setTwitterUrl(profileData.twitter_url || "");
          setInstagramUrl(profileData.instagram_url || "");
          setPortfolioUrl(profileData.portfolio_url || "");
        } else {
          setError("Profile not found");
        }

        // Set current user if available
        if (!userError && currentUser) {
          setUser(currentUser);
        }

        // Load preferences
        try {
          const stored = localStorage.getItem("userPreferences");
          if (stored) {
            setPreferences(JSON.parse(stored));
          }
        } catch (err) {
          console.error("Error loading preferences:", err);
        }

        return; // Exit early - don't load own profile
      }

      // VIEWING OWN PROFILE
      if (userError) throw userError;
      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setHandle(profileData.handle || "");
        setBio(profileData.bio || "");
        setJobTitle(profileData.job_title || "");
        setCompany(profileData.company || "");
        setWebsite(profileData.website || "");
        setPhone(profileData.phone || "");
        setDateOfBirth(profileData.date_of_birth || "");
        setLinkedinUrl(profileData.linkedin_url || "");
        setGithubUrl(profileData.github_url || "");
        setTwitterUrl(profileData.twitter_url || "");
        setInstagramUrl(profileData.instagram_url || "");
        setPortfolioUrl(profileData.portfolio_url || "");
      }

      try {
        const stored = localStorage.getItem("userPreferences");
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      setError("Failed to load profile data");
    }
  }, [navigate, userId]);

  useEffect(() => {
    if (selectedEventId) {
      const reg = userEvents.find((e) => e.event_id === selectedEventId);
      setSelectedEventReg(reg);
    } else {
      setSelectedEventReg(null);
    }
  }, [selectedEventId, userEvents]);

  const loadUserEvents = useCallback(async () => {
    try {
      const userIdToQuery = user?.id;
      if (!userIdToQuery) return;
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, events!event_id(*)")
        .eq("user_id", userIdToQuery)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserEvents(data || []);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadUserEvents();
    }
  }, [user, loadUserEvents]);

  // Load user and profile on mount
  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  useEffect(() => {
    if (profile?.avatar_url) {

      getAvatarSignedUrl(profile.avatar_url)
        .then((url) => {
          setAvatarUrl(url);
        })
        .catch((err) => {
          console.error("[Profile] Error loading avatar:", err);
          setAvatarUrl(null);
        });
    } else {
      setAvatarUrl(null);
    }
  }, [profile?.avatar_url]);

  const loadAvatarUrl = async (path: string) => {
    try {
      const url = await getAvatarSignedUrl(path);
      setAvatarUrl(url);
    } catch (err) {
      console.error("Error loading avatar:", err);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Prevent saving when viewing another user's profile
    if (userId && userId !== user.id) {
      setError("You cannot edit another user's profile");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let avatarPath = profile?.avatar_url;

      if (avatarFile) {
        avatarPath = await uploadAvatarService(user.id, avatarFile);
      }


      const { error: upsertError } = await supabase
        .from("user_profiles")
        .upsert(
          {
            id: profile?.id, // Include id to ensure correct conflict resolution
            user_id: user.id,
            full_name: fullName || null,
            handle: handle || null,
            bio: bio || null,
            job_title: jobTitle || null,
            company: company || null,
            website: website || null,
            phone: phone || null,
            date_of_birth: dateOfBirth || null,
            avatar_url: avatarPath,
            linkedin_url: linkedinUrl || null,
            github_url: githubUrl || null,
            twitter_url: twitterUrl || null,
            instagram_url: instagramUrl || null,
            portfolio_url: portfolioUrl || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (upsertError) throw upsertError;

      setSuccess("Profile updated successfully!");
      setAvatarFile(null);
      setAvatarPreview(null);

      await loadUserProfile();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error("Error saving profile:", err);
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deleteUserAccount();
      navigate("/");
    } catch (err: unknown) {
      console.error("Error deleting account:", err);
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setDeleteLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] bg-background overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 bg-card border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col items-center">
              <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-accent/20 flex items-center justify-center bg-accent/10 mb-4">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-accent flex items-center justify-center text-accent-foreground text-2xl font-bold">
                    {getInitials()}
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-foreground text-center">
                {fullName || "Your Name"}
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                {jobTitle || "Your Title"}
              </p>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-1">
              {sections
                .filter((s) => {
                  // Hide dashboard and security sections when viewing other profiles
                  if (
                    !isOwnProfile &&
                    (s.id === "dashboard" ||
                      s.id === "security" ||
                      s.id === "preferences")
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                        activeSection === section.id
                          ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {section.label}
                    </button>
                  );
                })}
            </div>
          </nav>

          <div className="mb-6 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-medium text-gray-700">
                    Profile Completion
                  </span>
                  <span className="text-sm font-bold text-purple-600">
                    {completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-cyan h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
                {completionPercentage === 100 && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Your profile is 100% complete!
                  </p>
                )}
              </div>

          <div className="p-4 border-t border-border mt-auto">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-8xl mx-auto p-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Profile Settings
                </h1>
                <p className="text-muted-foreground">
                  Manage your account information and preferences
                </p>
              </div>

              {/* Messages */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm"
                >
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-700 dark:text-green-400 text-sm"
                >
                  {success}
                </motion.div>
              )}

              {!isOwnProfile && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <UserIcon className="w-5 h-5" />
                    <p className="text-sm font-medium">
                      Viewing {profile?.full_name || "user"}'s profile
                    </p>
                  </div>
                </div>
              )}

              {/* Content Sections */}
              <div className="bg-card rounded-xl shadow-sm border border-border p-8">
                {activeSection === "personal" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Personal Information
                    </h2>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">
                        Profile Picture
                      </label>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg cursor-pointer hover:bg-accent/20 transition">
                        <Upload className="w-4 h-4 text-accent" />
                        <span className="text-sm font-medium text-accent">
                          Choose Image
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarSelect}
                          disabled={!isOwnProfile}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        disabled={!isOwnProfile}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        @Handle (like @twitter)
                      </label>
                      <div className="flex items-center">
                        <span className="px-4 py-3 bg-muted border border-r-0 border-border rounded-l-lg text-muted-foreground">
                          @
                        </span>
                        <input
                          type="text"
                          value={handle}
                          onChange={(e) =>
                            setHandle(e.target.value.replace(/\s+/g, ""))
                          }
                          disabled={!isOwnProfile}
                          placeholder="your_handle"
                          className="flex-1 px-4 py-3 border border-border rounded-r-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This is required to post in the community. Keep it
                        unique and memorable.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                        <input
                          type="date"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          disabled={!isOwnProfile}
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition resize-none"
                      />
                    </div>
                  </div>
                )}

                {activeSection === "dashboard" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Dashboard
                    </h2>

                    <div>
                      <Dashboard embeddedUser={user} />
                    </div>
                  </div>
                )}

                {activeSection === "professional" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Professional Details
                    </h2>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Job Title
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          placeholder="e.g., Software Engineer, Designer"
                          disabled={!isOwnProfile}
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Your company name"
                          disabled={!isOwnProfile}
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yourwebsite.com"
                          disabled={!isOwnProfile}
                          className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-border">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Social Links
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add your social profiles to display on your digital card
                      </p>

                      <div className="space-y-4">
                        {/* LinkedIn */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            LinkedIn
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="url"
                              value={linkedinUrl}
                              onChange={(e) => setLinkedinUrl(e.target.value)}
                              disabled={!isOwnProfile}
                              placeholder="https://linkedin.com/in/yourprofile"
                              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>

                        {/* GitHub */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            GitHub
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="url"
                              value={githubUrl}
                              onChange={(e) => setGithubUrl(e.target.value)}
                              placeholder="https://github.com/yourusername"
                              disabled={!isOwnProfile}
                              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Twitter */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Twitter / X
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="url"
                              value={twitterUrl}
                              onChange={(e) => setTwitterUrl(e.target.value)}
                              placeholder="https://twitter.com/yourusername"
                              disabled={!isOwnProfile}
                              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Instagram */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Instagram
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="url"
                              value={instagramUrl}
                              onChange={(e) => setInstagramUrl(e.target.value)}
                              placeholder="https://instagram.com/yourusername"
                              disabled={!isOwnProfile}
                              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>

                        {/* Portfolio */}
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Portfolio / Website
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                              type="url"
                              value={portfolioUrl}
                              onChange={(e) => setPortfolioUrl(e.target.value)}
                              placeholder="https://yourportfolio.com"
                              disabled={!isOwnProfile}
                              className="w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "achievements" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Your Achievements
                    </h2>

                    <div className="grid gap-3">
                      {achievements
                        .sort((a, b) => {
                          if (a.unlocked === b.unlocked) return 0;
                          return a.unlocked ? -1 : 1;
                        })
                        .map((achievement) => (
                          <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                          />
                        ))}
                    </div>

                    <div className="mt-6 p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <h3 className="font-semibold text-sm mb-2">
                        Achievement Stats
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Unlocked</p>
                          <p className="text-2xl font-bold text-accent">
                            {achievements.filter((a) => a.unlocked).length}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="text-2xl font-bold">
                            {achievements.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "contact" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Contact Information
                    </h2>

                    {/* Email Field with Verification Status */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-3 px-4 py-3 bg-muted rounded-lg border border-border">
                        <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 text-foreground">
                          {isOwnProfile
                            ? user?.email || "Not set"
                            : "Email Hidden"}
                        </span>

                        {/* Verification Status Badge */}
                        {user?.email_confirmed_at ? (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full">
                            <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-medium text-green-700 dark:text-green-300">
                              Verified
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              Not Verified
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Email Change Option (Only for own profile) */}
                      {isOwnProfile && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => setShowEmailChangeModal(true)}
                            className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
                          >
                            Change email address
                          </button>
                        </div>
                      )}

                      {/* Verification Actions (Only if not verified and own profile) */}
                      {isOwnProfile && !user?.email_confirmed_at && (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-start gap-3 mb-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                                Email Not Verified
                              </h4>
                              <p className="text-sm text-amber-800 dark:text-amber-200">
                                Please verify your email to access all features
                                and ensure account security.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                navigate(
                                  `/verify-email?email=${encodeURIComponent(user?.email || "")}`,
                                )
                              }
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Verify Email
                            </button>

                            <button
                              onClick={async () => {
                                try {
                                  if (!user?.id || !user.email) return;
                                  const res = await createVerification(
                                    user.id,
                                    "email",
                                    user.email,
                                  );
                                  const desc =
                                    res?.token && import.meta.env.DEV
                                      ? `Token: ${res.token} (dev only)`
                                      : `Verification email sent to ${user.email}`;
                                  toast({
                                    title: "Verification sent",
                                    description: desc,
                                  });
                                  setEmailVerificationSent(true);
                                } catch (err: unknown) {
                                  console.error(
                                    "Send email verification failed",
                                    err,
                                  );
                                  const message =
                                    err instanceof Error
                                      ? err.message
                                      : String(err);
                                  toast({
                                    title: "Failed",
                                    description: message,
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium rounded-lg transition-colors"
                            >
                              Resend Verification Email
                            </button>
                          </div>

                          {/* Manual Token Entry (Development/Testing) */}
                          {emailVerificationSent && (
                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="text"
                                value={emailToken}
                                onChange={(e) => setEmailToken(e.target.value)}
                                placeholder="Enter verification token"
                                className="flex-1 px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-gray-800 text-foreground text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                              />
                              <button
                                onClick={async () => {
                                  try {
                                    if (!user?.id) return;
                                    const ok = await verifyToken(
                                      user.id,
                                      "email",
                                      emailToken,
                                    );
                                    if (ok) {
                                      toast({
                                        title: "Verified",
                                        description:
                                          "Email verified successfully",
                                      });
                                      // Reload user
                                      const {
                                        data: { user: updated },
                                      } = await supabase.auth.getUser();
                                      setUser(updated as any);
                                      setEmailVerificationSent(false);
                                      setEmailToken("");
                                    } else {
                                      toast({
                                        title: "Invalid token",
                                        description:
                                          "Token expired or incorrect",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (err: unknown) {
                                    toast({
                                      title: "Verification failed",
                                      description:
                                        err instanceof Error
                                          ? err.message
                                          : String(err),
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
                              >
                                Verify
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Read-only notice for viewing other profiles */}
                      {!isOwnProfile && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Email is private and only visible to the account owner
                        </p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          disabled={!isOwnProfile}
                          className={`w-full pl-11 pr-4 py-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition ${
                            !isOwnProfile
                              ? "opacity-60 cursor-not-allowed bg-muted"
                              : ""
                          }`}
                        />
                      </div>

                      {/* Phone Verification (Only for own profile) */}
                      {isOwnProfile && phone && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  if (!user?.id || !phone) {
                                    toast({
                                      title: "Error",
                                      description:
                                        "Please enter a phone number first",
                                      variant: "destructive",
                                    });
                                    return;
                                  }
                                  const res = await createVerification(
                                    user.id,
                                    "phone",
                                    phone,
                                  );
                                  const descPhone =
                                    res?.token && import.meta.env.DEV
                                      ? `Code: ${res.token} (dev only)`
                                      : `OTP sent to ${phone}`;
                                  toast({
                                    title: "OTP sent",
                                    description: descPhone,
                                  });
                                  setPhoneVerificationSent(true);
                                } catch (err: unknown) {
                                  toast({
                                    title: "Failed to send OTP",
                                    description:
                                      err instanceof Error
                                        ? err.message
                                        : String(err),
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
                            >
                              Verify Phone Number
                            </button>

                            {phoneVerificationSent && (
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="text"
                                  value={phoneToken}
                                  onChange={(e) =>
                                    setPhoneToken(e.target.value)
                                  }
                                  placeholder="Enter 6-digit code"
                                  maxLength={6}
                                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                                />
                                <button
                                  onClick={async () => {
                                    try {
                                      if (!user?.id) return;
                                      const ok = await verifyToken(
                                        user.id,
                                        "phone",
                                        phoneToken,
                                      );
                                      if (ok) {
                                        toast({
                                          title: "Verified",
                                          description:
                                            "Phone number verified successfully",
                                        });
                                        await loadUserProfile();
                                        setPhoneVerificationSent(false);
                                        setPhoneToken("");
                                      } else {
                                        toast({
                                          title: "Invalid code",
                                          description:
                                            "Code expired or incorrect",
                                          variant: "destructive",
                                        });
                                      }
                                    } catch (err: unknown) {
                                      toast({
                                        title: "Verification failed",
                                        description:
                                          err instanceof Error
                                            ? err.message
                                            : String(err),
                                        variant: "destructive",
                                      });
                                    }
                                  }}
                                  className="px-4 py-2 bg-accent text-accent-foreground text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
                                >
                                  Verify
                                </button>
                              </div>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            We'll send a verification code to this number
                          </p>
                        </div>
                      )}

                      {!isOwnProfile && !phone && (
                        <p className="text-xs text-muted-foreground mt-2">
                          No phone number provided
                        </p>
                      )}
                    </div>

                    {/* Privacy Notice */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Privacy & Security
                          </h4>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>
                              • Your email is private and never shared publicly
                            </li>
                            <li>
                              • Phone number is optional and used for
                              verification only
                            </li>
                            {isOwnProfile && (
                              <li>
                                • You control what information is visible on
                                your profile
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "card" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Your Digital Card
                    </h2>

                    <p className="text-sm text-muted-foreground mb-6">
                      Your personal digital card displays your profile
                      information and social links. Use the QR code for
                      networking or event check-ins.
                    </p>

                    {/* Mode Toggle - Only show if user has events */}
                    {userEvents.length > 0 && (
                      <>
                        <div className="flex gap-2 mb-6">
                          <button
                            onClick={() => setCardMode("personal")}
                            className={`px-4 py-2 rounded-lg transition ${
                              cardMode === "personal"
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            Personal Mode
                          </button>
                          <button
                            onClick={() => setCardMode("event")}
                            className={`px-4 py-2 rounded-lg transition ${
                              cardMode === "event"
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted hover:bg-muted/80"
                            }`}
                          >
                            Event Mode
                          </button>
                        </div>

                        {/* Event Selector (only in event mode) */}
                        {cardMode === "event" && (
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Select Event
                            </label>
                            <select
                              value={selectedEventId || ""}
                              onChange={(e) =>
                                setSelectedEventId(e.target.value || null)
                              }
                              className="w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-accent focus:border-transparent outline-none"
                            >
                              <option value="">Choose an event...</option>
                              {userEvents.map((evt) => (
                                <option key={evt.id} value={evt.event_id}>
                                  {evt.events?.title} -{" "}
                                  {evt.role?.replace("_", " ").toUpperCase()}
                                </option>
                              ))}
                            </select>
                            {userEvents.length === 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                                You haven't registered for any events yet.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Profile Card Display */}
                    <div className="flex justify-center items-center min-h-[600px] bg-gradient-to-br from-background to-muted/30 rounded-xl p-8">
                      <ProfileCard
                        mode={cardMode}
                        userData={{
                          user_id: user.id,
                          full_name: fullName || "Your Name",
                          handle: handle || "yourhandle",
                          bio: bio || "Your bio",
                          avatar_url: avatarUrl,
                          phone: phone,
                          email: user.email || null,
                          job_title: jobTitle,
                          company: company,
                          socials: {
                            linkedin_url: linkedinUrl || null,
                            github_url: githubUrl || null,
                            twitter_url: twitterUrl || null,
                            instagram_url: instagramUrl || null,
                            portfolio_url: portfolioUrl || null,
                          },
                        }}
                        eventData={
                          cardMode === "event" && selectedEventReg
                            ? selectedEventReg.events
                            : null
                        }
                        eventRegistration={
                          cardMode === "event" ? selectedEventReg : null
                        }
                        enableTilt={true}
                        behindGlowEnabled={true}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mt-8">
                      <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                        <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Note
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            The QR on your card is used only for event check-in. It does not expose your public profile or social links.
                          </p>
                      </div>

                      {userEvents.length > 0 && (
                        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
                          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <QrCode className="w-4 h-4" />
                            Event Check-in
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Event volunteers use the same QR to check you in.
                            Your card shows your role automatically.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === "security" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Security & Privacy
                    </h2>

                    <div className="border border-destructive/30 rounded-lg p-6 bg-destructive/5">
                      <h3 className="text-lg font-semibold text-destructive mb-2">
                        Danger Zone
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Once you delete your account, there is no going back.
                        Please be certain.
                      </p>

                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          <p className="mb-2">This will permanently delete:</p>
                          <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Your profile and personal information</li>
                            <li>All events you've created</li>
                            <li>Your event registrations</li>
                            <li>Your avatar and uploaded files</li>
                            <li>All associated data</li>
                          </ul>
                        </div>

                        <Button
                          variant="destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="w-full sm:w-auto"
                        >
                          Delete My Account
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeSection === "preferences" && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                      Your Preferences
                    </h2>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className="text-sm text-muted-foreground">
                            Receive updates about your events
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.emailNotifications}
                          onChange={(e) => {
                            const updated = {
                              ...preferences,
                              emailNotifications: e.target.checked,
                            };
                            setPreferences(updated);
                            localStorage.setItem(
                              "userPreferences",
                              JSON.stringify(updated),
                            );
                          }}
                          disabled={!isOwnProfile}
                          className="w-4 h-4"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                        <div>
                          <div className="font-medium">Event Reminders</div>
                          <div className="text-sm text-muted-foreground">
                            Get reminded before events start
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.eventReminders}
                          onChange={(e) => {
                            const updated = {
                              ...preferences,
                              eventReminders: e.target.checked,
                            };
                            setPreferences(updated);
                            localStorage.setItem(
                              "userPreferences",
                              JSON.stringify(updated),
                            );
                          }}
                          disabled={!isOwnProfile}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button - Only show for editable sections */}
                {activeSection !== "card" &&
                  activeSection !== "security" &&
                  isOwnProfile && (
                    <div className="mt-8 pt-6 border-t border-border">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full sm:w-auto gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Save className="w-4 h-4" />
                        {isLoading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  )}
              </div>
            </motion.div>
          </div>
        </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account, all your events, registrations, and remove all your data
              from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showEmailChangeModal && (
        <EmailChangeModal
          currentEmail={user?.email || ""}
          onClose={() => setShowEmailChangeModal(false)}
          onSuccess={() => {
            // Refresh user data
            supabase.auth.getUser().then(({ data }) => {
              if (data.user) {
                // User state will update automatically
              }
            });
          }}
        />
      )}
    </div>
  );
}
