import React from "react";
import "./ChatHeader.css";
import NotificationsIcon from "@material-ui/icons/Notifications";
import EditLocationRounded from "@material-ui/icons/EditLocationRounded";
import PeopleAltRounded from "@material-ui/icons/PeopleAltRounded";
import SearchRoundedIcon from "@material-ui/icons/SearchRounded";
import SendRoundedIcon from "@material-ui/icons/SendRounded";
import HelpRoundedIcon from "@material-ui/icons/HelpRounded";
import CallIcon from "@material-ui/icons/Call";

const ChatHeader = ({ channelName, isDirectMessage = false, onStartCall }) => {
  return (
    <div className="chatHeader">
      <div className="chatHeader__left">
        <h3>
          <span className="chatHeader__hash">
            {isDirectMessage ? "@" : "#"}
          </span>
          {channelName}
        </h3>
      </div>

      <div className="chatHeader__right">
        <button
          className="chatHeader__callButton"
          type="button"
          onClick={onStartCall}
          aria-label={`Start a call for ${channelName || "this conversation"}`}
          title="Start a Google Meet call"
        >
          <CallIcon />
          <span>Call</span>
        </button>
        <NotificationsIcon />
        <EditLocationRounded />
        <PeopleAltRounded />

        <div className="chatHeader__search">
          <input type="text" placeholder="Search" />
          <SearchRoundedIcon />
        </div>

        <SendRoundedIcon />
        <HelpRoundedIcon />
      </div>
    </div>
  );
};

export default ChatHeader;
