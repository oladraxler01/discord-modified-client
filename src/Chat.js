import React, { useState, useEffect, useRef, useCallback } from "react";
import "./Chat.css";
import ChatHeader from "./ChatHeader";
import AddCircleIcon from "@material-ui/icons/AddCircle";
import CradGiftcardIcon from "@material-ui/icons/CardGiftcard";
import GifIcon from "@material-ui/icons/Gif";
import EmojiEmoticonsIcon from "@material-ui/icons/EmojiEmotions";
import MicIcon from "@material-ui/icons/Mic";
import StopIcon from "@material-ui/icons/Stop";
import SendIcon from "@material-ui/icons/Send";
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
  }, [activeChannelId, isDirectMessage]);

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

  // NEW: API Handlers for the Timer Handshake
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
      await axios.post(`/api/channels/${activeChannelId}/timer`, {
        uid: user.uid,
        durationInSeconds: ephemeralSettings.durationInSeconds,
      });
      getConversation();
    } catch (err) {
      console.error("Failed to accept timer:", err);
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!activeChannelId) return;

    const messageText = input.trim() ||
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
      .catch((err) => console.log(err));
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

    const maxFileSize = 8 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setAttachmentError("Files should be 8MB or smaller for a smooth Veil message.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: reader.result,
      });
      setAttachmentError("");
    };
    reader.onerror = () => {
      setAttachmentError("This file could not be read from your device.");
    };
    reader.readAsDataURL(file);
  };

  const hasDraft =
    input.trim() !== "" || Boolean(voiceData) || Boolean(attachment);

  const startConversationCall = useCallback(() => {
    const callWindow = window.open(
      "https://meet.google.com/new",
      "_blank",
      "noopener,noreferrer",
    );
    if (!callWindow) {
      window.alert(
        "Your browser blocked the call window. Allow popups and try again.",
      );
      return;
    }
    window.alert(
      "A Google Meet room opened. Copy its meeting link and send it in this conversation to invite others.",
    );
  }, []);

  const filteredMessages = messages.filter((item) => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return true;
    const searchableText = [
      item.message,
      item.user?.displayName,
      item.attachment?.name,
      item.attachment?.url,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
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

          {/* NEW: The Handshake Banner for Pending and Active Timers */}
          {ephemeralSettings?.durationInSeconds > 0 &&
            !ephemeralSettings?.active && (
              <div
                style={{
                  backgroundColor: "rgba(180, 83, 9, 0.2)",
                  border: "1px solid #d97706",
                  color: "#fcd34d",
                  padding: "12px",
                  margin: "16px",
                  borderRadius: "6px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.875rem" }}>
                  A {ephemeralSettings.durationInSeconds}s burn timer was
                  proposed. Waiting for members to accept.
                </span>
                {!ephemeralSettings.agreedByUids?.includes(user.uid) && (
                  <button
                    onClick={handleAcceptTimer}
                    style={{
                      backgroundColor: "#f59e0b",
                      color: "#000",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontWeight: "bold",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Accept
                  </button>
                )}
              </div>
            )}

          {ephemeralSettings?.active && (
            <div
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.2)",
                border: "1px solid #ef4444",
                color: "#f87171",
                padding: "8px",
                margin: "16px",
                borderRadius: "6px",
                textAlign: "center",
                fontSize: "0.875rem",
                fontWeight: "bold",
              }}
            >
              <span role="img" aria-label="fire emoji">🔥</span>{" "}
              Burn-on-Read active ({ephemeralSettings.durationInSeconds}s)
            </div>
          )}

          {searchTerm && filteredMessages.length === 0 && (
            <p className="chat__searchEmpty">No messages match “{searchTerm}”.</p>
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
              <span>
                <span role="img" aria-label="paperclip emoji">📎</span>{" "}
                {attachment.name}
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

            {/* NEW: Timer Controls built directly into the text bar */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginLeft: "12px",
                marginRight: "12px",
              }}
            >
              <input
                type="number"
                placeholder="Secs"
                style={{
                  backgroundColor: "#40444b",
                  color: "white",
                  padding: "8px",
                  borderRadius: "4px",
                  width: "60px",
                  outline: "none",
                  border: "none",
                }}
                onChange={(e) => setCustomTimer(Number(e.target.value))}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleProposeTimer(customTimer);
                }}
                style={{
                  color: "#9ca3af",
                  backgroundColor: "#2f3136",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Set
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleProposeTimer(0);
                }}
                style={{
                  color: "#f87171",
                  backgroundColor: "#2f3136",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Off
              </button>
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
      </motion.div>
    </AnimatePresence>
  );
};

export default Chat;
