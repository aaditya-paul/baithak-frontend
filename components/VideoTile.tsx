"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Participant,
  Track,
  TrackPublication,
  ParticipantEvent,
} from "livekit-client";
import { Mic, MicOff, Pin, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface VideoTileProps {
  participant: Participant;
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
  const [hasVideo, setHasVideo] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(
    participant.isCameraEnabled
  );

  // Update camera enabled state when it changes
  const updateCameraState = useCallback(() => {
    setIsCameraEnabled(participant.isCameraEnabled);
  }, [participant]);

  useEffect(() => {
    const handleTrackSubscribed = (track: Track) => {
      if (track.kind === Track.Kind.Video) {
        setHasVideo(true);
        updateCameraState();
        if (videoRef.current) {
          track.attach(videoRef.current);
        }
      } else if (track.kind === Track.Kind.Audio && !isLocal) {
        if (audioRef.current) {
          track.attach(audioRef.current);
        }
      }
    };

    const handleTrackUnsubscribed = (track: Track) => {
      if (track.kind === Track.Kind.Video) {
        setHasVideo(false);
        track.detach();
      } else if (track.kind === Track.Kind.Audio) {
        track.detach();
      }
    };

    const handleTrackPublished = (publication: TrackPublication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track);
      }
      updateCameraState();
    };

    const handleTrackUnpublished = () => {
      updateCameraState();
    };

    const handleTrackMuted = (publication: TrackPublication) => {
      if (publication.source === Track.Source.Camera) {
        updateCameraState();
      }
    };

    const handleTrackUnmuted = (publication: TrackPublication) => {
      if (publication.source === Track.Source.Camera) {
        updateCameraState();
      }
    };

    // Check initial camera state
    updateCameraState();

    // Attach existing tracks
    participant.trackPublications.forEach((publication: TrackPublication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });

    // Listen for track events
    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);
    participant.on("trackPublished", handleTrackPublished);
    participant.on("trackUnpublished", handleTrackUnpublished);
    participant.on("trackMuted", handleTrackMuted);
    participant.on("trackUnmuted", handleTrackUnmuted);

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);
      participant.off("trackPublished", handleTrackPublished);
      participant.off("trackUnpublished", handleTrackUnpublished);
      participant.off("trackMuted", handleTrackMuted);
      participant.off("trackUnmuted", handleTrackUnmuted);

      // Detach all tracks
      participant.trackPublications.forEach((publication: TrackPublication) => {
        if (publication.track) {
          publication.track.detach();
        }
      });
    };
  }, [participant, isLocal, updateCameraState]);

  const displayName = participant.name || participant.identity;
  const isMuted = !participant.isMicrophoneEnabled;

  // Show avatar when camera is disabled OR when there's no video track
  const showAvatar = !isCameraEnabled || !hasVideo;

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
                  {displayName.charAt(0).toUpperCase()}
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
            {displayName}
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
              isMuted ? "bg-destructive/80" : "bg-black/40"
            )}
          >
            {isMuted ? (
              <MicOff className="w-3 h-3 text-white" />
            ) : (
              <Mic className="w-3 h-3 text-white" />
            )}
            <span className="text-xs font-medium text-white">
              {displayName}
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

      {/* Connection Quality Indicator */}
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
