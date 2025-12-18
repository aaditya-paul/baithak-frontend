"use client";

import React, { useEffect, useRef } from "react";
import { Mic, MicOff, VideoOff } from "lucide-react";
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
  className?: string;
}

export const VideoTile = ({
  participant,
  isLocal = false,
  isSpeaking = false,
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

  const showAvatar = participant.isVideoOff || !participant.videoTrack;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative w-full h-full min-h-0 bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl overflow-hidden transition-all duration-300",
        isSpeaking
          ? "ring-2 ring-green-500 ring-offset-2 ring-offset-neutral-950 shadow-lg shadow-green-500/20"
          : "ring-1 ring-neutral-700/50",
        className
      )}
    >
      {/* Video Element - absolute fill */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          showAvatar && "opacity-0"
        )}
      />

      {/* Audio Element (for remote participants) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Video Off Placeholder - Avatar */}
      {showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950">
          {/* Subtle animated orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.05, 0.1, 0.05],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl"
            />
          </div>

          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-xl">
            <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="text-sm sm:text-base font-medium text-white mt-3">
            {participant.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-neutral-400">
            <VideoOff className="w-3.5 h-3.5" />
            <span className="text-xs">Camera off</span>
          </div>
        </div>
      )}

      {/* Name Badge - Bottom Left */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10">
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md text-xs font-medium",
            participant.isMuted
              ? "bg-red-500/80 text-white"
              : "bg-black/50 text-white"
          )}
        >
          {participant.isMuted ? (
            <MicOff className="w-3 h-3" />
          ) : (
            <Mic className="w-3 h-3" />
          )}
          <span className="truncate max-w-[100px] sm:max-w-[150px]">
            {participant.name}
            {isLocal && " (You)"}
          </span>
        </div>

        {/* Speaking indicator */}
        {isSpeaking && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex gap-0.5 items-end h-4"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: ["4px", "12px", "4px"],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 bg-green-500 rounded-full"
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
