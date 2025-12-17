"use client";

import React, { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { Flame } from "lucide-react";

interface VideoProps {
  peer: Peer.Instance;
  name?: string;
}

export const PeerVideo = ({ peer, name }: VideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    peer.on("stream", (stream: MediaStream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [peer]);

  return (
    <div className="relative w-full aspect-video bg-card rounded-xl overflow-hidden border border-border">
      <video
        playsInline
        autoPlay
        ref={ref}
        className="w-full h-full object-cover"
      />
      {name && (
        <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-white text-xs font-medium">
            {name}
        </div>
      )}
    </div>
  );
};
