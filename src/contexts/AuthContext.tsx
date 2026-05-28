import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isUserAdmin } from "@/lib/adminService";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isProfileComplete: boolean;
  refreshProfileStatus: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);

  const checkProfileStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("full_name, date_of_birth")
        .eq("user_id", userId)
        .maybeSingle();
      setIsProfileComplete(!!(profile?.full_name && profile?.date_of_birth));
    } catch (err) {
      console.error("Error checking profile completion:", err);
      setIsProfileComplete(false);
    }
  };

  const refreshProfileStatus = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await checkProfileStatus(currentSession.user.id);
    } else {
      setIsProfileComplete(false);
    }
  };

  useEffect(() => {
    // Initial session check
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        if (initialSession?.user) {
          const adminStatus = await isUserAdmin();
          setIsAdmin(adminStatus);
          await checkProfileStatus(initialSession.user.id);
        } else {
          setIsProfileComplete(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        const adminStatus = await isUserAdmin();
        setIsAdmin(adminStatus);
        await checkProfileStatus(currentSession.user.id);
      } else {
        setIsAdmin(false);
        setIsProfileComplete(false);
      }
      
      setLoading(false);
    });

    // Periodically query the database to verify the session/user is active and fresh
    const queryInterval = setInterval(async () => {
      try {
        // getUser() queries the Supabase auth server/database to verify the JWT and user state
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        if (error || !currentUser) {
          setUser(null);
          setSession(null);
          setIsAdmin(false);
          setIsProfileComplete(false);
        } else {
          setUser(currentUser);
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          await checkProfileStatus(currentUser.id);
        }
      } catch (err) {
        console.error("Auth periodic database check failed:", err);
      }
    }, 60000); // Check database every 60 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(queryInterval);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isProfileComplete, refreshProfileStatus, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
