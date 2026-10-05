import { Avatar } from "@material-ui/core";
import React from "react";
import "./Message.css";

const formatTimestamp = (timestamp) => {
  if (timestamp === undefined || timestamp === null || timestamp === "") {
    return "Time unavailable";
  }

  const value =
    typeof timestamp === "string" && /^\d+$/.test(timestamp)
      ? Number(timestamp)
      : timestamp;
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString();
};

const Message = ({ timestamp, user, message, voiceData, attachment }) => {
  const isGif =
    typeof message === "string" &&
    /^https?:\/\/.+\.gif(?:\?.*)?$/i.test(message);

  const attachmentIsImage =
    attachment?.type?.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment?.name || "");

  return (
    <div className="message">
      <Avatar src={user?.photo} />
      <div className="message__info">
        <h4 className="message__author">
          <span>{user?.displayName || "Veil user"}</span>
          <span className="message__timestamp">
            {formatTimestamp(timestamp)}
          </span>
        </h4>

        <div className="message__content">
          {voiceData ? (
            <div className="message__audioWrap">
              <audio
                controls
                src={voiceData}
                className="message__audio pointer-events-none"
              />
            </div>
          ) : null}

          {attachment ? (
            <div className="message__attachmentBlock">
              {attachmentIsImage ? (
                <img
                  className="message__attachmentImage"
                  src={attachment.dataUrl}
                  alt={attachment.name}
                  loading="lazy"
                />
              ) : (
                <a
                  className="message__attachmentLink"
                  href={attachment.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachment.name}
                >
                  <span
                    className="message__attachmentIcon"
                    role="img"
                    aria-label="paperclip emoji"
                  >
                    📎
                  </span>
                  {attachment.name}
                </a>
              )}
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
            <p>{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
