import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Lock, Mail, ShieldCheck, User, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useMaintenanceMode } from '@/hooks/use-maintenance-mode';
import { MaintenancePage } from '@/components/MaintenancePage';

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — AIPATECH Energy" }] }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot" | "verify";

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { isMaintenanceMode, loading: maintenanceLoading, isAdmin, settings } = useMaintenanceMode();

  // Check session and redirect based on role
  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setRedirecting(true);
          
          // Check if user is admin
          const { data: isAdmin } = await supabase.rpc("has_role", { 
            _user_id: session.user.id, 
            _role: "admin" 
          });
          
          if (isAdmin) {
            nav({ to: "/admin/dashboard" });
          } else {
            nav({ to: "/dashboard" });
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setRedirecting(false);
      }
    };
    
    checkSessionAndRedirect();
  }, [nav]);

  const redirectBasedOnRole = async (userId: string) => {
    setRedirecting(true);
    try {
      const { data: isAdmin } = await supabase.rpc("has_role", { 
        _user_id: userId, 
        _role: "admin" 
      });
      
      if (isAdmin) {
        nav({ to: "/admin/dashboard" });
      } else {
        nav({ to: "/dashboard" });
      }
    } catch (error) {
      console.error("Role check error:", error);
      nav({ to: "/dashboard" });
    } finally {
      setRedirecting(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown} seconds`);
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: verificationEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      
      if (error) throw error;
      
      toast.success("Verification email resent! Check your inbox.");
      setResendCooldown(60);
      
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error: any) {
      toast.error(error.message || "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    // Show maintenance page if maintenance mode is on and user is not admin
if (!maintenanceLoading && isMaintenanceMode && !isAdmin) {
  return <MaintenancePage 
    message={settings?.maintenance_message} 
    until={settings?.maintenance_until} 
  />;
}
    try {
      // ========== SIGN IN ==========
      if (mode === "signin") {
        if (!email || !password) {
          throw new Error("Please enter email and password");
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        });
        
        if (error) {
          if (error.message.includes("Email not confirmed")) {
            setVerificationEmail(email);
            setMode("verify");
            throw new Error("Please verify your email first. Check your inbox.");
          }
          if (error.message.includes("Invalid login")) {
            throw new Error("Invalid email or password");
          }
          throw new Error(error.message);
        }
        
        if (data.user) {
          toast.success("Welcome back!");
          await redirectBasedOnRole(data.user.id);
        }
      }
      
      // ========== SIGN UP ==========
      else if (mode === "signup") {
        if (!fullName.trim()) {
          throw new Error("Please enter your full name");
        }
        if (!email || !email.includes("@") || !email.includes(".")) {
          throw new Error("Please enter a valid email address");
        }
        if (!password) {
          throw new Error("Please enter a password");
        }
        if (password !== confirm) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters");
        }
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { 
              full_name: fullName.trim(),
            },
          },
        });
        
        if (error) {
          if (error.message.includes("User already registered")) {
            throw new Error("User already exists. Please sign in instead.");
          }
          if (error.message.includes("password")) {
            throw new Error("Password too weak. Use at least 6 characters.");
          }
          throw new Error(error.message);
        }
        
        if (data.user) {
          setVerificationEmail(email);
          setMode("verify");
          toast.success("Verification email sent! Check your inbox.");
        }
      }
      
      // ========== FORGOT PASSWORD ==========
      else if (mode === "forgot") {
        if (!email || !email.includes("@")) {
          throw new Error("Please enter a valid email address");
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) throw error;
        
        toast.success("Password reset link sent! Check your email.");
        setMode("signin");
      }
      
    } catch (e: any) { 
      console.error("Auth error:", e);
      setErr(e.message ?? "Authentication failed. Please try again."); 
    } finally { 
      setLoading(false); 
    }
  };

  if (redirecting) {
    return (
      <div className="relative grid min-h-screen place-items-center bg-background px-4 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== VERIFY EMAIL SCREEN ==========
  if (mode === "verify") {
    return (
      <div className="relative grid min-h-screen place-items-center bg-background px-4 py-12">
        <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 shadow-card backdrop-blur-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
          <p className="text-muted-foreground mb-4">
            We sent a verification link to <strong>{verificationEmail}</strong>
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 text-left">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Click the link in the email to activate your account. Then you can sign in.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => window.open('https://mail.google.com', '_blank')}
              className="w-full rounded-full bg-gradient-hero px-5 py-3 font-semibold text-primary-foreground shadow-soft hover:scale-[1.01] transition-all"
            >
              Open Gmail
            </button>
            
            <button
              onClick={resendVerificationEmail}
              disabled={loading || resendCooldown > 0}
              className="w-full rounded-full border border-border px-5 py-3 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-50"
            >
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : loading 
                  ? "Sending..." 
                  : "Resend verification email"}
            </button>
            
            <button
              onClick={() => setMode("signin")}
              className="w-full text-sm text-primary hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  const titles: Record<Mode, { h: string; sub: string; cta: string }> = {
    signin: { h: "Sign in to AEL", sub: "Welcome back. Manage bookings, invoices, customers.", cta: "Sign in" },
    signup: { h: "Create your AEL account", sub: "Self-service signup. Admin features unlocked once granted.", cta: "Create account" },
    forgot: { h: "Reset your password", sub: "We'll email you a secure link to set a new password.", cta: "Send reset link" },
    verify: { h: "Verify Email", sub: "", cta: "" },
  };
  const t = titles[mode];

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-96 w-96 rounded-full bg-emerald/30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 shadow-card backdrop-blur-2xl">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
            <Flame className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">AEL Portal</span>
        </Link>

        <div className="mt-5 inline-flex items-center gap-1 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
          <ShieldCheck className="h-3.5 w-3.5" /> Secured by encryption
        </div>
        <h1 className="mt-3 text-2xl font-bold">{t.h}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.sub}</p>

        {/* Tabs - Only show for signin/signup */}
        {mode !== "forgot" && (
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/40 p-1 text-xs font-semibold">
            <button 
              type="button" 
              onClick={() => {
                setMode("signin");
                setErr(null);
              }} 
              className={`rounded-full py-2 transition ${mode === "signin" ? "bg-gradient-hero text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
            >
              Sign in
            </button>
            <button 
              type="button" 
              onClick={() => {
                setMode("signup");
                setErr(null);
              }} 
              className={`rounded-full py-2 transition ${mode === "signup" ? "bg-gradient-hero text-primary-foreground shadow-soft" : "text-muted-foreground"}`}
            >
              Sign up
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Full Name - Only for Signup */}
          {mode === "signup" && (
            <Field icon={User} label="Full name">
              <input 
                required 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="John Doe"
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" 
              />
            </Field>
          )}
          
          {/* Email Field - All modes */}
          <Field icon={Mail} label="Email">
            <input 
              required 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" 
            />
          </Field>
          
          {/* Password Field - Signin and Signup */}
          {mode !== "forgot" && (
            <Field icon={Lock} label="Password">
              <input 
                required 
                type="password" 
                minLength={6} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••"
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" 
              />
            </Field>
          )}
          
          {/* Confirm Password - Only for Signup */}
          {mode === "signup" && (
            <Field icon={Lock} label="Confirm password">
              <input 
                required 
                type="password" 
                minLength={6} 
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)} 
                placeholder="••••••"
                className="w-full bg-transparent px-3 py-2.5 text-sm outline-none" 
              />
            </Field>
          )}

          {/* Error Message */}
          {err && (
            <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {err}
            </div>
          )}

          {/* Submit Button */}
          <button 
            disabled={loading} 
            className="w-full rounded-full bg-gradient-hero px-5 py-3 font-semibold text-primary-foreground shadow-soft transition-all hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {mode === "signin" ? "Signing in..." : mode === "signup" ? "Creating account..." : "Sending..."}
              </span>
            ) : (
              t.cta
            )}
          </button>

          {/* Footer Links */}
          <div className="flex items-center justify-between text-xs">
            {mode === "signin" ? (
              <button 
                type="button" 
                onClick={() => {
                  setMode("forgot");
                  setErr(null);
                }} 
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            ) : mode === "signup" ? (
              <div className="text-muted-foreground text-xs">
                By signing up, you agree to our Terms
              </div>
            ) : mode === "forgot" ? (
              <button 
                type="button" 
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                }} 
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Back to sign in
              </button>
            ) : null}
            
            {mode !== "forgot" && (
              <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Website
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-input bg-background pl-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}