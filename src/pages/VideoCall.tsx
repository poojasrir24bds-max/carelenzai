import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import logo from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const VideoCall = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { roomId, consultationId, role: callRole, doctorId, patientId } = (location.state as any) || {};

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const callStartTimeRef = useRef<number | null>(null);

  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [callEnded, setCallEnded] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!roomId || !user) {
      navigate(-1);
      return;
    }
    startCall();
    return () => cleanup();
  }, []);

  const cleanup = () => {
    stopRecording();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.unsubscribe();
  };

  // ---- Recording Logic ----
  const startRecording = (localStream: MediaStream, remoteStream?: MediaStream) => {
    try {
      // Create a combined stream with local + remote audio/video
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      // Add local audio
      localStream.getAudioTracks().forEach((track) => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]));
        source.connect(destination);
      });

      // Add remote audio if available
      if (remoteStream) {
        remoteStream.getAudioTracks().forEach((track) => {
          const source = audioContext.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
        });
      }

      // Use local video + combined audio for recording
      const combinedStream = new MediaStream([
        ...localStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const recorder = new MediaRecorder(combinedStream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      callStartTimeRef.current = Date.now();
      setRecording(true);
      console.log("Recording started");
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const uploadRecording = async () => {
    if (recordedChunksRef.current.length === 0 || !consultationId || !user) return;

    setUploading(true);
    try {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const fileName = `${consultationId}_${Date.now()}.webm`;
      const filePath = `${consultationId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("call-recordings")
        .upload(filePath, blob, { contentType: "video/webm" });

      if (uploadError) throw uploadError;

      // Calculate duration
      const durationSeconds = callStartTimeRef.current
        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
        : 0;

      // Get consultation details for patient_id and doctor_id
      const { data: consultation } = await supabase
        .from("consultations")
        .select("patient_id, doctor_id")
        .eq("id", consultationId)
        .single();

      // Save recording metadata
      const { error: dbError } = await supabase.from("call_recordings" as any).insert({
        consultation_id: consultationId,
        patient_id: consultation?.patient_id || patientId || user.id,
        doctor_id: consultation?.doctor_id || doctorId || user.id,
        recording_url: filePath,
        duration_seconds: durationSeconds,
        file_size_bytes: blob.size,
        recorded_by: user.id,
      } as any);

      if (dbError) throw dbError;

      toast({ title: "✅ Recording saved", description: "Call recording has been saved for admin review." });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Recording upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Start recording immediately with local stream
      startRecording(stream);
    } catch (err) {
      console.error("Media error:", err);
      return;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    localStreamRef.current!.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
        setWaiting(false);

        // Restart recording with both streams for combined audio
        stopRecording();
        setTimeout(() => {
          if (localStreamRef.current) {
            startRecording(localStreamRef.current, event.streams[0]);
          }
        }, 500);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        setConnected(false);
        handleCallEnd();
      }
    };

    const channel = supabase.channel(`video-${roomId}`);
    channelRef.current = channel;

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
          handleCallEnd();
        }
      })
      .on("presence", { event: "join" }, async () => {
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
          if (callRole === "doctor") {
            setTimeout(async () => {
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

  const handleCallEnd = async () => {
    stopRecording();

    // Wait a moment for the last recording chunk
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Upload recording
    await uploadRecording();

    if (consultationId) {
      await supabase.from("consultations").update({ status: "completed" }).eq("id", consultationId);
    }

    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    channelRef.current?.unsubscribe();

    setCallEnded(true);
    setConnected(false);
  };

  const endCall = async () => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-ended",
      payload: { from: user!.id },
    });
    await handleCallEnd();
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
          {uploading && (
            <p className="text-sm text-primary animate-pulse">Saving recording...</p>
          )}
          <Button onClick={() => navigate(callRole === "doctor" ? "/doctor" : "/patient")} disabled={uploading}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {waiting && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
          <img src={logo} alt="CARELENZ AI" className="h-12 w-12 mb-4 animate-pulse" />
          <p className="text-white text-lg font-display font-semibold">Waiting for {callRole === "patient" ? "doctor" : "patient"} to join...</p>
          <p className="text-white/60 text-sm mt-2">Share this room with your {callRole === "patient" ? "doctor" : "patient"}</p>
        </div>
      )}

      <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-lg z-20">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
      </div>

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <img src={logo} alt="CARELENZ AI" className="h-6 w-6" />
        <span className="text-white font-display font-bold text-sm">Video Consultation</span>
        {connected && (
          <span className="bg-success text-success-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">● Live</span>
        )}
        {recording && (
          <span className="bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full animate-pulse">● REC</span>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-20">
        <button
          onClick={toggleMic}
          className={`rounded-full p-4 ${micOn ? "bg-white/20 text-white" : "bg-destructive text-destructive-foreground"} backdrop-blur-sm transition-all`}
        >
          {micOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </button>
        <button
          onClick={endCall}
          className="rounded-full p-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
        >
          <PhoneOff className="h-6 w-6" />
        </button>
        <button
          onClick={toggleCam}
          className={`rounded-full p-4 ${camOn ? "bg-white/20 text-white" : "bg-destructive text-destructive-foreground"} backdrop-blur-sm transition-all`}
        >
          {camOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
