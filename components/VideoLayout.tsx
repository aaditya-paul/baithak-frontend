"use client";

import React from "react";
import { VideoTile, VideoParticipant } from "./VideoTile";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/hooks/useMediasoup";
import { Grid3x3, User, LayoutGrid } from "lucide-react";
import { AnimatePresence } from "framer-motion";

interface VideoLayoutProps {
  localParticipant: VideoParticipant | null;
  remoteParticipants: VideoParticipant[];
  activeSpeaker: VideoParticipant | null;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const VideoLayout = ({
  localParticipant,
  remoteParticipants,
  activeSpeaker,
  viewMode,
  onViewModeChange,
}: VideoLayoutProps) => {
  const allParticipants = [
    ...(localParticipant ? [localParticipant] : []),
    ...remoteParticipants,
  ];
  const totalParticipants = allParticipants.length;

  // Responsive grid columns
  const getGridClasses = () => {
    if (totalParticipants === 1) return "grid-cols-1";
    if (totalParticipants === 2) return "grid-cols-1 sm:grid-cols-2";
    if (totalParticipants <= 4) return "grid-cols-2";
    if (totalParticipants <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  const renderGridView = () => (
    <div
      className={cn(
        "grid gap-2 sm:gap-3 w-full h-full p-1",
        getGridClasses(),
        // When single participant, center it
        totalParticipants === 1 && "place-items-center",
        // Auto rows that fill available space
        "auto-rows-fr"
      )}
    >
      <AnimatePresence mode="popLayout">
        {allParticipants.map((participant) => (
          <div
            key={participant.id}
            className={cn(
              "w-full h-full min-h-0",
              // For single participant, limit max size for better appearance
              totalParticipants === 1 && "max-w-3xl max-h-[70vh]"
            )}
          >
            <VideoTile
              participant={participant}
              isLocal={localParticipant?.id === participant.id}
              isSpeaking={activeSpeaker?.id === participant.id}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );

  const renderSpeakerView = () => {
    if (totalParticipants === 0) return null;

    const speaker = activeSpeaker || localParticipant || remoteParticipants[0];
    const others = allParticipants.filter((p) => p.id !== speaker?.id);

    return (
      <div className="flex flex-col md:flex-row gap-2 sm:gap-3 w-full h-full">
        {/* Main Speaker */}
        <div className="flex-1 min-h-0 min-w-0">
          {speaker && (
            <VideoTile
              participant={speaker}
              isLocal={speaker.id === localParticipant?.id}
              isSpeaking={true}
            />
          )}
        </div>

        {/* Sidebar thumbnails */}
        {others.length > 0 && (
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:w-48 lg:w-56 shrink-0 pb-2 md:pb-0">
            <AnimatePresence mode="popLayout">
              {others.map((participant) => (
                <div
                  key={participant.id}
                  className="h-24 md:h-auto aspect-video shrink-0 md:shrink"
                >
                  <VideoTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    isSpeaking={activeSpeaker?.id === participant.id}
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
    if (totalParticipants === 0) return null;

    const featured = localParticipant || remoteParticipants[0];
    const others = allParticipants.filter((p) => p.id !== featured?.id);

    return (
      <div className="flex flex-col gap-2 sm:gap-3 w-full h-full">
        {/* Featured participant */}
        <div className="flex-1 min-h-0">
          {featured && (
            <VideoTile
              participant={featured}
              isLocal={featured.id === localParticipant?.id}
              isSpeaking={activeSpeaker?.id === featured.id}
            />
          )}
        </div>

        {/* Bottom thumbnails */}
        {others.length > 0 && (
          <div className="flex gap-2 overflow-x-auto h-24 sm:h-28 shrink-0 pb-1">
            <AnimatePresence mode="popLayout">
              {others.map((participant) => (
                <div
                  key={participant.id}
                  className="aspect-video h-full shrink-0"
                >
                  <VideoTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    isSpeaking={activeSpeaker?.id === participant.id}
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
    <div className="flex flex-col gap-3 w-full h-full">
      {/* View Mode Selector */}
      <div className="flex items-center justify-center shrink-0">
        <div className="flex items-center gap-1 bg-neutral-800/80 backdrop-blur-xl px-1.5 py-1 rounded-full border border-neutral-700/50">
          {[
            { mode: "grid" as ViewMode, icon: Grid3x3, title: "Grid" },
            { mode: "speaker" as ViewMode, icon: User, title: "Speaker" },
            { mode: "sidebar" as ViewMode, icon: LayoutGrid, title: "Gallery" },
          ].map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "p-2 rounded-full transition-all",
                viewMode === mode
                  ? "bg-blue-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-700"
              )}
              title={title}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Video Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === "grid" && renderGridView()}
        {viewMode === "speaker" && renderSpeakerView()}
        {viewMode === "sidebar" && renderSidebarView()}
      </div>
    </div>
  );
};
