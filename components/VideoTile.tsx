"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, Pin, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export interface VideoParticipant {
  id: string;
  name: string;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface VideoTileProps {
  participant: VideoParticipant;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  className?: string;
}

export const VideoTile = ({
  participant,
  isLocal = false,
  isSpeaking = false,
  isPinned = false,
  onPin,
  className,
}: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoEl.srcObject = stream;
    } else if (videoEl) {
      videoEl.srcObject = null;
    }
  }, [participant.videoTrack]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (audioEl && participant.audioTrack && !isLocal) {
      const stream = new MediaStream([participant.audioTrack]);
      audioEl.srcObject = stream;
    } else if (audioEl) {
      audioEl.srcObject = null;
    }
  }, [participant.audioTrack, isLocal]);

  // Show avatar when we don't have a video track or video is marked off
  const showAvatar = participant.isVideoOff || !participant.videoTrack;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "relative w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl overflow-hidden border-2 transition-all duration-300",
        isSpeaking
          ? "border-primary shadow-lg shadow-primary/50"
          : "border-border",
        isPinned && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn("w-full h-full object-cover", showAvatar && "hidden")}
      />

      {/* Audio Element (for remote participants) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Video Off Placeholder - Avatar */}
      {showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.15, 0.1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary/20 rounded-full blur-3xl"
            />
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.1, 0.12, 0.1],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary/20 rounded-full blur-3xl"
            />
          </div>

          {/* Avatar circle */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center backdrop-blur-sm border-2 border-primary/30 shadow-xl shadow-primary/20">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary drop-shadow-lg">
                  {participant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            {/* Camera off indicator */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center">
              <VideoOff className="w-4 h-4 text-muted-foreground" />
            </div>
          </motion.div>

          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-lg font-semibold text-white mt-4"
          >
            {participant.name}
          </motion.p>
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-xs text-muted-foreground"
          >
            Camera off
          </motion.p>
        </div>
      )}

      {/* Top Bar with Controls */}
      <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "px-2.5 py-1 rounded-full backdrop-blur-md flex items-center gap-1.5",
              participant.isMuted ? "bg-destructive/80" : "bg-black/40"
            )}
          >
            {participant.isMuted ? (
              <MicOff className="w-3 h-3 text-white" />
            ) : (
              <Mic className="w-3 h-3 text-white" />
            )}
            <span className="text-xs font-medium text-white">
              {participant.name}
              {isLocal && " (You)"}
            </span>
          </div>
          {isSpeaking && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex gap-0.5"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: ["4px", "12px", "4px"],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                  className="w-0.5 bg-primary rounded-full"
                />
              ))}
            </motion.div>
          )}
        </div>

        {onPin && (
          <button
            onClick={onPin}
            className={cn(
              "p-1.5 rounded-lg backdrop-blur-md transition-all hover:scale-110",
              isPinned
                ? "bg-primary/80 text-white"
                : "bg-black/40 text-white/70 hover:text-white"
            )}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Connection Quality Indicator - Mocked for now since we don't have stats yet */}
      <div className="absolute top-3 right-3 flex gap-0.5">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1 rounded-full transition-all",
              i === 0 ? "h-2" : i === 1 ? "h-3" : "h-4",
              "bg-green-500"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
};
