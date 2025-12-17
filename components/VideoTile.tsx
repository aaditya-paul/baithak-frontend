"use client";

import React, { useEffect, useRef, useState } from "react";
import { Participant, Track, TrackPublication } from "livekit-client";
import { Mic, MicOff, Pin } from "lucide-react";
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

  useEffect(() => {
    const handleTrackSubscribed = (track: Track) => {
      if (track.kind === Track.Kind.Video) {
        setHasVideo(true);
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
    };

    // Attach existing tracks
    participant.trackPublications.forEach((publication: TrackPublication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });

    // Listen for new tracks
    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);
    participant.on("trackPublished", handleTrackPublished);

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);
      participant.off("trackPublished", handleTrackPublished);

      // Detach all tracks
      participant.trackPublications.forEach((publication: TrackPublication) => {
        if (publication.track) {
          publication.track.detach();
        }
      });
    };
  }, [participant, isLocal]);

  const displayName = participant.name || participant.identity;
  const isMuted = !participant.isMicrophoneEnabled;

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
        className={cn("w-full h-full object-cover", !hasVideo && "hidden")}
      />

      {/* Audio Element (for remote participants) */}
      {!isLocal && <audio ref={audioRef} autoPlay />}

      {/* Video Off Placeholder */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-4 backdrop-blur-sm border border-primary/20">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <p className="text-lg font-semibold text-white mb-1">{displayName}</p>
          <p className="text-xs text-muted-foreground">Camera off</p>
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
