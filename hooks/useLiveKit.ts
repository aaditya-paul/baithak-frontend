import { useEffect, useState, useRef } from "react";
import {
  Room,
  RoomEvent,
  Participant,
  LocalParticipant,
  RemoteParticipant,
} from "livekit-client";

export type ViewMode = "grid" | "speaker" | "sidebar";

export interface DeviceSelections {
  audioInput?: string;
  videoInput?: string;
  audioOutput?: string;
}

interface UseLiveKitProps {
  url: string;
  token: string;
  enabled?: boolean;
  onDisconnected?: () => void;
  initialMuted?: boolean;
  initialVideoOff?: boolean;
  initialDevices?: DeviceSelections;
}

export function useLiveKit({
  url,
  token,
  enabled = true,
  onDisconnected,
  initialMuted = false,
  initialVideoOff = false,
  initialDevices,
}: UseLiveKitProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeSpeaker, setActiveSpeaker] = useState<Participant | null>(null);
  const isConnectingRef = useRef(false);
  const onDisconnectedRef = useRef(onDisconnected);
  const hasConnectedRef = useRef(false);

  // Update ref when callback changes
  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  useEffect(() => {
    // Don't connect if disabled, no credentials, already connecting, or already connected
    if (
      !enabled ||
      !url ||
      !token ||
      isConnectingRef.current ||
      hasConnectedRef.current
    ) {
      return;
    }

    let mounted = true;
    isConnectingRef.current = true;

    const lkRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: {
          width: 1280,
          height: 720,
          frameRate: 30,
        },
      },
    });

    const connectRoom = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        console.log("Connecting to LiveKit room...");
        await lkRoom.connect(url, token);

        if (!mounted) {
          lkRoom.disconnect();
          isConnectingRef.current = false;
          return;
        }

        console.log("Connected successfully!");
        hasConnectedRef.current = true;
        setRoom(lkRoom);
        setLocalParticipant(lkRoom.localParticipant);
        setParticipants(Array.from(lkRoom.remoteParticipants.values()));

        // Enable camera and microphone with selected devices from setup screen
        try {
          // Set microphone with specific device if provided
          if (!initialMuted) {
            await lkRoom.localParticipant.setMicrophoneEnabled(true, {
              deviceId: initialDevices?.audioInput,
            });
            setIsMuted(false);
          } else {
            setIsMuted(true);
          }

          // Set camera with specific device if provided
          if (!initialVideoOff) {
            await lkRoom.localParticipant.setCameraEnabled(true, {
              deviceId: initialDevices?.videoInput,
            });
            setIsVideoOff(false);
          } else {
            setIsVideoOff(true);
          }

          // Set audio output device if provided
          if (initialDevices?.audioOutput) {
            await lkRoom.switchActiveDevice(
              "audiooutput",
              initialDevices.audioOutput
            );
          }

          console.log("Camera and microphone enabled with selected devices");
        } catch (err) {
          console.error("Failed to enable camera/microphone:", err);
        }

        setIsConnecting(false);

        // Event handlers
        lkRoom.on(RoomEvent.ParticipantConnected, (participant) => {
          setParticipants((prev) => [...prev, participant]);
        });

        lkRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setParticipants((prev) =>
            prev.filter((p) => p.identity !== participant.identity)
          );
        });

        lkRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          if (speakers.length > 0) {
            setActiveSpeaker(speakers[0]);
          }
        });

        lkRoom.on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from LiveKit room");
          isConnectingRef.current = false;
          hasConnectedRef.current = false;
          if (onDisconnectedRef.current) {
            onDisconnectedRef.current();
          }
        });

        lkRoom.on(RoomEvent.LocalTrackPublished, () => {
          setLocalParticipant(lkRoom.localParticipant);
        });
      } catch (err) {
        console.error("Failed to connect to LiveKit:", err);
        setError(err as Error);
        setIsConnecting(false);
        isConnectingRef.current = false;
      }
    };

    connectRoom();

    return () => {
      mounted = false;
      isConnectingRef.current = false;
      hasConnectedRef.current = false;
      lkRoom.disconnect();
    };
  }, [url, token, enabled]);

  const toggleMute = async () => {
    if (!localParticipant) return;
    const currentlyEnabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!currentlyEnabled);
    // isMuted is true when microphone is disabled
    setIsMuted(currentlyEnabled);
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;
    const currentlyEnabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!currentlyEnabled);
    // isVideoOff is true when camera is disabled
    setIsVideoOff(currentlyEnabled);
  };

  const disconnect = () => {
    if (room) {
      room.disconnect();
    }
  };

  return {
    room,
    participants,
    localParticipant,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    viewMode,
    activeSpeaker,
    toggleMute,
    toggleVideo,
    disconnect,
    setViewMode,
  };
}
