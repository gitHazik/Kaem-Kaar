import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ChatBubble from "@/components/ChatBubble";
import NotificationBell from "@/components/NotificationBell";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

const ChatPage = () => {
  const { jobId, workerId } = useParams();
  const isDirectChat = !jobId;
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState("Chat");
  const [receiverId, setReceiverId] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!user?.id) return;

    let query = supabase.from("messages").update({ is_read: true }).eq("receiver_id", user.id).eq("is_read", false);
    query = isDirectChat ? query.is("job_id", null) : query.eq("job_id", jobId);
    query.then(({ error }) => {
      if (error) console.error(error);
    });
  }, [isDirectChat, jobId, user?.id]);

  // Handle message deletion logic
  const handleDeleteMessage = async (messageId) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("sender_id", user.id); // Security: Only allow deleting own messages

    if (error) {
      toast.error("Could not delete message");
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: job } = isDirectChat
        ? { data: null }
        : await supabase.from("jobs").select("title, hirer_id").eq("id", jobId).maybeSingle();

      if (isDirectChat || job) {
        const targetId = isDirectChat ? workerId : user.id === job.hirer_id ? workerId : job.hirer_id;
        if (targetId) {
          setReceiverId(targetId);
        }

        const { data: otherProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", targetId)
          .maybeSingle();

        setChatTitle(otherProfile?.full_name || job?.title || "Chat");

        let messageQuery = supabase.from("messages").select("*");
        messageQuery = isDirectChat ? messageQuery.is("job_id", null) : messageQuery.eq("job_id", jobId);
        const { data } = await messageQuery
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true });

        setMessages(data || []);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`chat-${jobId || "direct"}-${workerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const msg = payload.new;
            const isMe = msg.sender_id === user.id;
            const isToMe = msg.receiver_id === user.id;
            const isRelated = msg.sender_id === workerId || msg.receiver_id === workerId;
            const isSameChat = isDirectChat ? msg.job_id === null : msg.job_id === jobId;
            if ((isMe || isToMe) && isRelated && isSameChat) {
              setMessages((prev) => [...prev, msg]);
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, workerId, user, isDirectChat]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || sending || !receiverId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      job_id: jobId || null,
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
    });
    if (!error) setNewMessage("");
    setSending(false);
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-svh bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="press p-1"><ArrowLeft size={20} /></button>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-foreground truncate text-sm leading-none">{chatTitle}</h2>
          <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-wider">{isDirectChat ? "Direct message" : "Job Discussion"}</p>
        </div>
        <NotificationBell />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full mb-4 ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
            <ChatBubble
              message={msg.content}
              isMe={msg.sender_id === user?.id}
              onDelete={() => handleDeleteMessage(msg.id)} // Pass delete function
              timestamp={new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            />
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 h-12 rounded-xl border border-input bg-muted/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button onClick={handleSend} disabled={!newMessage.trim() || sending} className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center press disabled:opacity-50">
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;