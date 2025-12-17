"use client";

import { use, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Flame,
  X,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SetupScreen } from "@/components/SetupScreen";
import { ChatSidebar } from "@/components/ChatSidebar";
import { VideoLayout } from "@/components/VideoLayout";
import { useLiveKit } from "@/hooks/useLiveKit";

const SOCKET_URL = "http://localhost:5000";
const LIVEKIT_URL =
  process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();

  const [joined, setJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");
  const [shouldConnect, setShouldConnect] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [pinnedParticipant, setPinnedParticipant] = useState<string>("");

  const {
    room,
    participants,
    localParticipant,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    viewMode,
    activeSpeaker,
    toggleMute,
    toggleVideo,
    disconnect,
    setViewMode,
  } = useLiveKit({
    url: LIVEKIT_URL,
    token,
    enabled: shouldConnect && !!token,
    onDisconnected: () => router.push("/"),
  });

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      setSocket(null);
    };
  }, []);

  const joinRoom = async (localStream: MediaStream, name: string) => {
    setUserName(name);

    try {
      console.log(`Requesting token for room: ${roomId}`);

      // Get LiveKit token from backend
      const response = await fetch(`${SOCKET_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName: roomId,
          participantName: name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Token request failed:", errorText);
        throw new Error("Failed to get token");
      }

      const data = await response.json();
      console.log("✅ Received token from backend");
      console.log(`Token (first 50 chars): ${data.token?.substring(0, 50)}...`);
      console.log(`LiveKit URL: ${LIVEKIT_URL}`);

      // Connect to socket for chat first
      socketRef.current = io(SOCKET_URL);
      setSocket(socketRef.current);
      socketRef.current.emit("join-room", { roomId, userName: name });

      // Then set token and enable LiveKit connection
      setToken(data.token);
      setShouldConnect(true);
      setJoined(true);

      // Stop the preview stream as LiveKit will handle it
      localStream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      console.error("Failed to join room:", err);
      alert("Failed to join room. Please try again.");
    }
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    setSocket(null);
    disconnect();
    router.push("/");
  };

  if (!joined) {
    return <SetupScreen onJoin={joinRoom} />;
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting to room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Connection Error</h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!localParticipant) {
    return null;
  }

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      {/* Main Video Area */}
      <div className="flex-1 relative p-4 flex flex-col transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 z-10">
          <div className="flex items-center gap-2 text-primary">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">Baithak</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {participants.length + 1} participant
              {participants.length !== 0 ? "s" : ""}
            </span>
            <span className="text-xs bg-secondary-foreground border-secondary border text-secondary px-2 py-1 rounded-full">
              Room: {roomId}
            </span>
          </div>
        </div>

        {/* Video Layout */}
        <div className="flex-1 min-h-0">
          <VideoLayout
            localParticipant={localParticipant}
            remoteParticipants={participants}
            activeSpeaker={activeSpeaker}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            pinnedParticipant={pinnedParticipant}
            onPinParticipant={(identity) =>
              setPinnedParticipant(
                identity === pinnedParticipant ? "" : identity
              )
            }
          />
        </div>

        {/* Bottom Controls */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-xl px-3 py-2 rounded-full shadow-lg border border-border z-20"
        >
          <button
            onClick={toggleMute}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isMuted
                ? "bg-destructive text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={toggleVideo}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isVideoOff
                ? "bg-destructive text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            {isVideoOff ? (
              <VideoOff className="w-4 h-4" />
            ) : (
              <Video className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={leaveRoom}
            className="p-2.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isChatOpen
                ? "bg-primary text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Right Sidebar Chat */}
      {isChatOpen && (
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-80 h-full bg-card border-l border-border z-30 flex flex-col flex-shrink-0"
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Chat</h2>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <ChatSidebar socket={socket} roomId={roomId} isOpen={isChatOpen} />
        </motion.div>
      )}
    </div>
  );
}
