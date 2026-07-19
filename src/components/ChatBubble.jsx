import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const ChatBubble = ({ message, isMe, timestamp, onDelete }) => {
  return (
    <div className={cn("flex mb-2", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
          isMe
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        <p>{message}</p>
        
        <div className="flex items-center justify-between gap-4 mt-1">
          {timestamp && (
            <p
              className={cn(
                "text-[10px]",
                isMe ? "text-primary-foreground/60" : "text-muted-foreground",
              )}
            >
              {timestamp}
            </p>
          )}

          {isMe && (
            <button
              onClick={onDelete}
              className="text-primary-foreground/50 hover:text-primary-foreground transition-colors"
              title="Delete message"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;