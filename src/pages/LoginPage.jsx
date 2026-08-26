import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Facebook, Loader2, ShieldCheck } from "lucide-react";

const LoginPage = () => {
  const [loadingProvider, setLoadingProvider] = useState(null);
  const { signInWithProvider } = useAuth();

  const handleProviderLogin = async (provider) => {
    setLoadingProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      toast.error(error?.message || "Unable to start secure sign-in");
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Kaem Kaar
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in to continue
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            disabled={Boolean(loadingProvider)}
            onClick={() => handleProviderLogin("google")}
            variant="outline"
            className="w-full h-12 rounded-xl border border-border bg-card text-foreground font-medium shadow-none hover:bg-muted/50"
          >
            {loadingProvider === "google" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" className="mr-2.5">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.55-5.17 3.55-8.66z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.08.72-2.45 1.14-4.06 1.14-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24z"/>
                <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.28a12 12 0 0 0 0 10.73z"/>
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.63l3.99 3.1C6.22 6.87 8.87 4.75 12 4.75z"/>
              </svg>
            )}
            Continue with Google
          </Button>

          <Button
            type="button"
            disabled={Boolean(loadingProvider)}
            onClick={() => handleProviderLogin("facebook")}
            variant="outline"
            className="w-full h-12 rounded-xl border border-border bg-card text-foreground font-medium shadow-none hover:bg-muted/50"
          >
            {loadingProvider === "facebook" ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Facebook size={16} className="mr-2.5 text-[#1877F2]" fill="#1877F2" />
            )}
            Continue with Facebook
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={13} />
          <span>We never see or store your password</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
