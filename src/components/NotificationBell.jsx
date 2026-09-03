import { useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const recent = notifications.slice(0, 5);

  const openNotification = async (notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    setOpen(false);
    if (notification.action_url) navigate(notification.action_url);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen((value) => !value)} aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm press">
        <Bell size={19} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-[10px] font-black text-destructive-foreground flex items-center justify-center">{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[60] w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><p className="font-bold text-sm">Notifications</p><p className="text-[11px] text-muted-foreground">{unreadCount ? `${unreadCount} unread` : "All caught up"}</p></div>
            {unreadCount > 0 && <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs font-bold text-primary"><CheckCheck size={15} /> Read all</button>}
          </div>
          {recent.length ? recent.map((notification) => (
            <button key={notification.id} onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left hover:bg-muted/60 ${notification.is_read ? "" : "bg-primary/5"}`}>
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? "bg-muted" : "bg-primary"}`} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold truncate">{notification.title}</span><span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">{notification.message}</span><span className="mt-1 block text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></span>
              <ChevronRight size={16} className="mt-1 shrink-0 text-muted-foreground" />
            </button>
          )) : <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet</p>}
          <button onClick={() => { setOpen(false); navigate("/notifications"); }} className="w-full px-4 py-3 text-sm font-bold text-primary hover:bg-muted/60">View all notifications</button>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;