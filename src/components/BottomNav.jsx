import { forwardRef, useEffect, useState } from "react";
import { Home, Briefcase, MessageCircle, User, Sparkles, Users } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Briefcase, label: "Jobs", path: "/jobs" },
  { icon: MessageCircle, label: "Messages", path: "/messages" },
  { icon: Sparkles, label: "Rozgar Bab", path: "/assistant" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = forwardRef((_, ref) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const visibleNavItems = profile?.role === "hirer"
    ? [navItems[0], { icon: Users, label: "Workers", path: "/workers" }, ...navItems.slice(1)]
    : navItems;

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("id")
        .eq("receiver_id", user.id)
        .eq("is_read", false);

      if (!error) setUnreadCount(data?.length || 0);
    };

    fetchUnreadCount();

    if (!user?.id) return;

    const channel = supabase
      .channel("bottom-nav-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new?.receiver_id === user.id && payload.new?.is_read !== true) {
          setUnreadCount((prev) => prev + 1);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        if (payload.new?.receiver_id === user.id && payload.old?.is_read === false && payload.new?.is_read === true) {
          setUnreadCount((prev) => Math.max(prev - 1, 0));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (location.pathname === "/messages" || location.pathname.startsWith("/chat/")) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false)
        .then(({ error }) => {
          if (!error) setUnreadCount(0);
        });
    }
  }, [location.pathname, user?.id]);

  return (
    <nav
      ref={ref}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-[480px] mx-auto flex h-16">
        {visibleNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 press relative",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {item.path === "/messages" && unreadCount > 0 && (
                <span className="absolute right-3 top-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-[9px] font-black text-destructive-foreground flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
