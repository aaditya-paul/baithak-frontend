"use client";

import React, { use, useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import Peer from "simple-peer";
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SetupScreen } from "@/components/SetupScreen";
import { ChatSidebar } from "@/components/ChatSidebar";
import { PeerVideo } from "@/components/PeerVideo";

const SOCKET_URL = "http://localhost:5000";

interface PeerObj {
  peerId: string;
  peer: Peer.Instance;
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();
  
  const [joined, setJoined] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerObj[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<{peerId: string, peer: Peer.Instance}[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const createPeer = (userToSignal: string, callerID: string, stream: MediaStream) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal: Peer.SignalData) => {
      socketRef.current?.emit("signal", { userToSignal, callerID, signal });
    });
    return peer;
  };

  const addPeer = (incomingSignal: Peer.SignalData, callerID: string, stream: MediaStream) => {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal: Peer.SignalData) => {
      socketRef.current?.emit("returning-signal", { signal, callerID });
    });
    peer.signal(incomingSignal);
    return peer;
  };

  const joinRoom = (localStream: MediaStream) => {
    setStream(localStream);
    setJoined(true);
    socketRef.current = io(SOCKET_URL);
    socketRef.current.emit("join-room", roomId);

    socketRef.current.on("all-users", (users: string[]) => {
      const peersArr: PeerObj[] = [];
      users.forEach((userID) => {
        const peer = createPeer(userID, socketRef.current!.id as string, localStream);
        peersRef.current.push({ peerId: userID, peer });
        peersArr.push({ peerId: userID, peer });
      });
      setPeers(peersArr);
    });

    socketRef.current.on("user-joined", (payload: { signal: Peer.SignalData; callerID: string }) => {
      const peer = addPeer(payload.signal, payload.callerID, localStream);
      peersRef.current.push({ peerId: payload.callerID, peer });
      setPeers((users) => [...users, { peerId: payload.callerID, peer }]);
    });

    socketRef.current.on("receiving-returned-signal", (payload: { signal: Peer.SignalData; id: string }) => {
      const item = peersRef.current.find((p) => p.peerId === payload.id);
      item?.peer.signal(payload.signal);
    });

    socketRef.current.on("user-disconnected", (id: string) => {
      const peerObj = peersRef.current.find(p => p.peerId === id);
      peerObj?.peer.destroy();
      peersRef.current = peersRef.current.filter(p => p.peerId !== id);
      setPeers(peersRef.current);
    });
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!stream.getAudioTracks()[0]?.enabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!stream.getVideoTracks()[0]?.enabled);
    }
  };

  if (!joined) {
    return <SetupScreen onJoin={joinRoom} />;
  }

  const totalParticipants = peers.length + 1;
  const gridCols = totalParticipants === 1 ? "grid-cols-1 max-w-2xl mx-auto" : totalParticipants <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="flex bg-background h-screen overflow-hidden">
      
      {/* Main Video Area */}
      <div className={cn("flex-1 relative p-4 flex flex-col transition-all duration-300", isChatOpen && "md:mr-80")}>
         
         {/* Header */}
         <div className="flex items-center justify-between mb-4 z-10">
            <div className="flex items-center gap-2 text-primary">
                <Flame className="w-5 h-5" />
                <span className="font-semibold">Baithak</span>
            </div>
            <span className="text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground">Room: {roomId}</span>
         </div>

         {/* Grid */}
         <div className={cn("grid gap-3 flex-1 content-center", gridCols)}>
            {/* My Video */}
            <div className="relative w-full aspect-video bg-card rounded-xl overflow-hidden border border-border">
                <video
                    ref={(ref) => { if (ref && stream) ref.srcObject = stream; }}
                    muted autoPlay playsInline
                    className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
                />
                {isVideoOff && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                        <Flame className="w-10 h-10 text-primary opacity-50" />
                    </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-white text-xs">You</div>
            </div>

            {peers.map((p) => <PeerVideo key={p.peerId} peer={p.peer} name={`User`} />)}
         </div>
         
         {/* Bottom Controls */}
         <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/90 backdrop-blur-xl px-3 py-2 rounded-full shadow-lg border border-border z-20"
         >
            <button onClick={toggleMute} className={cn("p-2.5 rounded-full transition-all", isMuted ? "bg-destructive text-white" : "bg-secondary text-foreground hover:bg-muted")}>
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={toggleVideo} className={cn("p-2.5 rounded-full transition-all", isVideoOff ? "bg-destructive text-white" : "bg-secondary text-foreground hover:bg-muted")}>
                {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
            <button onClick={() => router.push('/')} className="p-2.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all">
                <PhoneOff className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-border" />
            <button onClick={() => setIsChatOpen(!isChatOpen)} className={cn("p-2.5 rounded-full transition-all", isChatOpen ? "bg-primary text-white" : "bg-secondary text-foreground hover:bg-muted")}>
                <MessageSquare className="w-4 h-4" />
            </button>
         </motion.div>
      </div>

      {/* Right Sidebar Chat */}
      <motion.div 
         initial={{ x: "100%" }}
         animate={{ x: isChatOpen ? 0 : "100%" }}
         transition={{ type: "spring", damping: 25, stiffness: 300 }}
         className="fixed md:absolute top-0 right-0 h-full w-80 bg-card border-l border-border z-30 flex flex-col"
      >
         <div className="p-3 border-b border-border flex items-center justify-between">
             <h2 className="font-semibold text-sm">Chat</h2>
             <button onClick={() => setIsChatOpen(false)} className="md:hidden text-xs text-muted-foreground">Close</button>
         </div>
         <ChatSidebar socket={socketRef.current} roomId={roomId} isOpen={isChatOpen} />
      </motion.div>
    </div>
  );
}

