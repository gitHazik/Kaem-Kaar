import { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setProfileLoaded(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setProfileLoaded(false);
  };

  const signInWithProvider = async (provider) => {
    const redirectTo = Capacitor.isNativePlatform()
      ? "com.kaemkaar.app://auth/callback"
      : `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: Capacitor.isNativePlatform(),
      },
    });

    if (error) throw error;

    if (Capacitor.isNativePlatform()) {
      if (data?.url) await Browser.open({ url: data.url });
    }
  };

  const setRole = async (role) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, role }, { onConflict: ["id"] });
    if (error) throw error;
    await fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    let appUrlListener;

    if (Capacitor.isNativePlatform()) {
      const handleAuthUrl = async (url) => {
        const callbackUrl = new URL(url);
        const code = callbackUrl.searchParams.get("code");
        if (!code) return;

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error("Error completing OAuth sign-in:", error);
        await Browser.close();
      };

      appUrlListener = App.addListener("appUrlOpen", ({ url }) => handleAuthUrl(url));
      App.getLaunchUrl().then((launch) => {
        if (launch?.url) handleAuthUrl(launch.url);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfileLoaded(true);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      appUrlListener?.then((listener) => listener.remove());
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, profileLoaded, signOut, signInWithProvider, refreshProfile, setRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};