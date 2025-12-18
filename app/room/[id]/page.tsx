"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Define the URL for socket connection
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

  // Initial state from setup screen
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
    // We don't need the stream here as useMediasoup will get its own stream
    // based on devices. But we should stop the setup stream to release devices.
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

  const copyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Room link copied to clipboard");
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
    // audioOutput is handled locally by components listening to the prop change if we stored it
  };

  if (!hasJoined) {
    return <SetupScreen onJoin={handleJoin} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-xl font-bold text-red-500">Connection Error</h2>
        <p className="text-neutral-400">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-950 text-white overflow-hidden relative font-sans">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <header className="h-16 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-semibold text-lg">{roomId}</h1>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 text-xs font-medium text-neutral-400">
              <Users className="w-3 h-3" />
              <span>{participants.length + (localParticipant ? 1 : 0)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomLink}
              className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Copy Link"
            >
              <Share className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={cn(
                "p-2 rounded-md transition-colors",
                isSettingsOpen
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              )}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 relative overflow-hidden flex items-center justify-center">
          {isConnecting || !localParticipant ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-neutral-400 font-medium">
                Connecting to room...
              </p>
            </div>
          ) : (
            <div className="w-full h-full">
              <VideoLayout
                localParticipant={localParticipant}
                remoteParticipants={participants}
                activeSpeaker={activeSpeaker}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          )}
        </main>

        <footer className="h-20 border-t border-neutral-800 bg-neutral-900/50 backdrop-blur-md flex items-center justify-center gap-4 z-10 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                isMuted
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-white"
              )}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleVideo}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                isVideoOff
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-neutral-800 hover:bg-neutral-700 text-white"
              )}
              title={isVideoOff ? "Start Video" : "Stop Video"}
            >
              {isVideoOff ? (
                <VideoOff className="w-5 h-5" />
              ) : (
                <Video className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="w-px h-8 bg-neutral-800 mx-2" />

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all",
              isChatOpen
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-neutral-800 hover:bg-neutral-700 text-white"
            )}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-neutral-800 mx-2" />

          <button
            onClick={handleLeave}
            className="h-12 px-6 rounded-full bg-red-500 hover:bg-red-600 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
            <span>Leave</span>
          </button>
        </footer>
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="h-full border-l border-neutral-800 bg-neutral-900/95 backdrop-blur-sm shadow-xl z-20 overflow-hidden"
          >
            {socket && (
              <ChatSidebar
                roomId={roomId}
                socket={socket}
                isOpen={true}
                localUserName={userName}
                onClose={() => setIsChatOpen(false)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <DeviceSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentDevices={initialDevices} // This passes initial devices, dynamic updates via handleDeviceChange
        onDeviceChange={handleDeviceChange}
      />
    </div>
  );
}
