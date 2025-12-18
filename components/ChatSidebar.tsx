"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, SmilePlus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  socket: Socket | null;
  roomId: string;
  isOpen?: boolean;
  onClose?: () => void;
  localUserName?: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isReaction?: boolean;
}

const REACTIONS = ["😂", "🔥", "❤️", "👀", "👏"];

const getUserColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 55%)`;
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ChatSidebar({
  socket,
  roomId,
  isOpen,
  onClose,
  localUserName = "You",
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: {
      sender: string;
      senderName: string;
      message: string;
      timestamp: number;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          text: data.message,
          senderId: data.sender,
          senderName: data.senderName,
          timestamp: data.timestamp,
          isReaction: false,
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    };

    const handleReceiveReaction = (data: {
      sender: string;
      senderName: string;
      reaction: string;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          text: data.reaction,
          senderId: data.sender,
          senderName: data.senderName,
          timestamp: Date.now(),
          isReaction: true,
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("receive-reaction", handleReceiveReaction);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("receive-reaction", handleReceiveReaction);
    };
  }, [socket]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const timestamp = Date.now();
    socket.emit("send-message", { roomId, message: newMessage, timestamp });

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        text: newMessage,
        senderId: socket.id || "me",
        senderName: localUserName,
        timestamp,
        isReaction: false,
      },
    ]);
    setNewMessage("");
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const sendReaction = (reaction: string) => {
    if (!socket) return;
    socket.emit("send-reaction", { roomId, reaction });
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        text: reaction,
        senderId: socket.id || "me",
        senderName: localUserName,
        timestamp: Date.now(),
        isReaction: true,
      },
    ]);
    setShowReactions(false);
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-neutral-900">
      {/* Header - Hidden on mobile (parent handles it) */}
      <div className="hidden sm:flex p-4 border-b border-neutral-800 items-center justify-between bg-neutral-900/80 backdrop-blur-sm shrink-0">
        <h2 className="font-semibold text-base text-white">Chat</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-neutral-800 rounded-lg transition-colors text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500 text-sm">
            <MessageSquareIcon className="w-10 h-10 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        )}
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => {
            const isMe = msg.senderId === socket?.id || msg.senderId === "me";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={cn(
                  "flex flex-col gap-0.5 max-w-[85%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                {!isMe && !msg.isReaction && (
                  <span
                    className="text-[11px] font-semibold px-0.5"
                    style={{ color: getUserColor(msg.senderName) }}
                  >
                    {msg.senderName}
                  </span>
                )}

                {msg.isReaction ? (
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="text-3xl"
                    title={`${msg.senderName} - ${formatTime(msg.timestamp)}`}
                  >
                    {msg.text}
                  </motion.div>
                ) : (
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm wrap-break-word",
                      isMe
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-neutral-800 text-white rounded-bl-sm"
                    )}
                  >
                    {msg.text}
                    <span className="text-[10px] opacity-60 ml-2">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm shrink-0 relative">
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-3 mb-2 bg-neutral-800 p-2 rounded-xl border border-neutral-700 flex gap-1 shadow-xl z-10"
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="text-xl p-1.5 hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReactions(!showReactions)}
            className={cn(
              "p-2 rounded-full transition-colors shrink-0",
              showReactions
                ? "bg-neutral-700 text-white"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            )}
          >
            <SmilePlus className="w-5 h-5" />
          </button>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-neutral-800 border border-neutral-700 rounded-full px-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-full bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-all shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Simple icon for empty state
function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
