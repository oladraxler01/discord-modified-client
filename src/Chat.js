import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Chat.css";
import ChatHeader from "./ChatHeader";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import CradGiftcardIcon from "@material-ui/icons/CardGiftcard";
import GifIcon from "@material-ui/icons/Gif";
import EmojiEmoticonsIcon from "@material-ui/icons/EmojiEmotions";
import MicIcon from "@material-ui/icons/Mic";
import MicOffIcon from "@material-ui/icons/MicOff";
import StopIcon from "@material-ui/icons/Stop";
import SendIcon from "@material-ui/icons/Send";
import CallEndIcon from "@material-ui/icons/CallEnd";
import CloseIcon from "@material-ui/icons/Close";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import WhatshotIcon from "@material-ui/icons/Whatshot";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import Message from "./Message";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "./features/userSlice";
import {
  selectChannelId,
  selectChannelName,
  setChannelInfo,
} from "./features/appSlice";
import axios from "./axios"; // We import axios instead of firebase
import { useParams } from "react-router-dom";
import { useRouteMatch } from "react-router-dom";
import usePusherRoom from "./hooks/usePusherRoom";
import getResponseArray from "./utils/responseArrays";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "./ThemeContext";
import { Room, RoomEvent, Track } from "livekit-client";

const popularGifs = [
  {
    label: "Happy",
    url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
  },
  {
    label: "Amazing",
    url: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif",
  },
  {
    label: "Clap",
    url: "https://media.giphy.com/media/3o6Zt6D2M0w5xMSM8/giphy.gif",
  },
  {
    label: "Loading",
    url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  },
  {
    label: "Dance",
    url: "https://media.giphy.com/media/MDJ9IbxxvDUQM/giphy.gif",
  },
  {
    label: "Reaction",
    url: "https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif",
  },
];

const VoiceRoomSession = ({ token, serverUrl, onDisconnected, onError }) => {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(false);
  const [connectionError, setConnectionError] = useState("");
  const audioMountRef = useRef(null);
  const roomRef = useRef(null);
  const attachedAudioTracksRef = useRef(new Set());
  const callbacksRef = useRef({ onDisconnected, onError });
  callbacksRef.current = { onDisconnected, onError };

  useEffect(() => {
    let active = true;
    const liveRoom = new Room();
    const attachedAudioTracks = attachedAudioTracksRef.current;
    roomRef.current = liveRoom;

    const refreshParticipants = () => {
      if (!active || !liveRoom) return;

      // Safe guarded retrieval of remote participants preventing "reading values of undefined"
      let remoteList = [];
      const remote = liveRoom.remoteParticipants;
      if (remote) {
        if (typeof remote.values === "function") {
          remoteList = Array.from(remote.values());
        } else if (typeof remote.forEach === "function") {
          remote.forEach((p) => remoteList.push(p));
        } else if (Array.isArray(remote)) {
          remoteList = remote;
        }
      }

      const remoteParticipants = (Array.isArray(remoteList) ? remoteList : [])
        .filter(Boolean)
        .map((participant) => ({
          identity: participant?.identity || "guest",
          name: participant?.name || participant?.identity || "Guest",
          isSpeaking: Boolean(participant?.isSpeaking),
        }));

      const localList = [];
      if (liveRoom.localParticipant) {
        localList.push({
          identity: liveRoom.localParticipant.identity || "local",
          name: liveRoom.localParticipant.name || "You",
          isLocal: true,
          isSpeaking: Boolean(liveRoom.localParticipant.isSpeaking),
        });
      }

      setParticipants([...localList, ...remoteParticipants]);
    };

    const attachRemoteAudio = (track) => {
      if (!active || !track || track.kind !== Track.Kind.Audio || !audioMountRef.current)
        return;
      try {
        const elements = track.attach();
        elements.forEach((element) => {
          element.autoplay = true;
          element.setAttribute("playsinline", "true");
          audioMountRef.current.appendChild(element);
        });
        attachedAudioTracks.add(track);
      } catch (err) {
        console.warn("Audio attach error:", err);
      }
    };

    const detachRemoteAudio = (track) => {
      if (!track || track.kind !== Track.Kind.Audio) return;
      try {
        track.detach().forEach((element) => element.remove());
      } catch (err) {}
    };

    const handleConnected = () => {
      if (!active) return;
      setIsConnected(true);
      refreshParticipants();
    };

    const handleDisconnected = () => {
      if (!active) return;
      setIsConnected(false);
      if (callbacksRef.current.onDisconnected) {
        callbacksRef.current.onDisconnected();
      }
    };

    const handleError = (error) => {
      if (!active) return;
      setConnectionError(error?.message || "LiveKit connection failed.");
      if (callbacksRef.current.onError) callbacksRef.current.onError(error);
    };

    liveRoom.on(RoomEvent.Connected, handleConnected);
    liveRoom.on(RoomEvent.ParticipantConnected, refreshParticipants);
    liveRoom.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
    liveRoom.on(RoomEvent.TrackSubscribed, attachRemoteAudio);
    liveRoom.on(RoomEvent.TrackUnsubscribed, detachRemoteAudio);
    liveRoom.on(RoomEvent.ActiveSpeakersChanged, refreshParticipants);
    liveRoom.on(RoomEvent.Disconnected, handleDisconnected);
    liveRoom.on(RoomEvent.MediaDevicesError, handleError);

    liveRoom
      .connect(serverUrl, token)
      .then(async () => {
        if (!active) return;
        setRoom(liveRoom);
        setIsConnected(true);
        refreshParticipants();

        // Attach existing remote audio tracks safely
        try {
          const remote = liveRoom.remoteParticipants;
          if (remote && typeof remote.forEach === "function") {
            remote.forEach((p) => {
              if (p?.audioTracks && typeof p.audioTracks.forEach === "function") {
                p.audioTracks.forEach((pub) => {
                  if (pub?.track) attachRemoteAudio(pub.track);
                });
              }
            });
          }
        } catch (trackError) {
          console.warn("Could not attach initial tracks:", trackError);
        }

        // Gracefully attempt mic enable
        try {
          if (liveRoom.localParticipant) {
            await liveRoom.localParticipant.setMicrophoneEnabled(true);
            if (active) setIsMicrophoneEnabled(true);
          }
        } catch (micErr) {
          console.warn("Could not enable microphone automatically:", micErr);
          if (active) setIsMicrophoneEnabled(false);
        }
      })
      .catch(handleError);

    return () => {
      active = false;
      liveRoom.removeAllListeners();
      attachedAudioTracks.forEach(detachRemoteAudio);
      attachedAudioTracks.clear();
      liveRoom.disconnect();
      roomRef.current = null;
    };
  }, [serverUrl, token]);

  const toggleMicrophone = async () => {
    if (!roomRef.current || !roomRef.current.localParticipant) return;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(
        !isMicrophoneEnabled,
      );
      setIsMicrophoneEnabled((enabled) => !enabled);
    } catch (error) {
      setConnectionError(error?.message || "Could not change microphone state.");
    }
  };

  const disconnect = () => roomRef.current?.disconnect();

  if (connectionError) {
    return (
      <div className="veil-call__status veil-call__status--error" role="alert">
        {connectionError}
      </div>
    );
  }

  // Ensure we don't render the inner UI until the room's connection state is fully established
  if (!room || !isConnected || (room.state && room.state !== "connected")) {
    return (
      <div className="veil-call__status" role="status">
        Connecting to your voice room…
      </div>
    );
  }

  return (
    <>
      <div className="veil-call__participantGrid" aria-live="polite">
        {participants.map((participant) => (
          <div
            className={`veil-call__participant ${participant.isSpeaking ? "is-speaking" : ""}`}
            key={participant.identity}
          >
            <span className="veil-call__avatar">
              {(participant.name || "?").slice(0, 1).toUpperCase()}
            </span>
            <strong>
              {participant.name}
              {participant.isLocal ? " (you)" : ""}
            </strong>
            <small>
              {participant.isSpeaking
                ? "Speaking"
                : participant.isLocal && !isMicrophoneEnabled
                  ? "Microphone muted"
                  : "Connected"}
            </small>
          </div>
        ))}
      </div>
      <div
        className="veil-call__remoteAudio"
        ref={audioMountRef}
        aria-hidden="true"
      />
      <div className="veil-call__controls">
        <button
          className={`veil-call__mic ${isMicrophoneEnabled ? "is-on" : "is-muted"}`}
          type="button"
          onClick={toggleMicrophone}
          aria-label={
            isMicrophoneEnabled ? "Mute microphone" : "Unmute microphone"
          }
        >
          {isMicrophoneEnabled ? (
            <>
              <MicIcon fontSize="small" />
              <span>Mute</span>
            </>
          ) : (
            <>
              <MicOffIcon fontSize="small" />
              <span>Unmute</span>
            </>
          )}
        </button>
        <button
          className="veil-call__disconnect"
          type="button"
          onClick={disconnect}
          aria-label="Leave voice call"
        >
          <CallEndIcon fontSize="small" />
          <span>Leave call</span>
        </button>
      </div>
    </>
  );
};

const Chat = ({ onMessagesChange, onRegisterActions }) => {
  const dispatch = useDispatch();
  const { roomId } = useParams();
  const isDirectMessage = Boolean(useRouteMatch("/dm/:roomId"));
  const user = useSelector(selectUser);
  const channelId = useSelector(selectChannelId);
  const channelName = useSelector(selectChannelName);
  const activeChannelId = roomId || channelId;
  const activeRoomName = isDirectMessage
    ? channelName || "Direct message"
    : channelName;

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [liveKitToken, setLiveKitToken] = useState("");
  const [voiceCallError, setVoiceCallError] = useState("");
  const [isFetchingVoiceToken, setIsFetchingVoiceToken] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef(null);
  const { currentTheme, setCurrentTheme } = useTheme();

  // NEW: State to hold our burn-on-read timer settings
  const [customTimer, setCustomTimer] = useState(0);
  const [ephemeralSettings, setEphemeralSettings] = useState({
    active: false,
    durationInSeconds: 0,
    agreedByUids: [],
  });

  const [roomError, setRoomError] = useState("");
  const [isInviteOnly, setIsInviteOnly] = useState(false);
  const [roomAccessChecked, setRoomAccessChecked] = useState(false);
  const [roomAuthorized, setRoomAuthorized] = useState(false);
  const [picker, setPicker] = useState(null);
  const [gifSearch, setGifSearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState("");
  const [voiceData, setVoiceData] = useState("");
  const [audioLevels, setAudioLevels] = useState(Array(18).fill(12));
  const [attachment, setAttachment] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (onMessagesChange) onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    setMessages([]);
    setSearchTerm("");
    setIsVoiceConnected(false);
    setLiveKitToken("");
    setVoiceCallError("");
  }, [activeChannelId, isDirectMessage]);

  useEffect(() => {
    if (!isVoiceConnected) return undefined;

    let isCurrentCall = true;
    const liveKitUrl = process.env.REACT_APP_LIVEKIT_URL;
    setLiveKitToken("");
    setVoiceCallError("");
    setIsFetchingVoiceToken(true);

    if (!activeChannelId) {
      setVoiceCallError("Open a conversation before starting a voice call.");
      setIsFetchingVoiceToken(false);
      return () => {
        isCurrentCall = false;
      };
    }
    if (!liveKitUrl) {
      setVoiceCallError(
        "LiveKit is not configured. Set REACT_APP_LIVEKIT_URL for the frontend.",
      );
      setIsFetchingVoiceToken(false);
      return () => {
        isCurrentCall = false;
      };
    }

    axios
      .post("/api/voice/token", {
        roomName: activeChannelId,
        participantName: user?.displayName || user?.email || "Veil user",
      })
      .then((response) => {
        if (isCurrentCall) {
          if (response.data?.token) setLiveKitToken(response.data.token);
          else
            setVoiceCallError("The voice service did not return a room token.");
        }
      })
      .catch((error) => {
        if (isCurrentCall) {
          setVoiceCallError(
            error.response?.data?.error || "Could not join this voice room.",
          );
        }
      })
      .finally(() => {
        if (isCurrentCall) setIsFetchingVoiceToken(false);
      });

    return () => {
      isCurrentCall = false;
    };
  }, [isVoiceConnected, activeChannelId, user]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isRecordingRef = useRef(false);
  const micStreamRef = useRef(null);

  const stopAudioMonitoring = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const startAudioMonitoring = async (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceNodeRef.current = source;

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current || !isRecordingRef.current) {
        setAudioLevels(Array(18).fill(12));
        return;
      }

      analyserRef.current.getByteFrequencyData(frequencyData);

      const nextLevels = Array.from({ length: 18 }, (_, index) => {
        const start = Math.floor((index / 18) * bufferLength);
        const end = Math.floor(((index + 1) / 18) * bufferLength);
        const slice = frequencyData.slice(start, end);
        const average =
          slice.reduce((total, value) => total + value, 0) /
          (slice.length || 1);
        return Math.min(100, Math.max(12, (average / 255) * 100));
      });

      setAudioLevels(nextLevels);
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    };

    updateWaveform();
  };

  useEffect(() => {
    if (!roomId) return undefined;

    let isCurrentRoom = true;
    setRoomError("");
    setRoomAccessChecked(false);
    setRoomAuthorized(false);

    if (isDirectMessage) {
      setIsInviteOnly(false);
      dispatch(
        setChannelInfo({ channelId: roomId, channelName: "Direct message" }),
      );
      axios
        .get(`/dm/${roomId}`)
        .then((response) => {
          if (!isCurrentRoom) return;
          setRoomAuthorized(true);
          dispatch(
            setChannelInfo({
              channelId: roomId,
              channelName:
                response.data.otherParticipant?.displayName || "Direct message",
            }),
          );
        })
        .catch((error) => {
          if (isCurrentRoom) {
            setRoomError(
              error.response?.data?.error ||
                "You do not have access to this direct message.",
            );
          }
        })
        .finally(() => {
          if (isCurrentRoom) setRoomAccessChecked(true);
        });

      return () => {
        isCurrentRoom = false;
      };
    }

    dispatch(setChannelInfo({ channelId: roomId, channelName: roomId }));

    axios
      .get("/get/channelList")
      .then((response) => {
        if (!isCurrentRoom) return;
        const rooms = getResponseArray(response.data, "channels");
        const room = rooms.find((item) => item.id === roomId);
        if (room) {
          setRoomAuthorized(true);
          setIsInviteOnly(Boolean(room.isPrivate));
          dispatch(
            setChannelInfo({ channelId: roomId, channelName: room.name }),
          );
        } else {
          setRoomError(
            "This channel is private, expired, or you do not have access.",
          );
        }
      })
      .catch((error) => {
        if (isCurrentRoom) {
          setRoomError(
            error.response?.data?.error || "Could not check channel access.",
          );
        }
      })
      .finally(() => {
        if (isCurrentRoom) setRoomAccessChecked(true);
      });

    return () => {
      isCurrentRoom = false;
    };
  }, [dispatch, isDirectMessage, roomId]);

  const getConversation = useCallback(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    const conversationRequest = isDirectMessage
      ? axios.get(`/dm/${activeChannelId}`)
      : axios.get(`/get/conversation?id=${activeChannelId}`);

    conversationRequest
      .then((response) => {
        if (isDirectMessage) {
          setMessages(getResponseArray(response.data?.conversation));
          // NEW: Grab DM timer settings
          setEphemeralSettings(
            response.data?.ephemeralSettings || {
              active: false,
              durationInSeconds: 0,
              agreedByUids: [],
            },
          );
          setRoomError("");
          return;
        }

        const conversations = getResponseArray(response.data, "conversations");
        const currentChannel = conversations[0] || {};
        setMessages(getResponseArray(currentChannel.conversation));
        // NEW: Grab Channel timer settings
        setEphemeralSettings(
          currentChannel.ephemeralSettings || {
            active: false,
            durationInSeconds: 0,
            agreedByUids: [],
          },
        );
        setRoomError("");
      })
      .catch((error) => {
        console.error("Could not load chat messages:", error);
        setRoomError(
          error.response?.data?.error || "You do not have access to this chat.",
        );
      });
  }, [activeChannelId, isDirectMessage]);

  useEffect(() => {
    getConversation();
  }, [getConversation]);

  usePusherRoom(
    roomAccessChecked && roomAuthorized ? activeChannelId : null,
    getConversation,
    isDirectMessage,
    isInviteOnly,
  );

  useEffect(() => {
    return () => {
      stopAudioMonitoring();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      isRecordingRef.current = false;
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // API Handlers for the Timer Handshake & Per-message Countdown
  const handleProposeTimer = async (seconds) => {
    if (!activeChannelId) return;
    try {
      await axios.post(`/api/channels/${activeChannelId}/timer`, {
        uid: user.uid,
        durationInSeconds: seconds,
      });
      getConversation();
    } catch (err) {
      console.error("Failed to propose timer:", err);
    }
  };

  const handleAcceptTimer = async () => {
    if (!activeChannelId) return;
    try {
      // Optimistically activate local ephemeral settings so banner and countdown switch immediately
      setEphemeralSettings((prev) => ({
        ...prev,
        active: true,
        agreedByUids: [...new Set([...(prev?.agreedByUids || []), user?.uid])],
      }));
      await axios.post(`/api/channels/${activeChannelId}/timer`, {
        uid: user.uid,
        durationInSeconds: ephemeralSettings.durationInSeconds,
      });
      getConversation();
    } catch (err) {
      console.error("Failed to accept timer:", err);
    }
  };

  const handleStartMessageTimer = async (messageId, duration = 10) => {
    if (!activeChannelId || !messageId) return;
    try {
      // Optimistically assign expireAt to message locally so countdown starts at 0ms delay
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                expireAt: new Date(Date.now() + duration * 1000).toISOString(),
              }
            : m,
        ),
      );
      await axios.post(
        `/api/channels/${activeChannelId}/messages/${messageId}/timer`,
        { durationInSeconds: duration },
      );
      getConversation();
    } catch (err) {
      console.error("Failed to start message timer:", err);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!activeChannelId) return;

    const messageText =
      input.trim() ||
      (voiceData ? "🎤 Voice note" : attachment ? `📎 ${attachment.name}` : "");

    if (!messageText && !attachment && !voiceData) return;

    const payload = {
      message: messageText,
      user: user,
      timestamp: new Date().toISOString(),
    };

    if (voiceData) {
      payload.voiceData = voiceData;
    }

    if (attachment) {
      payload.attachment = attachment;
    }

    const messageRequest = isDirectMessage
      ? axios.post(`/dm/${activeChannelId}/messages`, payload)
      : axios.post(`/new/message?id=${activeChannelId}`, payload);

    messageRequest
      .then(() => {
        setInput("");
        setVoiceData("");
        setAttachment(null);
        setAttachmentError("");
        setAudioLevels(Array(18).fill(12));
        getConversation();
      })
      .catch((err) => {
        console.error("Message send failed:", err);
        const serverError =
          err.response?.data?.error ||
          (err.response?.status === 413
            ? "File is too large to send."
            : err.response?.status === 404
              ? "Conversation not found or access expired."
              : "Could not send message. Please try again.");
        setAttachmentError(serverError);
      });
  };

  const startRecording = async () => {
    if (!activeChannelId) return;
    setRecordingError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        "Microphone access requires HTTPS and a supported browser.",
      );
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecordingError("Audio recording is not supported by this browser.");
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const supportedMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/mp4",
      ];
      const mimeType = supportedMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      setVoiceData("");
      setInput("");
      isRecordingRef.current = true;
      setIsRecording(true);

      recorder.onerror = (event) => {
        console.error("Audio recording failed:", event.error);
        isRecordingRef.current = false;
        setIsRecording(false);
        setRecordingError(
          "Recording stopped because the microphone had an error.",
        );
        stream.getTracks().forEach((track) => track.stop());
        stopAudioMonitoring();
      };

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        isRecordingRef.current = false;
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || mimeType || "application/octet-stream",
        });
        stream.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;

        if (!audioBlob.size) {
          setIsRecording(false);
          setRecordingError(
            "No audio was captured. Check your microphone input and try again.",
          );
          stopAudioMonitoring();
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceData(reader.result);
          setIsRecording(false);
          setAudioLevels(Array(18).fill(12));
          stopAudioMonitoring();
        };
        reader.onerror = () => {
          setIsRecording(false);
          setRecordingError(
            "The recorded audio could not be prepared. Please try again.",
          );
          stopAudioMonitoring();
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start();
      startAudioMonitoring(stream).catch((error) =>
        console.warn("Live microphone meter is unavailable:", error),
      );
    } catch (error) {
      console.error("Microphone access failed:", error);
      isRecordingRef.current = false;
      setIsRecording(false);
      setRecordingError(
        "Could not start recording. Check microphone access and try again.",
      );
      if (stream) stream.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
      stopAudioMonitoring();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingRef.current = false;
      if (mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }
  };

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    const maxFileSize = 12 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setAttachmentError(
        "Files should be 12MB or smaller for a smooth Veil message.",
      );
      return;
    }

    const isCompressibleImage =
      file.type.startsWith("image/") &&
      !file.type.includes("gif") &&
      !file.type.includes("svg");

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result;

      if (isCompressibleImage) {
        const img = new Image();
        img.onload = () => {
          try {
            const maxDimension = 1600;
            let width = img.width;
            let height = img.height;

            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
            setAttachment({
              name: file.name,
              type: "image/jpeg",
              size: Math.round((optimizedDataUrl.length * 3) / 4),
              dataUrl: optimizedDataUrl,
            });
            setAttachmentError("");
          } catch (e) {
            setAttachment({
              name: file.name,
              type: file.type || "application/octet-stream",
              size: file.size,
              dataUrl: rawDataUrl,
            });
            setAttachmentError("");
          }
        };
        img.onerror = () => {
          setAttachment({
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            dataUrl: rawDataUrl,
          });
          setAttachmentError("");
        };
        img.src = rawDataUrl;
      } else {
        setAttachment({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: rawDataUrl,
        });
        setAttachmentError("");
      }
    };
    reader.onerror = () => {
      setAttachmentError("This file could not be read from your device.");
    };
    reader.readAsDataURL(file);
  };

  const hasDraft =
    input.trim() !== "" || Boolean(voiceData) || Boolean(attachment);

  const startConversationCall = useCallback(() => {
    setVoiceCallError("");
    setIsVoiceConnected(true);
  }, []);

  const filteredMessages = messages.filter((item) => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return true;
    const searchableText = [
      item.message,
      item.user?.displayName,
      item.attachment?.name,
      item.attachment?.url,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase();
    return searchableText.includes(query);
  });

  useEffect(() => {
    if (!onRegisterActions) return undefined;
    onRegisterActions({
      startCall: startConversationCall,
      focusSearch: () => searchInputRef.current?.focus(),
    });
    return () => onRegisterActions(null);
  }, [onRegisterActions, startConversationCall]);

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <motion.div
        key={`${isDirectMessage ? "dm" : "channel"}-${activeChannelId || "empty"}`}
        className="chat"
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
      >
        <ChatHeader
          channelName={activeRoomName}
          isDirectMessage={isDirectMessage}
          onStartCall={startConversationCall}
          theme={currentTheme}
          onThemeChange={setCurrentTheme}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchInputRef={searchInputRef}
        />

        <div className="chat__messages overflow-y-auto">
          {roomError && (
            <div className="chat__roomError" role="alert">
              {roomError}
            </div>
          )}

          {/* Ephemeral Timer Handshake / Deal Banner */}
          {ephemeralSettings?.durationInSeconds > 0 &&
            !ephemeralSettings?.active && (
              <div className="chat__ephemeralBanner chat__ephemeralBanner--pending">
                <div className="chat__ephemeralContent">
                  <div className="chat__ephemeralIcon">
                    <span role="img" aria-label="hourglass">⏳</span>
                  </div>
                  <div className="chat__ephemeralText">
                    <span className="chat__ephemeralTitle">
                      Ephemeral Deal Proposed ({ephemeralSettings.durationInSeconds}s)
                    </span>
                    <span className="chat__ephemeralSub">
                      {ephemeralSettings.agreedByUids?.includes(user?.uid)
                        ? "Awaiting agreement from the other member..."
                        : "Accept this deal to activate live countdown and auto-dissolving messages."}
                    </span>
                  </div>
                </div>
                <div className="chat__ephemeralActions">
                  {!ephemeralSettings.agreedByUids?.includes(user?.uid) && (
                    <button
                      type="button"
                      className="chat__ephemeralBtn chat__ephemeralBtn--accept"
                      onClick={handleAcceptTimer}
                    >
                      <span role="img" aria-label="lightning">⚡</span> Accept Deal
                    </button>
                  )}
                  <button
                    type="button"
                    className="chat__ephemeralBtn chat__ephemeralBtn--cancel"
                    onClick={() => handleProposeTimer(0)}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

          {ephemeralSettings?.active && (
            <div className="chat__ephemeralBanner chat__ephemeralBanner--active">
              <div className="chat__ephemeralContent">
                <WhatshotIcon className="chat__ephemeralFlame" fontSize="small" />
                <div className="chat__ephemeralText">
                  <span className="chat__ephemeralTitle">
                    Burn-on-Read Deal Active ({ephemeralSettings.durationInSeconds}s)
                  </span>
                  <span className="chat__ephemeralSub">
                    Messages begin live countdown and auto-dissolve upon delivery
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="chat__ephemeralBtn chat__ephemeralBtn--stop"
                onClick={() => handleProposeTimer(0)}
              >
                Disable
              </button>
            </div>
          )}

          {searchTerm && filteredMessages.length === 0 && (
            <p className="chat__searchEmpty">
              No messages match “{searchTerm}”.
            </p>
          )}
          {filteredMessages.map((message, index) => (
            <Message
              key={message._id || index}
              id={message._id}
              message={message.message}
              timestamp={message.timestamp}
              user={message.user}
              voiceData={message.voiceData}
              attachment={message.attachment}
              expireAt={message.expireAt}
              ephemeralDuration={ephemeralSettings?.durationInSeconds}
              isBurnActive={ephemeralSettings?.active}
              currentUserId={user?.uid}
              onExpire={(expiredId) => {
                setMessages((prev) => prev.filter((m) => m._id !== expiredId));
              }}
              onStartTimer={(msgId, secs) => handleStartMessageTimer(msgId, secs)}
            />
          ))}
        </div>

        <div className="chat__input">
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={handleFileSelection}
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.mp3,.wav,.zip,.rar"
          />
          <button
            type="button"
            className="chat__uploadButton"
            aria-label="Attach a file"
            onClick={() => fileInputRef.current?.click()}
          >
            <AddCircleIcon className="chat__addIcon" fontSize="large" />
          </button>

          {attachment && (
            <div className="chat__attachmentPreview" aria-live="polite">
              <span className="chat__attachmentPreviewContent">
                <AttachFileIcon fontSize="small" />
                <span>{attachment.name}</span>
              </span>
              <button type="button" onClick={() => setAttachment(null)}>
                Remove
              </button>
            </div>
          )}

          {attachmentError && (
            <p className="chat__attachmentError" role="alert">
              {attachmentError}
            </p>
          )}

          {isRecording && (
            <div className="chat__recordingPanel" aria-live="polite">
              <span className="chat__recordingDot" />
              <span className="chat__recordingLabel">Recording</span>
              <div className="chat__waveform" aria-hidden="true">
                {audioLevels?.map((level, index) => (
                  <span
                    key={`level-${index}`}
                    className="chat__waveformBar"
                    style={{ height: `${Math.max(12, level)}%` }}
                  />
                ))}
              </div>
            </div>
          )}
          {!isRecording && voiceData && (
            <div className="chat__voiceReady" aria-live="polite">
              Voice note ready to send
            </div>
          )}
          {recordingError && (
            <p className="chat__recordingError" role="alert">
              {recordingError}
            </p>
          )}

          <form onSubmit={sendMessage} className="chat__form">
            <input
              type="text"
              disabled={!activeChannelId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isDirectMessage
                  ? `Message ${activeRoomName || "direct message"}`
                  : `Message #${activeRoomName || "channel"}`
              }
            />

            {/* Timer Controls */}
            <div className="chat__timerControls">
              <div className="chat__timerPresets">
                <button
                  type="button"
                  className={`chat__timerPreset ${customTimer === 10 ? "chat__timerPreset--active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCustomTimer(10);
                    handleProposeTimer(10);
                  }}
                  title="Quick 10-second burn deal"
                >
                  10s
                </button>
                <button
                  type="button"
                  className={`chat__timerPreset ${customTimer === 30 ? "chat__timerPreset--active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setCustomTimer(30);
                    handleProposeTimer(30);
                  }}
                  title="Quick 30-second burn deal"
                >
                  30s
                </button>
              </div>
              <input
                type="number"
                placeholder="Secs"
                value={customTimer || ""}
                className="chat__timerInput"
                onChange={(e) => setCustomTimer(Number(e.target.value))}
              />
              <button
                type="button"
                className="chat__timerBtn chat__timerBtn--set"
                onClick={(e) => {
                  e.preventDefault();
                  if (customTimer > 0) handleProposeTimer(customTimer);
                }}
              >
                Set
              </button>
              {ephemeralSettings?.active && (
                <button
                  type="button"
                  className="chat__timerBtn chat__timerBtn--off"
                  onClick={(e) => {
                    e.preventDefault();
                    handleProposeTimer(0);
                    setCustomTimer(0);
                  }}
                >
                  Off
                </button>
              )}
            </div>

            <button
              className={`chat__voiceButton ${isRecording ? "is-recording" : ""}`}
              type="button"
              disabled={!activeChannelId}
              aria-label={isRecording ? "Stop recording" : "Record voice note"}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? (
                <StopIcon fontSize="small" />
              ) : (
                <MicIcon fontSize="small" />
              )}
            </button>

            <button
              className="chat__sendButton"
              disabled={!activeChannelId || !hasDraft}
              type="submit"
              aria-label="Send message"
            >
              <SendIcon fontSize="small" />
              <span>{voiceData ? "Send voice" : "Send"}</span>
            </button>
          </form>

          <div className="chat__inputIcon">
            <CradGiftcardIcon className="chat__toolIcon" fontSize="large" />
            <button
              className={`chat__pickerButton ${picker === "gif" ? "is-active" : ""}`}
              type="button"
              aria-expanded={picker === "gif"}
              onClick={() => setPicker(picker === "gif" ? null : "gif")}
            >
              <GifIcon fontSize="large" />
            </button>
            <button
              className={`chat__pickerButton ${picker === "emoji" ? "is-active" : ""}`}
              type="button"
              aria-expanded={picker === "emoji"}
              onClick={() => setPicker(picker === "emoji" ? null : "emoji")}
            >
              <EmojiEmoticonsIcon fontSize="large" />
            </button>
          </div>
        </div>

        {picker === "emoji" && (
          <div className="chat__picker chat__emojiPicker">
            <EmojiPicker
              onEmojiClick={(emojiData) =>
                setInput((current) => current + emojiData.emoji)
              }
              width="100%"
              height={360}
              theme={Theme.DARK}
              emojiStyle={EmojiStyle.TWITTER}
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}

        {picker === "gif" && (
          <div className="chat__picker chat__gifPicker">
            <div className="chat__gifHeading">
              <div>
                <strong>Popular GIFs</strong>
                <span>Pick one to add it to your message</span>
              </div>
              <a
                href="https://giphy.com/search"
                target="_blank"
                rel="noopener noreferrer"
              >
                Explore GIPHY
              </a>
            </div>
            <input
              className="chat__gifSearch"
              value={gifSearch}
              onChange={(event) => setGifSearch(event.target.value)}
              placeholder="Filter popular GIFs..."
            />
            <div className="chat__gifGrid">
              {popularGifs
                .filter((gif) =>
                  gif.label.toLowerCase().includes(gifSearch.toLowerCase()),
                )
                .map((gif) => (
                  <button
                    className="chat__gifCard"
                    key={gif.label}
                    type="button"
                    onClick={() => {
                      setInput(gif.url);
                      setPicker(null);
                    }}
                  >
                    <img src={gif.url} alt={gif.label} loading="lazy" />
                    <span>{gif.label}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {isVoiceConnected && (
          <div className="veil-call__backdrop" role="presentation">
            <section
              className="veil-call"
              role="dialog"
              aria-modal="true"
              aria-label={`Voice call in ${activeRoomName || "conversation"}`}
            >
              <header className="veil-call__header">
                <div>
                  <span className="veil-call__eyebrow">VEIL VOICE ROOM</span>
                  <h2>{activeRoomName || "Conversation"}</h2>
                  <p>Connect and talk privately in this space.</p>
                </div>
                <button
                  className="veil-call__close"
                  type="button"
                  onClick={() => setIsVoiceConnected(false)}
                  aria-label="Close voice call"
                >
                  <CloseIcon fontSize="small" />
                </button>
              </header>

              {voiceCallError ? (
                <div
                  className="veil-call__status veil-call__status--error"
                  role="alert"
                >
                  {voiceCallError}
                </div>
              ) : isFetchingVoiceToken || !liveKitToken ? (
                <div className="veil-call__status" role="status">
                  Connecting to your voice room…
                </div>
              ) : (
                <VoiceRoomSession
                  key={`${activeChannelId}-${liveKitToken}`}
                  serverUrl={process.env.REACT_APP_LIVEKIT_URL}
                  token={liveKitToken}
                  onDisconnected={() => setIsVoiceConnected(false)}
                  onError={(error) =>
                    setVoiceCallError(
                      error.message || "LiveKit connection failed.",
                    )
                  }
                />
              )}
            </section>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default Chat;
