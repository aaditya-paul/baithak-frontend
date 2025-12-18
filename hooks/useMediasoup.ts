import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Device, types as mediasoupTypes } from "mediasoup-client";

export type ViewMode = "grid" | "speaker" | "sidebar";

export interface DeviceSelections {
  audioInput?: string;
  videoInput?: string;
  audioOutput?: string;
}

export interface RemoteParticipant {
  id: string;
  name: string;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

export interface LocalParticipant {
  id: string;
  name: string;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface UseMediasoupProps {
  url: string;
  roomId: string;
  userName: string;
  enabled?: boolean;
  onDisconnected?: () => void;
  initialMuted?: boolean;
  initialVideoOff?: boolean;
  initialDevices?: DeviceSelections;
}

interface ProducerInfo {
  producerId: string;
  peerId: string;
  peerName: string;
  kind: "audio" | "video";
}

export function useMediasoup({
  url,
  roomId,
  userName,
  enabled = true,
  onDisconnected,
  initialMuted = false,
  initialVideoOff = false,
  initialDevices,
}: UseMediasoupProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isVideoOff, setIsVideoOff] = useState(initialVideoOff);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeSpeaker, setActiveSpeaker] = useState<RemoteParticipant | null>(
    null
  );

  // Refs for mediasoup
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const producersRef = useRef<Map<string, mediasoupTypes.Producer>>(new Map());
  const consumersRef = useRef<
    Map<string, { consumer: mediasoupTypes.Consumer; peerId: string }>
  >(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const isConnectedRef = useRef(false);
  const onDisconnectedRef = useRef(onDisconnected);
  const pendingProducersRef = useRef<ProducerInfo[]>([]);

  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  // Socket request helper with promise
  const socketRequest = useCallback(
    <T>(event: string, data: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (!socket) {
          reject(new Error("Socket not connected"));
          return;
        }
        socket.emit(event, data, (response: T & { error?: string }) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
    },
    [socket]
  );

  // Consume a producer (receive media from another peer)
  const consumeProducer = useCallback(
    async (producerInfo: ProducerInfo) => {
      if (!recvTransportRef.current || !deviceRef.current || !socket) return;

      console.log(
        `Consume requested for ${producerInfo.kind} from ${producerInfo.peerName}`
      );
      try {
        const { id, producerId, kind, rtpParameters, producerPeerId } =
          await socketRequest<{
            id: string;
            producerId: string;
            kind: "audio" | "video";
            rtpParameters: mediasoupTypes.RtpParameters;
            producerPeerId: string;
          }>("consume", {
            roomId,
            transportId: recvTransportRef.current.id,
            producerId: producerInfo.producerId,
            rtpCapabilities: deviceRef.current.rtpCapabilities,
          });

        console.log(`Consume response received: ${id}`);

        const consumer = await recvTransportRef.current.consume({
          id,
          producerId,
          kind,
          rtpParameters,
        });

        console.log(
          `Consumer created locally: ${consumer.id}, track enabled: ${consumer.track.enabled}`
        );

        consumersRef.current.set(id, { consumer, peerId: producerInfo.peerId });

        // Resume the consumer
        await socketRequest("resumeConsumer", { roomId, consumerId: id });
        console.log(`Consumer resumed: ${id}`);

        // Update participant with new track
        setParticipants((prev) => {
          const existing = prev.find((p) => p.id === producerInfo.peerId);
          if (existing) {
            console.log(
              `Updating existing participant ${producerInfo.peerName} with ${kind} track`
            );
            return prev.map((p) => {
              if (p.id === producerInfo.peerId) {
                return {
                  ...p,
                  [kind === "video" ? "videoTrack" : "audioTrack"]:
                    consumer.track,
                  [kind === "video" ? "isVideoOff" : "isMuted"]: false,
                };
              }
              return p;
            });
          } else {
            console.log(
              `Adding new participant ${producerInfo.peerName} with ${kind} track`
            );
            return [
              ...prev,
              {
                id: producerInfo.peerId,
                name: producerInfo.peerName,
                videoTrack: kind === "video" ? consumer.track : null,
                audioTrack: kind === "audio" ? consumer.track : null,
                isMuted: kind !== "audio",
                isVideoOff: kind !== "video",
              },
            ];
          }
        });

        console.log(`✅ Consuming ${kind} from ${producerInfo.peerName}`);
      } catch (err) {
        console.error("Error consuming producer:", err);
      }
    },
    [socket, socketRequest, roomId]
  );

  // Effect 1: Connect Socket
  useEffect(() => {
    if (!enabled || !url) return;

    const newSocket = io(url);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [enabled, url]);

  // Effect 2: Mediasoup Logic (runs when socket is connected)
  useEffect(() => {
    if (!socket || !roomId || !userName || isConnectedRef.current) return;

    let mounted = true;

    const connect = async () => {
      setIsConnecting(true);
      setError(null);

      try {
        // Wait for socket connection if not already connected
        if (!socket.connected) {
          await new Promise<void>((resolve, reject) => {
            socket.on("connect", resolve);
            socket.on("connect_error", reject);
          });
        }

        if (!mounted) return;

        // Get router capabilities
        const { rtpCapabilities } = await new Promise<{
          rtpCapabilities: mediasoupTypes.RtpCapabilities;
        }>((resolve, reject) => {
          socket.emit("getRouterRtpCapabilities", { roomId }, (res: any) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
          });
        });

        // Create device
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;

        // Join room
        const { peers, existingProducers } = await new Promise<{
          peers: { id: string; name: string }[];
          existingProducers: ProducerInfo[];
        }>((resolve, reject) => {
          socket.emit("joinRoom", { roomId, userName }, (res: any) => {
            if (res.error) reject(new Error(res.error));
            else resolve(res);
          });
        });

        if (!mounted) return;

        // Initialize participants from existing peers
        setParticipants(
          peers.map((p) => ({
            id: p.id,
            name: p.name,
            videoTrack: null,
            audioTrack: null,
            isMuted: true,
            isVideoOff: true,
          }))
        );

        // Create send transport
        const sendTransportParams = await new Promise<{
          id: string;
          iceParameters: mediasoupTypes.IceParameters;
          iceCandidates: mediasoupTypes.IceCandidate[];
          dtlsParameters: mediasoupTypes.DtlsParameters;
        }>((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { roomId, direction: "send" },
            (res: any) => {
              if (res.error) reject(new Error(res.error));
              else resolve(res);
            }
          );
        });

        const sendTransport = device.createSendTransport(sendTransportParams);
        sendTransportRef.current = sendTransport;

        sendTransport.on("connectionstatechange", (state) => {
          console.log(`Send transport connection state: ${state}`);
        });

        sendTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              await new Promise<void>((resolve, reject) => {
                socket.emit(
                  "connectTransport",
                  {
                    roomId,
                    transportId: sendTransport.id,
                    dtlsParameters,
                  },
                  (res: any) => {
                    if (res.error) reject(new Error(res.error));
                    else resolve();
                  }
                );
              });
              callback();
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        sendTransport.on(
          "produce",
          async (
            {
              kind,
              rtpParameters,
              appData,
            }: {
              kind: mediasoupTypes.MediaKind;
              rtpParameters: mediasoupTypes.RtpParameters;
              appData: any;
            },
            callback: (data: { id: string }) => void,
            errback: (error: any) => void
          ) => {
            try {
              const { id } = await new Promise<{ id: string }>(
                (resolve, reject) => {
                  socket.emit(
                    "produce",
                    {
                      roomId,
                      transportId: sendTransport.id,
                      kind,
                      rtpParameters,
                      appData,
                    },
                    (res: any) => {
                      if (res.error) reject(new Error(res.error));
                      else resolve(res);
                    }
                  );
                }
              );
              callback({ id });
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        // Create receive transport
        const recvTransportParams = await new Promise<{
          id: string;
          iceParameters: mediasoupTypes.IceParameters;
          iceCandidates: mediasoupTypes.IceCandidate[];
          dtlsParameters: mediasoupTypes.DtlsParameters;
        }>((resolve, reject) => {
          socket.emit(
            "createWebRtcTransport",
            { roomId, direction: "recv" },
            (res: any) => {
              if (res.error) reject(new Error(res.error));
              else resolve(res);
            }
          );
        });

        const recvTransport = device.createRecvTransport(recvTransportParams);
        recvTransportRef.current = recvTransport;

        recvTransport.on("connectionstatechange", (state) => {
          console.log(`Recv transport connection state: ${state}`);
        });

        recvTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              await new Promise<void>((resolve, reject) => {
                socket.emit(
                  "connectTransport",
                  {
                    roomId,
                    transportId: recvTransport.id,
                    dtlsParameters,
                  },
                  (res: any) => {
                    if (res.error) reject(new Error(res.error));
                    else resolve();
                  }
                );
              });
              callback();
            } catch (error) {
              errback(error as Error);
            }
          }
        );

        // Get local media
        const constraints: MediaStreamConstraints = {
          audio: initialDevices?.audioInput
            ? { deviceId: initialDevices.audioInput }
            : true,
          video: initialDevices?.videoInput
            ? { deviceId: initialDevices.videoInput }
            : true,
        };

        const localStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        localStreamRef.current = localStream;

        const audioTrack = localStream.getAudioTracks()[0];
        const videoTrack = localStream.getVideoTracks()[0];

        // Produce audio
        if (audioTrack && !initialMuted) {
          const audioProducer = await sendTransport.produce({
            track: audioTrack,
          });
          producersRef.current.set("audio", audioProducer);
        } else if (audioTrack) {
          audioTrack.enabled = false;
        }

        // Produce video
        if (videoTrack && !initialVideoOff) {
          const videoProducer = await sendTransport.produce({
            track: videoTrack,
          });
          producersRef.current.set("video", videoProducer);
        } else if (videoTrack) {
          videoTrack.enabled = false;
        }

        setLocalParticipant({
          id: socket.id!,
          name: userName,
          isMicrophoneEnabled: !initialMuted,
          isCameraEnabled: !initialVideoOff,
          videoTrack,
          audioTrack,
          isMuted: initialMuted,
          isVideoOff: initialVideoOff,
        });

        setIsMuted(initialMuted);
        setIsVideoOff(initialVideoOff);
        isConnectedRef.current = true;
        setIsConnecting(false);

        console.log("✅ Connected to room:", roomId);

        // Consume existing producers
        for (const producer of existingProducers) {
          await consumeProducer(producer);
        }

        // Process any queued producers
        if (pendingProducersRef.current.length > 0) {
          console.log(
            `Processing ${pendingProducersRef.current.length} queued producers`
          );
          for (const producer of pendingProducersRef.current) {
            await consumeProducer(producer);
          }
          pendingProducersRef.current = [];
        }
      } catch (err) {
        console.error("Connection error:", err);
        setError(err as Error);
        setIsConnecting(false);
      }
    };

    connect();

    // Socket event handlers
    socket.on("newPeer", ({ peerId, peerName }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.id === peerId)) return prev;
        return [
          ...prev,
          {
            id: peerId,
            name: peerName,
            videoTrack: null,
            audioTrack: null,
            isMuted: true,
            isVideoOff: true,
          },
        ];
      });
    });

    socket.on("newProducer", async (producerInfo: ProducerInfo) => {
      // If transport isn't ready yet, queue the producer
      if (!recvTransportRef.current || !deviceRef.current) {
        console.log(
          `Queueing producer ${producerInfo.producerId} (transport not ready)`
        );
        pendingProducersRef.current.push(producerInfo);
        return;
      }
      await consumeProducer(producerInfo);
    });

    socket.on("peerLeft", ({ peerId }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== peerId));

      // Close consumers for this peer
      for (const [consumerId, { peerId: cPeerId }] of consumersRef.current) {
        if (cPeerId === peerId) {
          consumersRef.current.delete(consumerId);
        }
      }
    });

    socket.on("consumerClosed", ({ consumerId }) => {
      const entry = consumersRef.current.get(consumerId);
      if (entry) {
        entry.consumer.close();
        consumersRef.current.delete(consumerId);

        // Update participant
        setParticipants((prev) =>
          prev.map((p) => {
            if (p.id === entry.peerId) {
              // Track kind based on what's null
              const kind = entry.consumer.kind;
              return {
                ...p,
                [kind === "video" ? "videoTrack" : "audioTrack"]: null,
                [kind === "video" ? "isVideoOff" : "isMuted"]: true,
              };
            }
            return p;
          })
        );
      }
    });

    socket.on("producerPaused", ({ producerId, peerId }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === peerId) {
            // Check if this producer correlates to video or audio
            // We need to look up the consumer for this producer to know the kind
            // But we don't have direct mapping here easily without iterating consumersRef
            // OR we can guess/search.
            // Better approach: Server sends 'kind' or we search consumers.

            let kind = null;
            for (const {
              consumer,
              peerId: cPeerId,
            } of consumersRef.current.values()) {
              if (cPeerId === peerId && consumer.producerId === producerId) {
                kind = consumer.kind;
                break;
              }
            }

            if (kind) {
              return {
                ...p,
                [kind === "video" ? "isVideoOff" : "isMuted"]: true,
              };
            }
          }
          return p;
        })
      );
    });

    socket.on("producerResumed", ({ producerId, peerId }) => {
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === peerId) {
            let kind = null;
            for (const {
              consumer,
              peerId: cPeerId,
            } of consumersRef.current.values()) {
              if (cPeerId === peerId && consumer.producerId === producerId) {
                kind = consumer.kind;
                break;
              }
            }

            if (kind) {
              return {
                ...p,
                [kind === "video" ? "isVideoOff" : "isMuted"]: false,
              };
            }
          }
          return p;
        })
      );
    });

    socket.on("producerClosed", ({ producerId, peerId }) => {
      // Find and update the participant
      setParticipants((prev) =>
        prev.map((p) => {
          if (p.id === peerId) {
            // We need to determine which track was closed
            // The consumer will emit consumerClosed event
          }
          return p;
        })
      );
    });

    socket.on("disconnect", () => {
      isConnectedRef.current = false;
      if (onDisconnectedRef.current) {
        onDisconnectedRef.current();
      }
    });

    return () => {
      mounted = false;
      isConnectedRef.current = false;

      // Cleanup
      for (const producer of producersRef.current.values()) {
        producer.close();
      }
      producersRef.current.clear();

      for (const { consumer } of consumersRef.current.values()) {
        consumer.close();
      }
      consumersRef.current.clear();

      sendTransportRef.current?.close();
      recvTransportRef.current?.close();

      localStreamRef.current?.getTracks().forEach((t) => t.stop());

      // We don't disconnect socket here, the other effect does it
      socket.off("newPeer");
      socket.off("newProducer");
      socket.off("peerLeft");
      socket.off("consumerClosed");
      socket.off("producerClosed");
      socket.off("disconnect");
    };
  }, [
    socket, // Only run when socket is created
    roomId,
    userName,
    initialMuted,
    initialVideoOff,
    // initialDevices should be stable or wrapped in memo if constructed in component
    // consumeProducer is stable from useCallback
    consumeProducer,
  ]);

  const toggleMute = useCallback(async () => {
    const audioProducer = producersRef.current.get("audio");
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];

    if (isMuted) {
      // Unmute
      if (audioProducer) {
        await audioProducer.resume();
        socket?.emit(
          "resumeProducer",
          { roomId, producerId: audioProducer.id },
          () => {}
        );
      } else if (audioTrack && sendTransportRef.current) {
        audioTrack.enabled = true;
        const producer = await sendTransportRef.current.produce({
          track: audioTrack,
        });
        producersRef.current.set("audio", producer);
      }
      setIsMuted(false);
      setLocalParticipant((prev) =>
        prev ? { ...prev, isMicrophoneEnabled: true, isMuted: false } : null
      );
    } else {
      // Mute
      if (audioProducer) {
        await audioProducer.pause();
        socket?.emit(
          "pauseProducer",
          { roomId, producerId: audioProducer.id },
          () => {}
        );
      }
      setIsMuted(true);
      setLocalParticipant((prev) =>
        prev ? { ...prev, isMicrophoneEnabled: false, isMuted: true } : null
      );
    }
  }, [isMuted, socket, roomId]);

  const toggleVideo = useCallback(async () => {
    const videoProducer = producersRef.current.get("video");
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];

    if (isVideoOff) {
      // Turn on video
      if (videoProducer) {
        await videoProducer.resume();
        socket?.emit(
          "resumeProducer",
          { roomId, producerId: videoProducer.id },
          () => {}
        );
      } else if (videoTrack && sendTransportRef.current) {
        videoTrack.enabled = true;
        const producer = await sendTransportRef.current.produce({
          track: videoTrack,
        });
        producersRef.current.set("video", producer);
      }
      setIsVideoOff(false);
      setLocalParticipant((prev) =>
        prev ? { ...prev, isCameraEnabled: true, isVideoOff: false } : null
      );
    } else {
      // Turn off video
      if (videoProducer) {
        await videoProducer.pause();
        socket?.emit(
          "pauseProducer",
          { roomId, producerId: videoProducer.id },
          () => {}
        );
      }
      setIsVideoOff(true);
      setLocalParticipant((prev) =>
        prev ? { ...prev, isCameraEnabled: false, isVideoOff: true } : null
      );
    }
  }, [isVideoOff, socket, roomId]);

  const disconnect = useCallback(() => {
    socket?.emit("leaveRoom", { roomId });
    socket?.disconnect();
  }, [socket, roomId]);

  const changeAudioInput = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const newTrack = stream.getAudioTracks()[0];
      const audioProducer = producersRef.current.get("audio");

      if (audioProducer) {
        await audioProducer.replaceTrack({ track: newTrack });
      }

      setLocalParticipant((prev) => {
        if (!prev) return null;
        return { ...prev, audioTrack: newTrack };
      });
    } catch (error) {
      console.error("Error switching audio input:", error);
    }
  };

  const changeVideoInput = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const newTrack = stream.getVideoTracks()[0];
      const videoProducer = producersRef.current.get("video");

      if (videoProducer) {
        await videoProducer.replaceTrack({ track: newTrack });
      }

      setLocalParticipant((prev) => {
        if (!prev) return null;
        return { ...prev, videoTrack: newTrack };
      });
    } catch (error) {
      console.error("Error switching video input:", error);
    }
  };

  // Audio output is handled by the browser/OS usually, or setSinkId on elements
  // We'll just expose a state for it if we want to pass it down,
  // but for now we haven't implemented setSinkId in VideoTile yet either effectively
  // effectively. We will skip audioOutput logic for deep integration for now
  // as it requires passing sinkId to every VideoTile.
  // Ideally we'd have a context or store for sinkId.

  return {
    socket,
    participants, // Assuming 'participants' should remain, not 'remoteParticipants' based on original return
    localParticipant,
    isConnecting,
    error,
    isMuted,
    isVideoOff,
    viewMode,
    activeSpeaker,
    toggleMute,
    toggleVideo,
    changeAudioInput,
    changeVideoInput,
    disconnect,
    setViewMode,
  };
}
