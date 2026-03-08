import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import logo from "@/assets/logo.png";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const VideoCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { roomId, consultationId, role: callRole } = (location.state as any) || {};

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callEnded, setCallEnded] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      navigate(-1);
      return;
    }
    startCall();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.unsubscribe();
  };

  const startCall = async () => {
    // Get local media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Media error:", err);
      return;
    }

    // Create peer connection
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local tracks
    localStreamRef.current!.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
        setWaiting(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setConnected(false);
        setCallEnded(true);
      }
    };

    // Supabase Realtime channel for signaling
    const channel = supabase.channel(`video-${roomId}`);
    channelRef.current = channel;

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON(), from: user!.id },
        });
      }
    };

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "answer",
          payload: { answer, from: user!.id },
        });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.from === user!.id) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (e) {
          console.error("ICE error:", e);
        }
      })
      .on("broadcast", { event: "call-ended" }, ({ payload }) => {
        if (payload.from !== user!.id) {
          setCallEnded(true);
          setConnected(false);
          cleanup();
        }
      })
      .on("presence", { event: "join" }, async () => {
        // When someone joins, the initiator creates an offer
        if (callRole === "patient") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          channel.send({
            type: "broadcast",
            event: "offer",
            payload: { offer, from: user!.id },
          });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user!.id, role: callRole });
          // If doctor joins (they are the second person), trigger offer from patient
          if (callRole === "doctor") {
            // Signal presence so patient creates offer
            setTimeout(async () => {
              // Doctor also tries to create offer as fallback
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({
                  type: "broadcast",
                  event: "offer",
                  payload: { offer, from: user!.id },
                });
              } catch (e) {
                console.log("Doctor offer fallback:", e);
              }
            }, 1500);
          }
        }
      });
  };

  const toggleMic = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
    }
  };

  const endCall = async () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-ended",
      payload: { from: user!.id },
    });

    // Update consultation status
    if (consultationId) {
      await supabase.from("consultations").update({ status: "completed" }).eq("id", consultationId);
    }

    cleanup();
    setCallEnded(true);
    setConnected(false);
  };

  if (callEnded) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="bg-muted rounded-full p-6 w-20 h-20 mx-auto flex items-center justify-center">
            <PhoneOff className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold">Call Ended</h2>
          <p className="text-sm text-muted-foreground">The video consultation has ended.</p>
          <Button onClick={() => navigate(callRole === "doctor" ? "/doctor" : "/patient")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      {/* Remote Video (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Waiting overlay */}
      {waiting && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
          <img src={logo} alt="CARELENZ AI" className="h-12 w-12 mb-4 animate-pulse" />
          <p className="text-white text-lg font-display font-semibold">Waiting for {callRole === "patient" ? "doctor" : "patient"} to join...</p>
          <p className="text-white/60 text-sm mt-2">Share this room with your {callRole === "patient" ? "doctor" : "patient"}</p>
        </div>
      )}

      {/* Local Video (PIP) */}
      <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg z-20">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <img src={logo} alt="CARELENZ AI" className="h-6 w-6" />
        <span className="text-white font-display font-bold text-sm">Video Consultation</span>
        {connected && (
          <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">● Live</span>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-20">
        <button
          onClick={toggleMic}
          className={`rounded-full p-4 ${micOn ? "bg-white/20 text-white" : "bg-red-500 text-white"} backdrop-blur-sm transition-all`}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>
        <button
          onClick={endCall}
          className="rounded-full p-4 bg-red-600 text-white hover:bg-red-700 transition-all"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <button
          onClick={toggleCam}
          className={`rounded-full p-4 ${camOn ? "bg-white/20 text-white" : "bg-red-500 text-white"} backdrop-blur-sm transition-all`}
        >
          {camOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
