import React, { useMemo } from "react";
import "./SidebarMedia.css";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|avif)(?:[?#].*)?$/i;
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv)(?:[?#].*)?$/i;
const IMAGE_MIME = /^image\//i;
const VIDEO_MIME = /^video\//i;
const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

const getExtension = (name = "") =>
  name.split(".").pop()?.toLowerCase() || "file";
const formatSize = (size) => {
  if (!Number.isFinite(Number(size)) || Number(size) <= 0) return "Shared link";
  const bytes = Number(size);
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mediaFromMessage = (message, index) => {
  const result = [];
  const attachment = message?.attachment;
  if (attachment) {
    const url = attachment.dataUrl || attachment.url || attachment.href || "";
    const name = attachment.name || `Attachment ${index + 1}`;
    const type = attachment.type || "";
    const item = {
      id: message._id || `${index}-${name}`,
      name,
      url,
      type,
      size: attachment.size,
    };
    if (
      VIDEO_MIME.test(type) ||
      VIDEO_EXTENSIONS.test(name) ||
      VIDEO_EXTENSIONS.test(url)
    ) {
      result.push({ ...item, category: "video" });
    } else if (
      IMAGE_MIME.test(type) ||
      IMAGE_EXTENSIONS.test(name) ||
      IMAGE_EXTENSIONS.test(url)
    ) {
      result.push({ ...item, category: "image" });
    } else {
      result.push({ ...item, category: "file" });
    }
  }

  const text = typeof message?.message === "string" ? message.message : "";
  const links = text.match(URL_PATTERN) || [];
  links.forEach((url, linkIndex) => {
    if (attachment && (attachment.url === url || attachment.dataUrl === url))
      return;
    const cleanUrl = url.replace(/[),.!?]+$/, "");
    if (IMAGE_EXTENSIONS.test(cleanUrl)) {
      result.push({
        id: `${message._id || index}-image-${linkIndex}`,
        name: cleanUrl.split("/").pop(),
        url: cleanUrl,
        category: "image",
        type: "image/link",
      });
    } else if (VIDEO_EXTENSIONS.test(cleanUrl)) {
      result.push({
        id: `${message._id || index}-video-${linkIndex}`,
        name: cleanUrl.split("/").pop(),
        url: cleanUrl,
        category: "video",
        type: "video/link",
      });
    } else {
      const pathParts = cleanUrl
        .replace(/^https?:\/\/[^/]+/i, "")
        .split("/")
        .filter(Boolean);
      const linkName = pathParts.pop() || cleanUrl.replace(/^https?:\/\//i, "");
      result.push({
        id: `${message._id || index}-link-${linkIndex}`,
        name: linkName,
        url: cleanUrl,
        category: "file",
        type: "link",
      });
    }
  });
  return result;
};

const SidebarMedia = ({ messages = [], isOpen = false }) => {
  const media = useMemo(() => messages.flatMap(mediaFromMessage), [messages]);
  const videos = media.filter((item) => item.category === "video");
  const images = media.filter((item) => item.category === "image");
  const files = media.filter((item) => item.category === "file");

  const openItem = (item) => {
    if (item.url) window.open(item.url, "_blank", "noopener,noreferrer");
  };

  const emptyState = (
    <p className="sidebar-media__empty">No media uploaded yet</p>
  );
  return (
    <aside
      id="shared-media-panel"
      className={`app-rail ${isOpen ? "is-open" : ""}`}
      aria-label="Shared media"
    >
      <section className="app-rail__panel">
        <h3 className="app-rail__header">
          <span aria-hidden="true">◫</span> Videos
        </h3>
        <div className="app-rail__grid app-rail__grid--two">
          {videos.map((item) => (
            <button
              className="app-rail__mediaCard app-rail__mediaCard--video"
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              disabled={!item.url}
            >
              {item.url && (
                <video
                  src={item.url}
                  muted
                  preload="metadata"
                  aria-hidden="true"
                />
              )}
              <span>{item.name}</span>
              <small>{formatSize(item.size)}</small>
            </button>
          ))}
          {videos.length === 0 && emptyState}
        </div>
      </section>
      <section className="app-rail__panel">
        <h3 className="app-rail__header">
          <span aria-hidden="true">◧</span> Images
        </h3>
        <div className="app-rail__imageGrid">
          {images.map((item) => (
            <button
              className="app-rail__image"
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              title={item.name}
            >
              <img src={item.url} alt={item.name} loading="lazy" />
            </button>
          ))}
          {images.length === 0 && emptyState}
        </div>
      </section>
      <section className="app-rail__panel">
        <h3 className="app-rail__header">
          <span aria-hidden="true">▣</span> Files
        </h3>
        <div className="app-rail__fileList">
          {files.map((item) => (
            <button
              className="app-rail__fileItem"
              key={item.id}
              type="button"
              onClick={() => openItem(item)}
              disabled={!item.url}
            >
              <span
                className={`app-rail__fileBadge app-rail__fileBadge--${getExtension(item.name)}`}
                aria-hidden="true"
              >
                {getExtension(item.name).slice(0, 3).toUpperCase()}
              </span>
              <span className="app-rail__fileDetails">
                <strong>{item.name}</strong>
                <small>{formatSize(item.size)}</small>
              </span>
            </button>
          ))}
          {files.length === 0 && emptyState}
        </div>
      </section>
    </aside>
  );
};

export default SidebarMedia;
