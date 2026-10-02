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
import usePusherRoom from "./hooks/usePusherRoom";

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

const Chat = () => {
  const dispatch = useDispatch();
  const { roomId } = useParams();
  const user = useSelector(selectUser);
  const channelId = useSelector(selectChannelId);
  const channelName = useSelector(selectChannelName);
  const activeChannelId = roomId || channelId;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [picker, setPicker] = useState(null);
  const [gifSearch, setGifSearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceData, setVoiceData] = useState("");
  const [audioLevels, setAudioLevels] = useState(Array(18).fill(12));
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  const startAudioMonitoring = (stream) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    sourceNodeRef.current = source;

    const bufferLength = analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);

    const updateWaveform = () => {
      if (!analyserRef.current || !isRecording) {
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
    dispatch(setChannelInfo({ channelId: roomId, channelName: roomId }));

    axios
      .get("/get/channelList")
      .then((response) => {
        if (!isCurrentRoom) return;

        const room = response.data.find((item) => item.id === roomId);
        if (room) {
          dispatch(
            setChannelInfo({ channelId: roomId, channelName: room.name }),
          );
        }
      })
      .catch((error) => console.error("Could not resolve chat room:", error));

    return () => {
      isCurrentRoom = false;
    };
  }, [dispatch, roomId]);

  const getConversation = useCallback(() => {
    if (!activeChannelId) {
      setMessages([]);
      return;
    }

    axios
      .get(`/get/conversation?id=${activeChannelId}`)
      .then((response) => {
        setMessages(response.data[0]?.conversation || []);
      })
      .catch((error) => console.error("Could not load chat messages:", error));
  }, [activeChannelId]);

  useEffect(() => {
    getConversation();
  }, [getConversation]);

  usePusherRoom(activeChannelId, getConversation);

  useEffect(() => {
    return () => {
      stopAudioMonitoring();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // 3. CHANGED: Send message to your MongoDB backend
  const sendMessage = (e) => {
    e.preventDefault();

    if (!activeChannelId) return;

    const messageText = input.trim() || (voiceData ? "🎤 Voice note" : "");

    if (!messageText) {
      return;
    }

    const payload = {
      message: messageText,
      user: user,
      timestamp: new Date().toISOString(),
    };

    if (voiceData) {
      payload.voiceData = voiceData;
    }

    axios
      .post(`/new/message?id=${activeChannelId}`, payload)
      .then(() => {
        setInput("");
        setVoiceData("");
        setAudioLevels(Array(18).fill(12));
        getConversation();
      })
      .catch((err) => console.log(err));
  };

  const startRecording = async () => {
    if (!activeChannelId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startAudioMonitoring(stream);
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      setVoiceData("");
      setInput("");
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      recorder.mimeType = mimeType;

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();

        reader.onloadend = () => {
          setVoiceData(reader.result);
          setIsRecording(false);
          stopAudioMonitoring();
        };

        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
    } catch (error) {
      console.error("Microphone access failed:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const hasDraft = input.trim() !== "" || Boolean(voiceData);

  return (
    <div className="chat">
      <ChatHeader channelName={channelName} />

      <div className="chat__messages">
        {messages.map((message, index) => (
          <Message
            key={index}
            message={message.message}
            timestamp={message.timestamp}
            user={message.user}
            voiceData={message.voiceData}
          />
        ))}
      </div>

      <div className="chat__input">
        <AddCircleIcon className="chat__addIcon" fontSize="large" />
        {isRecording && (
          <div className="chat__recordingPanel" aria-live="polite">
            <span className="chat__recordingDot" />
            <span className="chat__recordingLabel">Recording</span>
            <div className="chat__waveform" aria-hidden="true">
              {audioLevels.map((level, index) => (
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
        <form onSubmit={sendMessage} className="chat__form">
          <input
            type="text"
            disabled={!activeChannelId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${channelName || "channel"}`}
          />

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
            aria-label="Choose a GIF"
            aria-expanded={picker === "gif"}
            onClick={() => setPicker(picker === "gif" ? null : "gif")}
          >
            <GifIcon fontSize="large" />
          </button>
          <button
            className={`chat__pickerButton ${picker === "emoji" ? "is-active" : ""}`}
            type="button"
            aria-label="Choose an emoji"
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
            aria-label="Filter GIFs"
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
                  aria-label={`Add ${gif.label} GIF`}
                >
                  <img src={gif.url} alt={gif.label} loading="lazy" />
                  <span>{gif.label}</span>
                </button>
              ))}
            {popularGifs.filter((gif) =>
              gif.label.toLowerCase().includes(gifSearch.toLowerCase()),
            ).length === 0 && (
              <p className="chat__gifEmpty">
                No featured GIFs match that filter.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
