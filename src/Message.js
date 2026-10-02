import { Avatar } from "@material-ui/core";
import React from "react";
import "./Message.css";

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

const Message = ({ timestamp, user, message, voiceData }) => {
  const isGif =
    typeof message === "string" &&
    /^https?:\/\/.+\.gif(?:\?.*)?$/i.test(message);

  return (
    <div className="message">
      {/* Added optional chaining (?.) to prevent crashes if user data is missing */}
      <Avatar src={user?.photo} />
      <div className="message__info">
        <h4>
          {user?.displayName}
          <span className="message__timestamp">
            {formatTimestamp(timestamp)}
          </span>
        </h4>

        {voiceData ? (
          <div className="message__audioWrap">
            <audio controls src={voiceData} className="message__audio" />
          </div>
        ) : null}

        {isGif ? (
          <img
            className="message__gif"
            src={message}
            alt="Shared GIF"
            loading="lazy"
          />
        ) : (
          <p>{message}</p>
        )}
      </div>
    </div>
  );
};

export default Message;
