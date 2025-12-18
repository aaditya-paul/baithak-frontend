"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, SmilePlus } from "lucide-react";
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

// Generate consistent color from string
const getUserColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
};

// Format timestamp to local time
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
    console.log("ChatSidebar mounted. Socket connected:", !!socket);
    if (!socket) return;

    const handleReceiveMessage = (data: {
      sender: string;
      senderName: string;
      message: string;
      timestamp: number;
    }) => {
      console.log("Received message:", data);
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
    const msgData = { roomId, message: newMessage, timestamp };
    socket.emit("send-message", msgData);

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        text: newMessage,
        senderId: socket.id || "me",
        senderName: localUserName, // Use local name here
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
        senderName: localUserName, // Use local name here
        timestamp: Date.now(),
        isReaction: true,
      },
    ]);
    setShowReactions(false);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/50 backdrop-blur-sm">
        <h2 className="font-semibold text-lg text-white">Chat</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white"
            aria-label="Close chat"
          >
            <span className="text-xl">×</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === socket?.id || msg.senderId === "me";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "flex flex-col gap-1 max-w-[85%]",
                  isMe ? "self-end items-end" : "self-start items-start"
                )}
              >
                {!isMe && (
                  <span
                    className="text-xs font-bold px-1"
                    style={{ color: getUserColor(msg.senderName) }}
                  >
                    {msg.senderName}
                  </span>
                )}

                {msg.isReaction ? (
                  <div className="text-4xl" title={formatTime(msg.timestamp)}>
                    {msg.text}
                  </div>
                ) : (
                  <div
                    className={cn(
                      "px-3 py-2 rounded-2xl text-sm break-words relative group",
                      isMe
                        ? "bg-primary text-white rounded-br-none"
                        : "bg-neutral-800 text-white rounded-bl-none border border-neutral-700" // Others' messages have neutral background but unique name color
                    )}
                    style={
                      !isMe
                        ? {
                            borderColor: getUserColor(msg.senderName),
                          }
                        : undefined
                    }
                  >
                    {msg.text}
                    <span className="text-[10px] opacity-70 ml-2 align-bottom">
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
      <div className="p-3 border-t border-border relative">
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-3 mb-2 bg-neutral-800 p-3 rounded-xl border border-neutral-700 flex gap-2 shadow-lg z-20"
            >
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="hover:scale-125 transition-transform text-2xl p-1"
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
            className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <SmilePlus className="w-5 h-5" />
          </button>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 rounded-full bg-primary text-white disabled:opacity-50 hover:brightness-110 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
