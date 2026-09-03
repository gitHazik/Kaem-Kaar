import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return undefined;
    }

    let active = true;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (active && !error) {
          setNotifications((data || []).map((item) => item.action_url === location.pathname ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() } : item));
        }
        if (active) setLoading(false);
      });

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.new?.action_url === location.pathname) {
          supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", payload.new.id).eq("user_id", user.id);
          return;
        }
        setNotifications((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)].slice(0, 50));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications((current) => current.map((item) => item.id === payload.new.id ? payload.new : item));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications((current) => current.filter((item) => item.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, location.pathname]);

  useEffect(() => {
    if (!user?.id) return;
    setNotifications((current) => current.map((item) => item.action_url === location.pathname ? { ...item, is_read: true, read_at: item.read_at || new Date().toISOString() } : item));
    supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("action_url", location.pathname)
      .eq("is_read", false)
      .then(({ error }) => {
        if (error) console.error("Unable to sync active notification:", error);
      });
  }, [location.pathname, user?.id]);

  const markAsRead = async (notificationId) => {
    if (!user?.id) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => item.id === notificationId ? { ...item, is_read: true, read_at: readAt } : item));
    const { error } = await supabase.from("notifications").update({ is_read: true, read_at: readAt }).eq("id", notificationId).eq("user_id", user.id);
    if (error) console.error("Unable to mark notification read:", error);
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at || readAt })));
    const { error } = await supabase.from("notifications").update({ is_read: true, read_at: readAt }).eq("user_id", user.id).eq("is_read", false);
    if (error) console.error("Unable to mark notifications read:", error);
  };

  return <NotificationContext.Provider value={{ notifications, loading, unreadCount: notifications.filter((item) => !item.is_read).length, markAsRead, markAllAsRead }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
};