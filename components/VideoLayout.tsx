"use client";

import React from "react";
import { Participant } from "livekit-client";
import { VideoTile } from "./VideoTile";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/hooks/useLiveKit";
import { Grid3x3, User, LayoutGrid } from "lucide-react";
import { AnimatePresence } from "framer-motion";

interface VideoLayoutProps {
  localParticipant: Participant;
  remoteParticipants: Participant[];
  activeSpeaker: Participant | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  pinnedParticipant?: string;
  onPinParticipant?: (identity: string) => void;
}

export const VideoLayout = ({
  localParticipant,
  remoteParticipants,
  activeSpeaker,
  viewMode,
  onViewModeChange,
  pinnedParticipant,
  onPinParticipant,
}: VideoLayoutProps) => {
  const totalParticipants = remoteParticipants.length + 1;

  const getGridCols = () => {
    if (totalParticipants === 1) return "grid-cols-1";
    if (totalParticipants === 2) return "grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-3";
    return "grid-cols-4";
  };

  const renderGridView = () => {
    const allParticipants = [localParticipant, ...remoteParticipants];
    return (
      <div
        className={cn("grid gap-3 w-full h-full auto-rows-fr", getGridCols())}
      >
        <AnimatePresence mode="popLayout">
          {allParticipants.map((participant) => (
            <VideoTile
              key={participant.identity}
              participant={participant}
              isLocal={participant === localParticipant}
              isSpeaking={activeSpeaker?.identity === participant.identity}
              isPinned={pinnedParticipant === participant.identity}
              onPin={
                onPinParticipant
                  ? () => onPinParticipant(participant.identity)
                  : undefined
              }
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  const renderSpeakerView = () => {
    const speaker = activeSpeaker || localParticipant;
    const otherParticipants = [localParticipant, ...remoteParticipants].filter(
      (p) => p.identity !== speaker.identity
    );

    return (
      <div className="flex gap-3 w-full h-full">
        {/* Main Speaker View */}
        <div className="flex-1 h-full">
          <VideoTile
            participant={speaker}
            isLocal={speaker === localParticipant}
            isSpeaking={true}
            className="h-full"
          />
        </div>

        {/* Sidebar with other participants */}
        {otherParticipants.length > 0 && (
          <div className="w-64 h-full flex flex-col gap-3 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {otherParticipants.map((participant) => (
                <div key={participant.identity} className="aspect-video">
                  <VideoTile
                    participant={participant}
                    isLocal={participant === localParticipant}
                    isSpeaking={false}
                    onPin={
                      onPinParticipant
                        ? () => onPinParticipant(participant.identity)
                        : undefined
                    }
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  const renderSidebarView = () => {
    const featured = pinnedParticipant
      ? [localParticipant, ...remoteParticipants].find(
          (p) => p.identity === pinnedParticipant
        ) || localParticipant
      : localParticipant;

    const otherParticipants = [localParticipant, ...remoteParticipants].filter(
      (p) => p.identity !== featured.identity
    );

    return (
      <div className="flex flex-col gap-3 w-full h-full">
        {/* Featured Participant */}
        <div className="flex-1 min-h-0">
          <VideoTile
            participant={featured}
            isLocal={featured === localParticipant}
            isSpeaking={activeSpeaker?.identity === featured.identity}
            isPinned={true}
            className="h-full"
          />
        </div>

        {/* Bottom Bar with other participants */}
        {otherParticipants.length > 0 && (
          <div className="h-32 flex gap-3 overflow-x-auto pb-2">
            <AnimatePresence mode="popLayout">
              {otherParticipants.map((participant) => (
                <div
                  key={participant.identity}
                  className="aspect-video h-full shrink-0"
                >
                  <VideoTile
                    participant={participant}
                    isLocal={participant === localParticipant}
                    isSpeaking={
                      activeSpeaker?.identity === participant.identity
                    }
                    onPin={
                      onPinParticipant
                        ? () => onPinParticipant(participant.identity)
                        : undefined
                    }
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* View Mode Selector */}
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 bg-card/90 backdrop-blur-xl px-2 py-1.5 rounded-full border border-border">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Grid View"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("speaker")}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === "speaker"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Speaker View"
          >
            <User className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange("sidebar")}
            className={cn(
              "p-2 rounded-full transition-all",
              viewMode === "sidebar"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title="Sidebar View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Video Content */}
      <div className="flex-1 min-h-0">
        {viewMode === "grid" && renderGridView()}
        {viewMode === "speaker" && renderSpeakerView()}
        {viewMode === "sidebar" && renderSidebarView()}
      </div>
    </div>
  );
};
