"use client";

import React from "react";
import { VideoTile, VideoParticipant } from "./VideoTile";
import { cn } from "@/lib/utils";
import { ViewMode } from "@/hooks/useMediasoup";
import { Grid3x3, User, LayoutGrid } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
        "grid gap-3 w-full h-full p-2 auto-rows-fr",
        getGridClasses(),
        totalParticipants === 1 && "place-items-center"
      )}
    >
      <AnimatePresence mode="popLayout">
        {allParticipants.map((participant) => (
          <motion.div
            layout
            key={participant.id}
            className={cn(
              "w-full h-full min-h-0",
              totalParticipants === 1
                ? "max-w-4xl max-h-[80vh] aspect-video"
                : "aspect-video"
            )}
          >
            <VideoTile
              participant={participant}
              isLocal={localParticipant?.id === participant.id}
              isSpeaking={activeSpeaker?.id === participant.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const renderSpeakerView = () => {
    if (totalParticipants === 0) return null;

    const speaker = activeSpeaker || localParticipant || remoteParticipants[0];
    const others = allParticipants.filter((p) => p.id !== speaker?.id);

    return (
      <div className="flex flex-col md:flex-row gap-3 w-full h-full p-2 overflow-hidden">
        {/* Main Speaker */}
        <div className="flex-1 min-h-0 min-w-0">
          <AnimatePresence mode="popLayout">
            {speaker && (
              <motion.div
                layout
                key={speaker.id}
                className="w-full h-full aspect-video md:aspect-auto"
              >
                <VideoTile
                  participant={speaker}
                  isLocal={speaker.id === localParticipant?.id}
                  isSpeaking={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar thumbnails */}
        {others.length > 0 && (
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto md:w-56 lg:w-64 shrink-0 pb-2 md:pb-0 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {others.map((participant) => (
                <motion.div
                  layout
                  key={participant.id}
                  className="h-28 md:h-auto aspect-video shrink-0 md:shrink"
                >
                  <VideoTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    isSpeaking={activeSpeaker?.id === participant.id}
                  />
                </motion.div>
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
      <div className="flex flex-col gap-3 w-full h-full p-2 overflow-hidden">
        {/* Featured participant */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="popLayout">
            {featured && (
              <motion.div
                layout
                key={featured.id}
                className="w-full h-full aspect-video"
              >
                <VideoTile
                  participant={featured}
                  isLocal={featured.id === localParticipant?.id}
                  isSpeaking={activeSpeaker?.id === featured.id}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom thumbnails */}
        {others.length > 0 && (
          <div className="flex gap-3 overflow-x-auto h-28 sm:h-32 shrink-0 pb-2 scrollbar-hide">
            <AnimatePresence mode="popLayout">
              {others.map((participant) => (
                <motion.div
                  layout
                  key={participant.id}
                  className="aspect-video h-full shrink-0"
                >
                  <VideoTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    isSpeaking={activeSpeaker?.id === participant.id}
                  />
                </motion.div>
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
      <div className="flex items-center justify-center shrink-0 pt-2">
        <div className="flex items-center gap-1 bg-neutral-900/40 backdrop-blur-xl px-1.5 py-1.5 rounded-2xl border border-white/5 shadow-2xl">
          {[
            { mode: "grid" as ViewMode, icon: Grid3x3, title: "Grid View" },
            { mode: "speaker" as ViewMode, icon: User, title: "Speaker View" },
            {
              mode: "sidebar" as ViewMode,
              icon: LayoutGrid,
              title: "Gallery View",
            },
          ].map(({ mode, icon: Icon, title }) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "group relative p-2.5 rounded-xl transition-all duration-300",
                viewMode === mode
                  ? "bg-blue-600/20 text-blue-400 shadow-inner"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              )}
              title={title}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform duration-300",
                  viewMode === mode ? "scale-110" : "group-hover:scale-110"
                )}
              />
              {viewMode === mode && (
                <motion.div
                  layoutId="active-mode-bg"
                  className="absolute inset-0 bg-blue-600/10 rounded-xl -z-10 border border-blue-500/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
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
