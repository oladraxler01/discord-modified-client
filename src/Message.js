import { Avatar } from "@material-ui/core";
import React, { useState, useEffect } from "react";
import "./Message.css";
import axios from "./axios"; // Ensures we use your configured Axios instance

const formatTimestamp = (timestamp) => {
  if (timestamp === undefined || timestamp === null || timestamp === "") {
    return "Time unavailable";
  }

  // Older messages stored epoch milliseconds as strings, which Date parses as invalid.
  const value =
    typeof timestamp === "string" && /^\d+$/.test(timestamp)
      ? Number(timestamp)
      : timestamp;
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString();
};

// NOTICE: Added 'id' to the props here so we know which message to delete!
const Message = ({ id, timestamp, user, message, voiceData }) => {
  const [isViewing, setIsViewing] = useState(false);
  const [hasBeenViewed, setHasBeenViewed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isDestroyed, setIsDestroyed] = useState(false);

  const isGif =
    typeof message === "string" &&
    /^https?:\/\/.+\.gif(?:\?.*)?$/i.test(message);

  // Burn-on-Read Timer Logic
  useEffect(() => {
    let timer;
    if (hasBeenViewed && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && !isDestroyed) {
      setIsDestroyed(true);
      // Trigger backend deletion when the timer hits zero
      if (id) {
        axios.delete(`/api/messages/${id}`).catch(err => console.error("Failed to delete message:", err));
      }
    }
    return () => clearInterval(timer);
  }, [hasBeenViewed, timeLeft, id, isDestroyed]);

  const handleReveal = () => {
    setIsViewing(true);
    setHasBeenViewed(true);
  };

  // If the message has burned, completely remove it from the UI
  if (isDestroyed) return null;

  return (
    <div className="message relative flex items-start p-5 mb-2 hover:bg-black/20 transition-colors">
      <Avatar src={user?.photo} />
      <div className="message__info ml-4 flex-1">
        <h4 className="flex items-center text-white">
          {user?.displayName}
          <span className="message__timestamp text-gray-400 text-xs ml-2">
            {formatTimestamp(timestamp)}
          </span>
        </h4>

        {/* Hold-to-Reveal Wrapper */}
        <div
          className={`mt-1 transition-all duration-300 select-none cursor-pointer ${
            !isViewing
              ? 'blur-md opacity-50 bg-white/10 rounded px-2 py-1 inline-block'
              : 'blur-none opacity-100'
          }`}
          onMouseDown={handleReveal}
          onMouseUp={() => setIsViewing(false)}
          onMouseLeave={() => setIsViewing(false)}
          onTouchStart={handleReveal}
          onTouchEnd={() => setIsViewing(false)}
          onContextMenu={(e) => e.preventDefault()} // Blocks right-click stealing
        >
          {voiceData ? (
            <div className="message__audioWrap">
              <audio controls src={voiceData} className="message__audio pointer-events-none" />
            </div>
          ) : null}

          {isGif ? (
            <img
              className="message__gif pointer-events-none"
              src={message}
              alt="Shared GIF"
              loading="lazy"
            />
          ) : (
            <p className={!isViewing ? 'text-transparent' : 'text-gray-100'}>{message}</p>
          )}
        </div>
      </div>

      {/* The Countdown Fuse */}
      {hasBeenViewed && (
        <div className="absolute right-5 top-5 text-red-500 font-bold text-sm bg-black/40 px-2 py-1 rounded backdrop-blur-md">
          00:{timeLeft.toString().padStart(2, '0')}
        </div>
      )}
    </div>
  );
};

export default Message;
