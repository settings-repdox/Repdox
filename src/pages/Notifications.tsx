import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { registerDefaults } from "@/bootstrap/registerDefaults";
import { resolveService } from "@/core/services/di";
import type { IUserService } from "@/core/services/interfaces/IUserService";
import type { UserDTO } from "@/shared/dtos/user.dto";
import { getPublicUrl } from "@/lib/storageService";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Settings,
  Search,
} from "lucide-react";
import { getRelativeTime } from "@/lib/timeUtils";

registerDefaults();
const userServiceCore = () => resolveService<IUserService>("UserService");

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  handle: string | null;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  type: "like" | "comment";
  from_user?: UserProfile;
  post_id?: string;
  post_content?: string;
  comment_content?: string;
  created_at: string;
  read: boolean;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "verified" | "mentions">(
    "all"
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeNotifications = async () => {
      const currentUser = await userServiceCore().getCurrentUser();

      if (!currentUser) {
        navigate("/signin");
        return;
      }

      setUser(currentUser);
      await loadNotifications(currentUser.id);
    };

    initializeNotifications();
  }, [navigate]);

  const getAvatarUrl = (
    avatarPath: string | null | undefined
  ): string | null => {
    if (!avatarPath) return null;
    if (avatarPath.startsWith("http")) return avatarPath;

    let cleanPath = avatarPath;
    if (cleanPath.startsWith("avatars/")) {
      cleanPath = cleanPath.replace("avatars/", "");
    }
    if (cleanPath.startsWith("/")) {
      cleanPath = cleanPath.substring(1);
    }

    return getPublicUrl(cleanPath, "avatars");
  };

  const loadNotifications = async (userId: string) => {
    try {
      setIsLoading(true);
      const mockNotifications: Notification[] = [];

      // Currently no active notification sources since community features were removed
      // Future notification sources can be added here (e.g., event-related notifications)

      mockNotifications.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(mockNotifications);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    return <Bell className="w-5 h-5 text-accent" />;
  };

  const getNotificationText = (notification: Notification) => {
    return "interacted with your content";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex h-screen w-full max-w-[1323px]">
        {/* Center Content */}
        <div className="w-full max-w-[600px] border-r border-border overflow-y-auto h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">

                <div>
                  <h1 className="text-xl font-bold">Notifications</h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-accent hover:underline"
                  >
                    Clear all
                  </button>
                )}

                <button
                  className="p-2 hover:bg-accent/10 rounded-full transition"
                  title="Direct messages settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "all"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                All
              </button>

              <button
                onClick={() => setActiveTab("verified")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "verified"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Verified
              </button>

              <button
                onClick={() => setActiveTab("mentions")}
                className={`flex-1 py-4 text-center font-semibold transition ${
                  activeTab === "mentions"
                    ? "text-foreground border-b-2 border-accent"
                    : "text-muted-foreground hover:bg-accent/10"
                }`}
              >
                Mentions
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No notifications yet
                </h3>
                <p className="text-sm text-muted-foreground">
                  When someone interacts with your posts, you'll see it here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    if (notification.from_user) {
                      navigate(`/profile/${notification.from_user.user_id}`);
                    }
                  }}
                  className={`border-b border-border px-4 py-3 hover:bg-accent/5 transition cursor-pointer ${
                    !notification.read ? "bg-accent/5" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex gap-3 flex-1">
                       {/* Existing from_user rendering... */}
                      {getAvatarUrl(notification.from_user?.avatar_url) ? (
                        <img
                          src={
                            getAvatarUrl(notification.from_user?.avatar_url)!
                          }
                          alt={notification.from_user?.full_name || "User"}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold">
                          {notification.from_user?.full_name?.[0] || "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-bold">
                            {notification.from_user?.full_name || "Someone"}
                          </span>{" "}
                          {getNotificationText(notification)}
                        </p>
                        {notification.post_content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            "{notification.post_content}"
                          </p>
                        )}
                        {notification.comment_content && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            "{notification.comment_content}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {getRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Search & Trending */}
        <div className="w-[400px] flex-shrink-0 border-l border-border p-4 hidden xl:flex flex-col sticky top-0 h-full overflow-y-auto">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-12 pr-4 py-3 rounded-full bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* What's happening */}
          <div className="bg-muted rounded-2xl p-4">
            <h2 className="text-xl font-bold mb-4">What's happening</h2>
            <div className="space-y-3">
              {/* Add trending content here */}
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  No trending topics yet
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
