import React, { useState, useEffect } from "react";
import { Avatar } from "@material-ui/core";
import DescriptionIcon from "@material-ui/icons/Description";
import GetAppIcon from "@material-ui/icons/GetApp";
import WhatshotIcon from "@material-ui/icons/Whatshot";
import LockOpenIcon from "@material-ui/icons/LockOpen";
import { usePrivacy } from "./PrivacyContext";
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
    : date.toLocaleString([], { hour: "2-digit", minute: "2-digit" });
};

const formatSize = (size) => {
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) return null;
  const bytes = Number(size);
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const Message = ({
  id,
  timestamp,
  user,
  message,
  voiceData,
  attachment,
  expireAt,
  ephemeralDuration = 10,
  isBurnActive = false,
  currentUserId,
  onExpire,
  onStartTimer,
}) => {
  const { isPrivacyMode } = usePrivacy();
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expireAt) return null;
    const diff = Math.ceil((new Date(expireAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const [isDissolving, setIsDissolving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Live countdown ticker
  useEffect(() => {
    if (!expireAt) {
      setSecondsLeft(null);
      return;
    }

    const calcRemaining = () => {
      const diff = Math.ceil((new Date(expireAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    const initial = calcRemaining();
    if (initial <= 0) {
      setSecondsLeft(0);
      setIsDissolving(true);
      const timer = setTimeout(() => {
        if (onExpire && id) onExpire(id);
      }, 500);
      return () => clearTimeout(timer);
    }

    setSecondsLeft(initial);

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      if (remaining <= 0) {
        setSecondsLeft(0);
        setIsDissolving(true);
        clearInterval(interval);
        setTimeout(() => {
          if (onExpire && id) onExpire(id);
        }, 500);
      } else {
        setSecondsLeft(remaining);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [expireAt, id, onExpire]);

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

  const isDefaultAttachmentText =
    Boolean(attachment) &&
    typeof message === "string" &&
    (message === `📎 ${attachmentName}` ||
      message === "📎 Shared a file" ||
      message === attachmentName ||
      message.trim() === "📎");

  // Calculate percentage of remaining time
  const totalDuration = Math.max(1, ephemeralDuration || 10);
  const progressPercent =
    secondsLeft !== null
      ? Math.min(100, Math.max(0, (secondsLeft / totalDuration) * 100))
      : 100;

  const handleAcceptMessageDeal = async () => {
    if (isAccepting || !onStartTimer || !id) return;
    setIsAccepting(true);
    try {
      await onStartTimer(id, totalDuration);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div
      className={`message ${isDissolving ? "message--dissolving" : ""} ${
        secondsLeft !== null ? "message--timed" : ""
      }`}
    >
      <Avatar src={user?.photo} className="message__avatar">
        {user?.displayName?.[0] || "?"}
      </Avatar>

      <div className="message__info">
        <div className="message__headerRow">
          <h4 className="message__author">
            <span className="message__authorName">{user?.displayName || "Veil user"}</span>
            <span className="message__timestamp">
              {formatTimestamp(timestamp)}
            </span>
          </h4>

          {/* Real-time Ticking Countdown Pill */}
          {secondsLeft !== null && (
            <div
              className={`message__burnPill ${
                secondsLeft <= 3 ? "message__burnPill--urgent" : ""
              }`}
              title={`This message dissolves in ${secondsLeft} seconds`}
            >
              <WhatshotIcon className="message__burnIcon" fontSize="inherit" />
              <span className="message__burnCountdown">
                {secondsLeft}s
              </span>
              <div className="message__burnTrack">
                <div
                  className="message__burnFill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

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
                    onClick={() =>
                      window.open(attachmentUrl, "_blank", "noopener,noreferrer")
                    }
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
              className={`message__gif pointer-events-none ${
                isPrivacyMode
                  ? "blur-md hover:blur-none transition-all duration-300 ease-in-out"
                  : ""
              }`}
              src={message}
              alt="Shared GIF"
              loading="lazy"
            />
          ) : !isDefaultAttachmentText && message ? (
            <p
              className={`message__text ${
                isPrivacyMode
                  ? "blur-md hover:blur-none transition-all duration-300 ease-in-out"
                  : ""
              }`}
            >
              {message}
            </p>
          ) : null}

          {/* Quick interactive trigger if message has an un-started deal */}
          {!expireAt && isBurnActive && user?.uid !== currentUserId && (
            <div className="message__acceptPrompt">
              <button
                type="button"
                className="message__acceptBtn"
                disabled={isAccepting}
                onClick={handleAcceptMessageDeal}
              >
                <LockOpenIcon fontSize="small" />
                <span>
                  {isAccepting
                    ? "Activating..."
                    : `Accept & Start ${totalDuration}s Countdown`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Message;
