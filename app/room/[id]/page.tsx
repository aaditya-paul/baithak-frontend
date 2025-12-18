"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DeviceSettings } from "@/components/DeviceSettings";
import { SetupScreen } from "@/components/SetupScreen";
import { VideoLayout } from "@/components/VideoLayout";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useMediasoup, DeviceSelections } from "@/hooks/useMediasoup";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Settings,
  Share,
  Users,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://10.80.224.96:5000";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const [hasJoined, setHasJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [initialMuted, setInitialMuted] = useState(false);
  const [initialVideoOff, setInitialVideoOff] = useState(false);
  const [initialDevices, setInitialDevices] = useState<DeviceSelections>({});

  const {
    socket,
    localParticipant,
    participants,
    activeSpeaker,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    viewMode,
    setViewMode,
    toggleMute,
    toggleVideo,
    changeAudioInput,
    changeVideoInput,
    disconnect,
  } = useMediasoup({
    url: SOCKET_URL,
    roomId,
    userName,
    enabled: hasJoined,
    initialMuted,
    initialVideoOff,
    initialDevices,
    onDisconnected: () => {
      router.push("/");
    },
  });

  const handleJoin = (
    stream: MediaStream,
    name: string,
    muted: boolean,
    videoOff: boolean,
    devices: { audioInput: string; videoInput: string; audioOutput: string }
  ) => {
    stream.getTracks().forEach((t) => t.stop());
    setUserName(name);
    setInitialMuted(muted);
    setInitialVideoOff(videoOff);
    setInitialDevices(devices);
    setHasJoined(true);
  };

  const handleLeave = () => {
    disconnect();
  };

  const copyRoomLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    // Could add a toast notification here
  };

  const handleDeviceChange = async (
    kind: keyof DeviceSelections,
    deviceId: string
  ) => {
    if (kind === "audioInput") {
      await changeAudioInput(deviceId);
    } else if (kind === "videoInput") {
      await changeVideoInput(deviceId);
    }
  };

  if (!hasJoined) {
    return <SetupScreen onJoin={handleJoin} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-neutral-950 text-white p-4">
        <div className="text-6xl">😕</div>
        <h2 className="text-xl font-bold text-red-400">Connection Error</h2>
        <p className="text-neutral-400 text-center max-w-md">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-neutral-950 text-white overflow-hidden">
      {/* Main Content */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isChatOpen && "hidden sm:flex"
        )}
      >
        {/* Header */}
        <header className="h-14 sm:h-16 border-b border-neutral-800 flex items-center justify-between px-3 sm:px-6 bg-neutral-900/80 backdrop-blur-md shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h1 className="font-semibold text-sm sm:text-lg truncate max-w-[120px] sm:max-w-none">
              {roomId}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-800 text-xs font-medium text-neutral-400">
              <Users className="w-3 h-3" />
              <span>{participants.length + (localParticipant ? 1 : 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={copyRoomLink}
              className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Copy Link"
            >
              <Share className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                isSettingsOpen
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              )}
              title="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Video Area */}
        <main className="flex-1 min-h-0 p-2 sm:p-4 overflow-hidden">
          {isConnecting || !localParticipant ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-neutral-400 font-medium text-sm">
                Connecting to room...
              </p>
            </div>
          ) : (
            <VideoLayout
              localParticipant={localParticipant}
              remoteParticipants={participants}
              activeSpeaker={activeSpeaker}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </main>

        {/* Footer Controls */}
        <footer className="h-16 sm:h-20 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-md flex items-center justify-center gap-2 sm:gap-4 px-3 shrink-0 z-10">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all",
              isMuted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-neutral-700 hover:bg-neutral-600 text-white"
            )}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Video Button */}
          <button
            onClick={toggleVideo}
            className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all",
              isVideoOff
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-neutral-700 hover:bg-neutral-600 text-white"
            )}
            title={isVideoOff ? "Start Video" : "Stop Video"}
          >
            {isVideoOff ? (
              <VideoOff className="w-5 h-5" />
            ) : (
              <Video className="w-5 h-5" />
            )}
          </button>

          <div className="w-px h-8 bg-neutral-700 mx-1 hidden sm:block" />

          {/* Chat Button */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all relative",
              isChatOpen
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-neutral-700 hover:bg-neutral-600 text-white"
            )}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-neutral-700 mx-1 hidden sm:block" />

          {/* Leave Button */}
          <button
            onClick={handleLeave}
            className="h-11 sm:h-12 px-4 sm:px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </footer>
      </div>

      {/* Chat Sidebar - Mobile: Full screen overlay, Desktop: Side panel */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "bg-neutral-900 border-l border-neutral-800 z-30 flex flex-col",
              // Mobile: full screen
              "fixed inset-0 sm:static",
              // Desktop: fixed width
              "sm:w-80 lg:w-96"
            )}
          >
            {/* Mobile close button */}
            <div className="sm:hidden flex items-center justify-between p-3 border-b border-neutral-800">
              <h2 className="font-semibold text-lg">Chat</h2>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {socket && (
                <ChatSidebar
                  roomId={roomId}
                  socket={socket}
                  isOpen={true}
                  localUserName={userName}
                  onClose={() => setIsChatOpen(false)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DeviceSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentDevices={initialDevices}
        onDeviceChange={handleDeviceChange}
      />
    </div>
  );
}
