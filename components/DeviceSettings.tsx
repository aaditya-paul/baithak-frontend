"use client";

import React, { useEffect, useState } from "react";
import { Settings, X, Mic, Video as VideoIcon, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DeviceSelections } from "@/hooks/useMediasoup";
import { ChevronDown } from "lucide-react";

interface DeviceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentDevices: DeviceSelections;
  onDeviceChange?: (kind: keyof DeviceSelections, deviceId: string) => void;
}

export const DeviceSettings = ({
  isOpen,
  onClose,
  currentDevices,
  onDeviceChange,
}: DeviceSettingsProps) => {
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"audio" | "video">("audio");

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission primarily to get labels
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioInputs(devices.filter((d) => d.kind === "audioinput"));
        setVideoInputs(devices.filter((d) => d.kind === "videoinput"));
        setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
      } catch (error) {
        console.error("Error getting devices:", error);
      }
    };

    if (isOpen) {
      getDevices();
      navigator.mediaDevices.addEventListener("devicechange", getDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", getDevices);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Device Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex-1 p-3 text-sm font-medium transition-colors relative ${
              activeTab === "audio"
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Mic className="w-4 h-4" />
              Audio
            </div>
            {activeTab === "audio" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex-1 p-3 text-sm font-medium transition-colors relative ${
              activeTab === "video"
                ? "text-primary"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <VideoIcon className="w-4 h-4" />
              Video
            </div>
            {activeTab === "video" && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>
        </div>

        <div className="p-4 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === "audio" ? (
              <motion.div
                key="audio"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Mic className="w-4 h-4" />
                    Microphone
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                      value={currentDevices.audioInput || ""}
                      onChange={(e) =>
                        onDeviceChange?.("audioInput", e.target.value)
                      }
                    >
                      {audioInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label ||
                            `Microphone ${device.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <Volume2 className="w-4 h-4" />
                    Speaker
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                      value={currentDevices.audioOutput || ""}
                      onChange={(e) =>
                        onDeviceChange?.("audioOutput", e.target.value)
                      }
                      disabled={audioOutputs.length === 0}
                    >
                      {audioOutputs.length === 0 ? (
                        <option value="">System Default</option>
                      ) : (
                        audioOutputs.map((device) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label ||
                              `Speaker ${device.deviceId.slice(0, 5)}...`}
                          </option>
                        ))
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {audioOutputs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Audio output selection is only available on supported
                      browsers (e.g. Chrome).
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="video"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                    <VideoIcon className="w-4 h-4" />
                    Camera
                  </label>
                  <div className="relative">
                    <select
                      className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                      value={currentDevices.videoInput || ""}
                      onChange={(e) =>
                        onDeviceChange?.("videoInput", e.target.value)
                      }
                    >
                      {videoInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label ||
                            `Camera ${device.deviceId.slice(0, 5)}...`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 border-t border-border bg-muted/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            Done
          </button>
        </div>
      </motion.div>
    </>
  );
};
