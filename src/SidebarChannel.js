import React from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "./axios";
import "./SidebarChannel.css";

const SidebarChannel = ({
  id,
  channelName,
  isPrivate,
  isOwner,
  onNavigate,
}) => {
  const location = useLocation();
  const isActive = location.pathname === `/chat/${encodeURIComponent(id)}`;

  const createInvite = async () => {
    try {
      const response = await axios.post(`/channels/${id}/invites`);
      const inviteLink = `${window.location.origin}/invite/${response.data.token}`;
      await navigator.clipboard.writeText(inviteLink);
      window.alert(`Seven-day invite link copied for #${channelName}`);
    } catch (error) {
      const responseError = error.response?.data?.error;
      window.alert(
        responseError || "Could not create or copy the invite link.",
      );
    }
  };

  return (
    <div className="sidebarChannel">
      <Link
        className={`sidebarChannel__link ${isActive ? "is-active" : ""}`}
        to={`/chat/${encodeURIComponent(id)}`}
        onClick={onNavigate}
      >
        <h4>
          <span className="sidebarChannel__hash">#</span>
          {channelName}
        </h4>
      </Link>
      {isPrivate && isOwner && (
        <button
          className="sidebarChannel__copy"
          type="button"
          onClick={createInvite}
          aria-label={`Create invite to ${channelName}`}
        >
          Invite
        </button>
      )}
    </div>
  );
};

export default SidebarChannel;
