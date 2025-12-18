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
      layoutId={participant.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        opacity: { duration: 0.2 },
      }}
      className={cn(
        "relative w-full h-full min-h-0 bg-neutral-900 rounded-2xl overflow-hidden transition-all duration-300",
        isSpeaking
          ? "ring-[3px] ring-green-500 ring-offset-2 ring-offset-neutral-950 shadow-lg shadow-green-500/20"
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
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          showAvatar ? "opacity-0" : "opacity-100"
        )}
      />

      {/* Audio Element (for remote participants) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Video Off Placeholder - Avatar */}
      {showAvatar && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900">
          <motion.div layout className="relative">
            {/* Avatar background glow */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.1, 0.2, 0.1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-0 bg-blue-500 rounded-full blur-2xl"
            />

            {/* Avatar Circle */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center shadow-2xl border border-neutral-700/50">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-neutral-500">
                {participant.name.charAt(0).toUpperCase()}
              </span>
            </div>
          </motion.div>

          <motion.div layout className="mt-4 flex flex-col items-center gap-1">
            <p className="text-sm sm:text-base font-semibold text-neutral-200">
              {participant.name}
            </p>
            <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-neutral-800/50 border border-neutral-700/30 text-neutral-400">
              <VideoOff className="w-3 h-3" />
              <span className="text-[10px] uppercase tracking-wider font-bold">
                Camera off
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between z-10">
        <div className="flex justify-end">
          {/* Status Indicators Top Right */}
          {isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/90 text-white p-1 rounded-md shadow-lg"
            >
              <div className="flex gap-0.5 items-center justify-center h-2.5 w-4">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ["4px", "100%", "4px"] }}
                    transition={{
                      duration: 0.4,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-0.5 bg-white rounded-full h-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between pointer-events-auto">
          {/* Name Badge - Bottom Left */}
          <motion.div
            layout
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-xl border transition-all duration-300",
              participant.isMuted
                ? "bg-red-500/10 border-red-500/20 text-red-100"
                : "bg-black/40 border-white/10 text-white"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg",
                participant.isMuted ? "bg-red-500/20" : "bg-white/10"
              )}
            >
              {participant.isMuted ? (
                <MicOff className="w-3 h-3" />
              ) : (
                <Mic className="w-3 h-3" />
              )}
            </div>
            <span className="text-xs font-bold tracking-tight truncate max-w-[80px] sm:max-w-[120px]">
              {participant.name}
              {isLocal && (
                <span className="ml-1 opacity-60 font-normal">(You)</span>
              )}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
