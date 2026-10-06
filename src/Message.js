import React from "react";
import { Avatar } from "@material-ui/core";
import DescriptionIcon from "@material-ui/icons/Description";
import GetAppIcon from "@material-ui/icons/GetApp";
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

const formatSize = (size) => {
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) return null;
  const bytes = Number(size);
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Message = ({ timestamp, user, message, voiceData, attachment }) => {
  const isGif =
    typeof message === "string" &&
    /^https?:\/\/.+\.gif(?:\?.*)?$/i.test(message);

  const attachmentUrl = attachment?.dataUrl || attachment?.url || "";
  const attachmentName = attachment?.name || "attachment";
  const attachmentType = attachment?.type || "";

  const isImageAttachment =
    attachmentType.startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(attachmentName) ||
    attachmentUrl.startsWith("data:image/") ||
    /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i.test(attachmentUrl);

  const isVideoAttachment =
    attachmentType.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|ogv)$/i.test(attachmentName) ||
    attachmentUrl.startsWith("data:video/") ||
    /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i.test(attachmentUrl);

  // Check if text is just the default placeholder generated when attaching a file
  const isDefaultAttachmentText =
    Boolean(attachment) &&
    typeof message === "string" &&
    (message === `📎 ${attachmentName}` ||
      message === "📎 Shared a file" ||
      message === attachmentName ||
      message.trim() === "📎");

  return (
    <div className="message">
      <Avatar src={user?.photo}>
        {user?.displayName?.[0] || "?"}
      </Avatar>
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

          {attachment && attachmentUrl ? (
            <div className="message__attachmentBlock">
              {isImageAttachment ? (
                <div className="message__imageContainer">
                  <img
                    className="message__attachmentImage"
                    src={attachmentUrl}
                    alt={attachmentName}
                    loading="lazy"
                    onClick={() => window.open(attachmentUrl, "_blank", "noopener,noreferrer")}
                  />
                </div>
              ) : isVideoAttachment ? (
                <div className="message__videoContainer">
                  <video
                    className="message__attachmentVideo"
                    controls
                    playsInline
                    preload="metadata"
                    src={attachmentUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <span className="message__videoLabel">{attachmentName}</span>
                </div>
              ) : (
                <a
                  className="message__attachmentLink"
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={attachmentName}
                  title={`Download ${attachmentName}`}
                >
                  <div className="message__attachmentBadge">
                    <DescriptionIcon fontSize="small" />
                  </div>
                  <div className="message__attachmentMeta">
                    <strong className="message__attachmentTitle">
                      {attachmentName}
                    </strong>
                    {formatSize(attachment?.size) && (
                      <small className="message__attachmentSize">
                        {formatSize(attachment.size)}
                      </small>
                    )}
                  </div>
                  <div className="message__attachmentDownload">
                    <GetAppIcon fontSize="small" />
                  </div>
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
          ) : !isDefaultAttachmentText && message ? (
            <p>{message}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default Message;
