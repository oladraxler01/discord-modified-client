import React from "react";
import { Link } from "react-router-dom";
import "./SidebarChannel.css";

const SidebarChannel = ({ id, channelName }) => {
  const copyRoomLink = async () => {
    const roomLink = `${window.location.origin}/chat/${encodeURIComponent(id)}`;

    try {
      await navigator.clipboard.writeText(roomLink);
      alert(`Chat link copied for #${channelName}`);
    } catch (error) {
      window.prompt("Copy this chat link:", roomLink);
    }
  };

  return (
    <div className="sidebarChannel">
      <Link
        className="sidebarChannel__link"
        to={`/chat/${encodeURIComponent(id)}`}
      >
        <h4>
          <span className="sidebarChannel__hash">#</span>
          {channelName}
        </h4>
      </Link>
      <button
        className="sidebarChannel__copy"
        type="button"
        onClick={copyRoomLink}
        aria-label={`Copy link to ${channelName}`}
      >
        Copy link
      </button>
    </div>
  );
};

export default SidebarChannel;
