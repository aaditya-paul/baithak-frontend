"use client";

import React, { useEffect, useState } from "react";
import { Mic, Video, Volume2, ChevronDown, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Room } from "livekit-client";
import { DeviceSelections } from "@/hooks/useLiveKit";

interface DeviceSettingsProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  currentDevices?: DeviceSelections;
}

export function DeviceSettings({
  room,
  isOpen,
  onClose,
  currentDevices,
}: DeviceSettingsProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState("");
  const [selectedVideoInput, setSelectedVideoInput] = useState("");
  const [selectedAudioOutput, setSelectedAudioOutput] = useState("");

  // Enumerate devices and set selections based on current devices or LiveKit active devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices(deviceList);

        // Try to get active devices from LiveKit room first
        let activeAudioInput = "";
        let activeVideoInput = "";
        let activeAudioOutput = "";

        if (room) {
          try {
            activeAudioInput = (await room.getActiveDevice("audioinput")) || "";
            activeVideoInput = (await room.getActiveDevice("videoinput")) || "";
            activeAudioOutput =
              (await room.getActiveDevice("audiooutput")) || "";
          } catch (e) {
            console.log("Could not get active devices from room");
          }
        }

        // Use active devices from room, or fall back to currentDevices prop, or use first available
        const audioInputToUse =
          activeAudioInput ||
          currentDevices?.audioInput ||
          deviceList.find((d) => d.kind === "audioinput")?.deviceId ||
          "";
        const videoInputToUse =
          activeVideoInput ||
          currentDevices?.videoInput ||
          deviceList.find((d) => d.kind === "videoinput")?.deviceId ||
          "";
        const audioOutputToUse =
          activeAudioOutput ||
          currentDevices?.audioOutput ||
          deviceList.find((d) => d.kind === "audiooutput")?.deviceId ||
          "";

        setSelectedAudioInput(audioInputToUse);
        setSelectedVideoInput(videoInputToUse);
        setSelectedAudioOutput(audioOutputToUse);
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };

    if (isOpen) {
      loadDevices();
    }
  }, [isOpen, room, currentDevices]);

  // Handle microphone change
  const handleAudioInputChange = async (deviceId: string) => {
    setSelectedAudioInput(deviceId);
    if (room?.localParticipant) {
      try {
        await room.switchActiveDevice("audioinput", deviceId);
        console.log("Switched audio input to:", deviceId);
      } catch (err) {
        console.error("Error switching audio input:", err);
      }
    }
  };

  // Handle camera change
  const handleVideoInputChange = async (deviceId: string) => {
    setSelectedVideoInput(deviceId);
    if (room?.localParticipant) {
      try {
        await room.switchActiveDevice("videoinput", deviceId);
        console.log("Switched video input to:", deviceId);
      } catch (err) {
        console.error("Error switching video input:", err);
      }
    }
  };

  // Handle speaker change
  const handleAudioOutputChange = async (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    if (room) {
      try {
        await room.switchActiveDevice("audiooutput", deviceId);
        console.log("Switched audio output to:", deviceId);
      } catch (err) {
        console.error("Error switching audio output:", err);
      }
    }
  };

  const audioInputDevices = devices.filter((d) => d.kind === "audioinput");
  const videoInputDevices = devices.filter((d) => d.kind === "videoinput");
  const audioOutputDevices = devices.filter((d) => d.kind === "audiooutput");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Device Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Device Selectors */}
            <div className="p-4 space-y-5">
              {/* Microphone */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  Microphone
                </label>
                <div className="relative">
                  <select
                    value={selectedAudioInput}
                    onChange={(e) => handleAudioInputChange(e.target.value)}
                    className="w-full p-3 pr-10 rounded-lg bg-background border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {audioInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Camera */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Camera
                </label>
                <div className="relative">
                  <select
                    value={selectedVideoInput}
                    onChange={(e) => handleVideoInputChange(e.target.value)}
                    className="w-full p-3 pr-10 rounded-lg bg-background border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {videoInputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Speaker */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  Speaker
                </label>
                <div className="relative">
                  <select
                    value={selectedAudioOutput}
                    onChange={(e) => handleAudioOutputChange(e.target.value)}
                    className="w-full p-3 pr-10 rounded-lg bg-background border border-border text-foreground text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                  >
                    {audioOutputDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Speaker ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Changes are applied immediately
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
