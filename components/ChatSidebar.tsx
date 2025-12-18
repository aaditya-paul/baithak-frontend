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
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

const REACTIONS = ["😂", "🔥", "❤️", "👀", "👏"];

export function ChatSidebar({
  socket,
  roomId,
  isOpen,
  onClose,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: {
      sender: string;
      message: string;
      timestamp: number;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          text: data.message,
          sender: "them",
          timestamp: data.timestamp,
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    };

    const handleReceiveReaction = (data: {
      sender: string;
      reaction: string;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36),
          text: data.reaction,
          sender: "them-reaction",
          timestamp: Date.now(),
        },
      ]);
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

    const msgData = { roomId, message: newMessage, timestamp: Date.now() };
    socket.emit("send-message", msgData);

    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36),
        text: newMessage,
        sender: "me",
        timestamp: Date.now(),
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
        sender: "me-reaction",
        timestamp: Date.now(),
      },
    ]);
    setShowReactions(false);
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
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                delay: index * 0.02,
              }}
              className={cn(
                "flex",
                msg.sender.includes("me") ? "justify-end" : "justify-start"
              )}
            >
              {msg.sender.includes("reaction") ? (
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-3xl"
                >
                  {msg.text}
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-xl text-sm",
                    msg.sender.includes("me")
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-foreground rounded-bl-sm border border-border"
                  )}
                >
                  {msg.text}
                </motion.div>
              )}
            </motion.div>
          ))}
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
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-full left-3 mb-2 bg-card p-3 rounded-xl border border-border flex gap-2 shadow-lg"
            >
              {REACTIONS.map((emoji, i) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{
                    delay: i * 0.05,
                    type: "spring",
                    stiffness: 300,
                  }}
                  whileHover={{ scale: 1.3, rotate: 10 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => sendReaction(emoji)}
                  className="hover:bg-secondary rounded-lg p-2 transition-colors text-xl"
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <motion.button
            type="button"
            onClick={() => setShowReactions(!showReactions)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <SmilePlus className="w-5 h-5" />
          </motion.button>
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <motion.button
            type="submit"
            disabled={!newMessage.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
