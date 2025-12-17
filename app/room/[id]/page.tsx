"use client";

import { use, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  Flame,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SetupScreen } from "@/components/SetupScreen";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PeerVideo } from "@/components/PeerVideo";

const SOCKET_URL = "http://localhost:5000";

interface PeerObj {
  peerId: string;
  peerName: string;
  peer: Peer.Instance;
}

export default function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();

  const [joined, setJoined] = useState(false);
  const [userName, setUserName] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerObj[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const peersRef = useRef<PeerObj[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      setSocket(null);
      stream?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((p) => p.peer.destroy());
    };
  }, [stream]);

  const createPeer = (
    userToSignal: string,
    callerID: string,
    stream: MediaStream
  ): Peer.Instance => {
    const peer = new Peer({
      initiator: true,
      trickle: true, // Faster connections
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peer.on("signal", (signal: Peer.SignalData) => {
      socketRef.current?.emit("signal", { userToSignal, callerID, signal });
    });

    peer.on("error", (err: any) => {
      console.error("Peer error:", err);
    });

    return peer;
  };

  const addPeer = (
    incomingSignal: Peer.SignalData,
    callerID: string,
    stream: MediaStream
  ): Peer.Instance => {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peer.on("signal", (signal: Peer.SignalData) => {
      socketRef.current?.emit("returning-signal", { signal, callerID });
    });

    peer.on("error", (err: any) => {
      console.error("Peer error:", err);
    });

    peer.signal(incomingSignal);
    return peer;
  };

  const joinRoom = (localStream: MediaStream, name: string) => {
    setStream(localStream);
    setUserName(name);
    setJoined(true);

    socketRef.current = io(SOCKET_URL);
    setSocket(socketRef.current);
    socketRef.current.emit("join-room", { roomId, userName: name });

    // Existing users in room
    socketRef.current.on(
      "all-users",
      (users: { id: string; name: string }[]) => {
        const peersArr: PeerObj[] = [];
        users.forEach((user) => {
          const peer = createPeer(
            user.id,
            socketRef.current!.id as string,
            localStream
          );
          const peerObj = { peerId: user.id, peerName: user.name, peer };
          peersRef.current.push(peerObj);
          peersArr.push(peerObj);
        });
        setPeers(peersArr);
      }
    );

    // New user joined
    socketRef.current.on(
      "user-joined",
      (payload: {
        signal: Peer.SignalData;
        callerID: string;
        callerName: string;
      }) => {
        const peer = addPeer(payload.signal, payload.callerID, localStream);
        const peerObj = {
          peerId: payload.callerID,
          peerName: payload.callerName,
          peer,
        };
        peersRef.current.push(peerObj);
        setPeers((prev) => [...prev, peerObj]);
      }
    );

    // Complete handshake
    socketRef.current.on(
      "receiving-returned-signal",
      (payload: { signal: Peer.SignalData; id: string }) => {
        const item = peersRef.current.find((p) => p.peerId === payload.id);
        if (item) {
          item.peer.signal(payload.signal);
        }
      }
    );

    // User left
    socketRef.current.on("user-disconnected", (id: string) => {
      const peerObj = peersRef.current.find((p) => p.peerId === id);
      if (peerObj) {
        peerObj.peer.destroy();
      }
      peersRef.current = peersRef.current.filter((p) => p.peerId !== id);
      setPeers(peersRef.current);
    });
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsVideoOff(!stream.getVideoTracks()[0]?.enabled);
    }
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    setSocket(null);
    stream?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((p) => p.peer.destroy());
    router.push("/");
  };

  if (!joined) {
    return <SetupScreen onJoin={joinRoom} />;
  }

  const totalParticipants = peers.length + 1;
  const gridCols =
    totalParticipants === 1
      ? "grid-cols-1 max-w-2xl mx-auto"
      : totalParticipants <= 4
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      {/* Main Video Area */}
      <div className="flex-1 relative p-4 flex flex-col transition-all duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 z-10">
          <div className="flex items-center gap-2 text-primary">
            <Flame className="w-5 h-5" />
            <span className="font-semibold">Baithak</span>
          </div>
          <span className="text-xs bg-secondary-foreground border-secondary border text-secondary px-2 py-1 rounded-full">
            Room: {roomId}
          </span>
        </div>

        {/* Grid */}
        <div className={cn("grid gap-3 flex-1 content-center", gridCols)}>
          {/* My Video */}
          <div className="relative w-full aspect-video bg-card rounded-xl overflow-hidden border border-border">
            <video
              ref={(ref) => {
                if (ref && stream) ref.srcObject = stream;
              }}
              muted
              autoPlay
              playsInline
              className={cn(
                "w-full h-full object-cover",
                isVideoOff && "hidden"
              )}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <Flame className="w-10 h-10 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Camera off
                </p>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-white text-xs">
              {userName} (You)
            </div>
          </div>

          {peers.map((p) => (
            <PeerVideo key={p.peerId} peer={p.peer} name={p.peerName} />
          ))}
        </div>

        {/* Bottom Controls */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-xl px-3 py-2 rounded-full shadow-lg border border-border z-20"
        >
          <button
            onClick={toggleMute}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isMuted
                ? "bg-destructive text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            {isMuted ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={toggleVideo}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isVideoOff
                ? "bg-destructive text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            {isVideoOff ? (
              <VideoOff className="w-4 h-4" />
            ) : (
              <Video className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={leaveRoom}
            className="p-2.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border" />
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "p-2.5 rounded-full transition-all",
              isChatOpen
                ? "bg-primary text-white"
                : "bg-secondary text-foreground hover:bg-muted"
            )}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Right Sidebar Chat */}
      {isChatOpen && (
        <motion.div
          initial={{ x: 320 }}
          animate={{ x: 0 }}
          exit={{ x: 320 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-80 h-full bg-card border-l border-border z-30 flex flex-col flex-shrink-0"
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-sm">Chat</h2>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <ChatSidebar socket={socket} roomId={roomId} isOpen={isChatOpen} />
        </motion.div>
      )}
    </div>
  );
}
