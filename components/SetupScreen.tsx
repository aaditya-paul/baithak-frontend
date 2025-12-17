"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ChevronDown,
  Flame,
  User,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DeviceSelections {
  audioInput: string;
  videoInput: string;
  audioOutput: string;
}

interface SetupScreenProps {
  onJoin: (
    stream: MediaStream,
    userName: string,
    isMuted: boolean,
    isVideoOff: boolean,
    devices: DeviceSelections
  ) => void;
}

export function SetupScreen({ onJoin }: SetupScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [userName, setUserName] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");

  // Request permissions first, then enumerate devices
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Request permissions with a temporary stream
        const tempStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        // Now enumerate devices (labels will be available)
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        const audio = deviceList.find((d) => d.kind === "audioinput");
        const video = deviceList.find((d) => d.kind === "videoinput");
        const output = deviceList.find((d) => d.kind === "audiooutput");
        if (audio) setSelectedAudio(audio.deviceId);
        if (video) setSelectedVideo(video.deviceId);
        if (output) setSelectedOutput(output.deviceId);

        // Use the temp stream as our initial stream
        setStream(tempStream);
        if (videoRef.current) {
          videoRef.current.srcObject = tempStream;
        }

        setPermissionGranted(true);
        setError(null);
      } catch (err) {
        console.error("Permission denied:", err);
        setError("Camera/Mic access denied. Please allow access to continue.");
      }
    };

    requestPermissions();

    return () => {
      // Cleanup on unmount
    };
  }, []);

  // Switch devices when selection changes
  useEffect(() => {
    if (!permissionGranted || (!selectedAudio && !selectedVideo)) return;

    const switchStream = async () => {
      try {
        // Stop current stream before getting new one
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true,
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      } catch (err) {
        console.error("Error switching devices:", err);
      }
    };

    switchStream();
  }, [selectedAudio, selectedVideo, permissionGranted]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleJoinClick = () => {
    if (stream && userName.trim()) {
      onJoin(stream, userName.trim(), isMuted, isVideoOff, {
        audioInput: selectedAudio,
        videoInput: selectedVideo,
        audioOutput: selectedOutput,
      });
    }
  };

  const canJoin = stream && userName.trim().length > 0;

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-screen p-6 gap-12 bg-background">
      {/* Left: Video Preview */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-xl aspect-video bg-card rounded-2xl overflow-hidden shadow-xl border border-border"
      >
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted p-6 text-center">
            <Flame className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                isVideoOff && "opacity-0"
              )}
            />
            {isVideoOff && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-muted"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center"
                >
                  <Flame className="w-8 h-8 text-primary" />
                </motion.div>
              </motion.div>
            )}

            {/* Controls Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-card/80 backdrop-blur-md px-4 py-2 rounded-full border border-border"
            >
              <motion.button
                onClick={toggleMute}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  isMuted
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary hover:bg-accent text-foreground"
                )}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </motion.button>
              <motion.button
                onClick={toggleVideo}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  isVideoOff
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-secondary hover:bg-accent text-foreground"
                )}
              >
                {isVideoOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </motion.button>
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Right: Settings & Join */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="w-full max-w-sm space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-1"
        >
          <h1 className="text-2xl font-bold">Get ready</h1>
          <p className="text-muted-foreground text-sm">
            Check your camera and mic before joining.
          </p>
        </motion.div>

        {/* Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="space-y-1.5"
        >
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Your Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              className="w-full p-3 pl-10 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </motion.div>

        {/* Device Selectors */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Microphone
            </label>
            <div className="relative">
              <select
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(e.target.value)}
                className="w-full p-3 pr-10 rounded-lg bg-card border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {devices
                  .filter((d) => d.kind === "audioinput")
                  .map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Camera
            </label>
            <div className="relative">
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full p-3 pr-10 rounded-lg bg-card border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {devices
                  .filter((d) => d.kind === "videoinput")
                  .map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" />
              Speaker
            </label>
            <div className="relative">
              <select
                value={selectedOutput}
                onChange={(e) => setSelectedOutput(e.target.value)}
                className="w-full p-3 pr-10 rounded-lg bg-card border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {devices
                  .filter((d) => d.kind === "audiooutput")
                  .map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </motion.div>
        </div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          whileHover={canJoin ? { scale: 1.02, y: -2 } : {}}
          whileTap={canJoin ? { scale: 0.98 } : {}}
          onClick={handleJoinClick}
          disabled={!canJoin}
          className="w-full py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
        >
          Join Baithak
        </motion.button>
      </motion.div>
    </div>
  );
}
