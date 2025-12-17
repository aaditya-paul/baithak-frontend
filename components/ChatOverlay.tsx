"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, Smile } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

interface ChatOverlayProps {
  socket: Socket | null;
  roomId: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

const REACTIONS = ["😂", "🔥", "❤️", "👀", "👏", "😮"];

export function ChatOverlay({ socket, roomId }: ChatOverlayProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showReactions, setShowReactions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: { sender: string; message: string; timestamp: number }) => {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36), text: data.message, sender: "them", timestamp: data.timestamp },
      ]);
      // Auto-scroll
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    };

    const handleReceiveReaction = (data: { sender: string; reaction: string }) => {
      // Create a floating reaction element (simplified as just logging or toast for now, 
      // ideally we'd spawn a floating element)
      // For MVP, letting it appear in chat or just float up.
      // Let's spawn a floating reaction in the DOM handled by a separate component or state.
      // For now, simple console log, or maybe add to messages as a "reaction" type.
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36), text: data.reaction, sender: "them-reaction", timestamp: Date.now() },
      ]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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

    // Optimistic update
    setMessages((prev) => [
      ...prev,
      { id: Math.random().toString(36), text: newMessage, sender: "me", timestamp: Date.now() },
    ]);
    setNewMessage("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendReaction = (reaction: string) => {
    if (!socket) return;
    socket.emit("send-reaction", { roomId, reaction });
    // Show locally
    setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(36), text: reaction, sender: "me-reaction", timestamp: Date.now() },
      ]);
    setShowReactions(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="absolute bottom-24 left-4 md:left-8 z-30 w-80 max-h-[400px] flex flex-col gap-2 pointer-events-none">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 pointer-events-auto mask-gradient-b">
         <AnimatePresence>
            {messages.map((msg) => (
                <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={cn(
                        "max-w-[85%] px-4 py-2 rounded-2xl backdrop-blur-md text-sm font-medium shadow-sm break-words",
                        msg.sender.includes("me") 
                            ? "bg-primary/90 text-primary-foreground self-start rounded-tl-sm ml-0 mr-auto"
                            : "bg-white/90 dark:bg-zinc-800/90 text-foreground self-start rounded-bl-sm",
                        msg.sender.includes("reaction") && "bg-transparent shadow-none text-2xl p-0 animate-bounce"
                    )}
                >
                    {msg.text}
                </motion.div>
            ))}
         </AnimatePresence>
         <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="pointer-events-auto flex items-center gap-2 relative">
          <AnimatePresence>
            {showReactions && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute bottom-full left-0 mb-2 bg-white/10 backdrop-blur-xl p-2 rounded-2xl border border-white/20 flex gap-2 shadow-xl"
                >
                    {REACTIONS.map(emoji => (
                        <button 
                            key={emoji}
                            onClick={() => sendReaction(emoji)}
                            className="hover:scale-125 transition-transform text-xl"
                        >
                            {emoji}
                        </button>
                    ))}
                </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setShowReactions(!showReactions)}
            className="p-3 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>

          <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
            <input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Bas bol raha tha..." 
                className="flex-1 bg-black/20 backdrop-blur-md border border-white/10 rounded-full px-4 py-3 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="p-3 rounded-full bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-lg shadow-primary/20"
            >
                <Send className="w-4 h-4" />
            </button>
          </form>
      </div>
    </div>
  );
}
