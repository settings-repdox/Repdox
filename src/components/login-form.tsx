// src/components/login-form.tsx
// Updated to handle email verification

import React, { useState } from "react";
import { Mail, Lock, Github, Eye, EyeOff, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function AuthForm({ initialMode = "login" }: { initialMode?: "login" | "signup" }) {
  const [isLogin, setIsLogin] = useState(initialMode === "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
    if (isLogin) {
      // LOGIN FLOW
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Check if error is due to unverified email
        if (error.message.includes('Email not confirmed')) {
          setErrorMessage("Please verify your email before logging in.");
          navigate(`/verify-email?email=${encodeURIComponent(email)}`);
          return;
        }
        throw error;
      }

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        setErrorMessage("Please verify your email before logging in.");
        
        // Sign out the user since they're not verified
        await supabase.auth.signOut();
        
        // Redirect to verification page
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

        // Email is verified - proceed with normal login
        if (data.user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("id, full_name, date_of_birth")
            .eq("user_id", data.user.id)
            .maybeSingle();

          // Check if profile is incomplete
          if (!profile || !profile.full_name || !profile.date_of_birth) {
            navigate("/profile?onboard=true");
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      } else {
        // SIGNUP FLOW
        if (password !== confirmPassword) {
          setErrorMessage("Passwords do not match");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            // Store timestamp for tracking
            signup_time: new Date().toISOString()
          }
          },
        });
        
        if (error) throw error;

        if (data.user) {

          // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          // User already exists but not confirmed
          setErrorMessage("This email is already registered but not verified. Redirecting to verification...");
        }

          // Show success message
          alert(
          "Account created successfully! 🎉\n\n" +
          "We've sent a verification email to " + email + "\n\n" +
          "Please check your inbox and spam folder.\n" +
          "Click the link in the email to verify your account."
        );
          
          // Redirect to verification page
          navigate(`/verify-email?email=${encodeURIComponent(email)}&signup=true`);
        }
      }
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || "Authentication error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || `OAuth error with ${provider}`);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center overflow-y-auto overflow-x-hidden z-0 py-8">
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div
          className="absolute top-0 -right-40 w-80 h-80 bg-cyan rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-40 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Form container */}
      <div className="relative w-full flex items-center justify-center p-4 md:p-8 z-10">
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl">
          <div className="bg-card rounded-2xl shadow-2xl overflow-hidden border border-border/50">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Left side - Branding */}
              <div className="hidden md:flex flex-col justify-center items-center bg-gradient-to-br from-purple-600 to-cyan p-8 text-white">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
                  <div className="text-white font-bold text-5xl">R</div>
                </div>
                <h2 className="text-4xl font-bold mb-4 text-center">
                  {isLogin ? "Welcome back" : <span>Join <span style={{ fontFamily: "'Syncopate', sans-serif", letterSpacing: '0.1em' }}>REPDOX</span></span>}
                </h2>
                <p className="text-center text-white/90 text-sm leading-relaxed">
                  {isLogin
                    ? "Access exclusive events, hackathons, and opportunities to transform your future."
                    : "Sign up to explore events, connect with peers, and grow your skills."}
                </p>
              </div>

              {/* Right side - Form */}
              <div className="p-6 md:p-10">
                {/* Mobile header */}
                <div className="text-center mb-6 md:hidden">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-cyan rounded-xl mb-4">
                    <div className="text-white font-bold text-2xl">R</div>
                  </div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {isLogin ? "Welcome back" : "Create account"}
                  </h1>
                </div>

                {/* Desktop header */}
                <div className="hidden md:block mb-8">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    {isLogin ? "Sign In" : "Create Account"}
                  </h1>
                  <p className="text-muted-foreground">
                    {isLogin
                      ? "Sign in to your account to continue"
                      : "Get started with your free account"}
                  </p>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{errorMessage}</p>
                  </div>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => handleOAuth("google")}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-card border border-input rounded-lg font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M19.9895 10.1871C19.9895 9.36767 19.9214 8.76973 19.7742 8.14966H10.1992V11.848H15.8195C15.7062 12.7671 15.0943 14.1512 13.7346 15.0813L13.7155 15.2051L16.7429 17.4969L16.9527 17.5174C18.8789 15.7789 19.9895 13.221 19.9895 10.1871Z" fill="#4285F4"/>
                      <path d="M10.1993 19.9313C12.9527 19.9313 15.2643 19.0454 16.9527 17.5174L13.7346 15.0813C12.8734 15.6682 11.7176 16.0779 10.1993 16.0779C7.50243 16.0779 5.21352 14.3395 4.39759 11.9366L4.27799 11.9466L1.13003 14.3273L1.08887 14.4391C2.76588 17.6945 6.21061 19.9313 10.1993 19.9313Z" fill="#34A853"/>
                      <path d="M4.39748 11.9366C4.18219 11.3166 4.05759 10.6521 4.05759 9.96565C4.05759 9.27909 4.18219 8.61473 4.38615 7.99466L4.38045 7.8626L1.19304 5.44366L1.08875 5.49214C0.397576 6.84305 0.000976562 8.36008 0.000976562 9.96565C0.000976562 11.5712 0.397576 13.0882 1.08875 14.4391L4.39748 11.9366Z" fill="#FBBC05"/>
                      <path d="M10.1993 3.85336C12.1142 3.85336 13.406 4.66168 14.1425 5.33717L17.0207 2.59107C15.253 0.985496 12.9527 0 10.1993 0C6.2106 0 2.76588 2.23672 1.08887 5.49214L4.38626 7.99466C5.21352 5.59183 7.50242 3.85336 10.1993 3.85336Z" fill="#EB4335"/>
                    </svg>
                    Continue with Google
                  </button>
                  <button
                    onClick={() => handleOAuth("github")}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 border border-gray-900 rounded-lg font-medium text-white hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <Github size={20} />
                    Continue with GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-card text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {/* Email Input */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${focusedField === "email" ? "text-purple-600" : "text-muted-foreground"}`}>
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField("")}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${focusedField === "password" ? "text-purple-600" : "text-muted-foreground"}`}>
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField("")}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input (Only for Signup) */}
                  {!isLogin && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className={`absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${focusedField === "confirmPassword" ? "text-purple-600" : "text-muted-foreground"}`}>
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField("")}
                          placeholder="Repeat your password"
                          required
                          className="w-full pl-10 pr-10 py-2.5 bg-background border border-input text-foreground rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all duration-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Forgot Password */}
                  {isLogin && (
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input type="checkbox" className="w-4 h-4 text-purple-600 border-input rounded focus:ring-purple-600 bg-background" />
                        <span className="ml-2 text-sm text-muted-foreground">Remember me</span>
                      </label>
                      <button type="button" className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200">
                        Forgot password?
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan text-white font-semibold rounded-lg hover:from-purple-700 hover:to-cyan focus:ring-4 focus:ring-purple-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <span>{isLogin ? "Sign in" : "Create account"}</span>
                    )}
                  </button>
                </form>

                {/* Toggle Login/Signup */}
                <div className="mt-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                      onClick={toggleMode}
                      className="text-purple-600 hover:text-purple-700 font-semibold transition-colors duration-200"
                    >
                      {isLogin ? "Sign up" : "Sign in"}
                    </button>
                  </p>
                </div>

                {/* Terms */}
                {!isLogin && (
                  <p className="mt-4 text-xs text-center text-gray-500">
                    By signing up, you agree to our{" "}
                    <a href="#" className="text-purple-600 hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" className="text-purple-600 hover:underline">Privacy Policy</a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}