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
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tighter italic text-primary">
            KAEM KAAR
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Welcome back, chief!
          </p>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            disabled={Boolean(loadingProvider)}
            onClick={() => handleProviderLogin("google")}
            variant="outline"
            className="w-full h-14 rounded-2xl border-2 border-[#dadce0] bg-white !text-[#202124] shadow-sm hover:border-[#9aa0a6] hover:bg-white hover:!text-[#202124]"
          >
            {loadingProvider === "google" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <span className="mr-3 flex h-6 w-6 items-center justify-center rounded-full border border-[#dadce0] bg-white font-sans text-lg font-bold leading-none text-[#4285F4]">
                G
              </span>
            )}
            Continue with Google
          </Button>

          <Button
            type="button"
            disabled={Boolean(loadingProvider)}
            onClick={() => handleProviderLogin("facebook")}
            className="w-full h-14 rounded-2xl font-bold text-base bg-[#1877F2] hover:bg-[#166fe5] text-white"
          >
            {loadingProvider === "facebook" ? <Loader2 className="animate-spin" /> : <Facebook size={19} className="mr-3" fill="currentColor" />}
            Continue with Facebook
          </Button>
        </div>

        <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4 text-left">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Secure sign-in is handled by Google or Facebook. Kaem Kaar never sees or stores your password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
