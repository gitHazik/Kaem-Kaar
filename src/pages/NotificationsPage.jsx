import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useNotifications } from "@/contexts/NotificationContext";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications();

  const openNotification = async (notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.action_url) navigate(notification.action_url);
  };

  return <AppShell header={<div className="flex w-full items-center justify-between"><h2 className="font-bold">Notifications</h2>{unreadCount > 0 && <button onClick={markAllAsRead} className="flex items-center gap-1 text-xs font-bold text-primary"><CheckCheck size={15} /> Read all</button>}</div>}>
    <div className="px-4 py-4 space-y-2">
      {loading ? <div className="h-20 animate-pulse rounded-2xl bg-muted" /> : notifications.length ? notifications.map((notification) => (
        <button key={notification.id} onClick={() => openNotification(notification)} className={`flex w-full items-start gap-3 rounded-2xl border border-border p-4 text-left ${notification.is_read ? "bg-card" : "bg-primary/5 border-primary/20"}`}>
          <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.is_read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}><Bell size={17} /></span>
          <span className="min-w-0 flex-1"><span className="block font-bold text-sm">{notification.title}</span><span className="mt-1 block text-sm text-muted-foreground">{notification.message}</span><span className="mt-2 block text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{!notification.is_read && <span className="ml-2 font-bold text-primary">Unread</span>}</span></span>
          <ChevronRight size={17} className="mt-2 shrink-0 text-muted-foreground" />
        </button>
      )) : <div className="py-24 text-center text-muted-foreground"><Bell size={42} className="mx-auto mb-3 opacity-40" /><p className="font-bold">No notifications yet</p></div>}
    </div>
  </AppShell>;
};

export default NotificationsPage;