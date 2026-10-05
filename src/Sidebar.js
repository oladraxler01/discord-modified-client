import React, { useState, useEffect, useCallback } from "react";
import { Link, useHistory } from "react-router-dom";
import "./Sidebar.css";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import AddIcon from "@material-ui/icons/Add";
import SidebarChannel from "./SidebarChannel";
import { Avatar } from "@material-ui/core";
import MicIcon from "@material-ui/icons/Mic";
import HeadsetIcon from "@material-ui/icons/Headset";
import SettingsIcon from "@material-ui/icons/Settings";
import { useSelector } from "react-redux";
import { selectUser } from "./features/userSlice";
import { auth } from "./firebase";
import axios from "./axios";
import Pusher from "pusher-js";
import getResponseArray from "./utils/responseArrays";

const pusher = new Pusher("e97d599fd9d4473f90d2", {
  cluster: "us2",
});

const Sidebar = ({ isOpen = false, onNavigate }) => {
  const history = useHistory();
  const user = useSelector(selectUser);
  const userId = user?.uid;
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [friendCode, setFriendCode] = useState("");
  const [friendCodeStatus, setFriendCodeStatus] = useState("loading");
  const [friendCodeError, setFriendCodeError] = useState("");
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);

  const getChannels = useCallback(() => {
    axios
      .get("/get/channelList")
      .then((res) => {
        setChannels(getResponseArray(res.data, "channels"));
      })
      .catch((err) => console.log(err));
  }, []);

  const getGroups = useCallback(() => {
    if (!userId) {
      setGroups([]);
      return;
    }

    axios
      .get(`/groups?uid=${userId}`)
      .then((res) => setGroups(getResponseArray(res.data, "groups")))
      .catch((err) => console.log(err));
  }, [userId]);

  const getDirectMessages = useCallback(() => {
    if (!userId) {
      setDirectMessages([]);
      return;
    }

    axios
      .get("/dm")
      .then((response) => {
        setDirectMessages(getResponseArray(response.data, "directMessages"));
      })
      .catch((error) => {
        console.error("Could not load direct messages:", error);
        setDirectMessages([]);
      });
  }, [userId]);

  const getFriends = useCallback(() => {
    if (!userId) {
      setFriendCode("");
      setFriendCodeStatus("loading");
      setFriendCodeError("");
      setFriends([]);
      setIncomingRequests([]);
      return;
    }

    setFriendCodeStatus("loading");
    setFriendCodeError("");
    axios
      .get("/friends")
      .then((response) => {
        const nextFriendCode = response.data?.friendCode || "";
        setFriendCode(nextFriendCode);
        setFriendCodeStatus(nextFriendCode ? "ready" : "error");
        if (!nextFriendCode) {
          setFriendCodeError("Server did not return a friend code.");
        }
        setFriends(getResponseArray(response.data, "friends"));
        setIncomingRequests(
          getResponseArray(response.data, "incomingRequests"),
        );
      })
      .catch((error) => {
        console.error("Could not load friends:", error);
        setFriendCode("");
        setFriendCodeStatus("error");
        setFriendCodeError(
          error.response?.data?.error ||
            "Could not load your friend code. Check your connection and retry.",
        );
      });
  }, [userId]);

  useEffect(() => {
    getChannels();
    getGroups();
    getDirectMessages();
    getFriends();

    const channel = pusher.subscribe("my-channel");
    const handleChannelUpdate = () => {
      getChannels();
    };
    channel.bind("my-event", handleChannelUpdate);

    return () => {
      channel.unbind("my-event", handleChannelUpdate);
      pusher.unsubscribe("my-channel");
    };
  }, [getChannels, getGroups, getDirectMessages, getFriends]);

  const handleStartDirectMessage = (recipientUid) => {
    if (!recipientUid) return;

    axios
      .post("/dm", { recipient: recipientUid })
      .then((response) => {
        getDirectMessages();
        if (onNavigate) onNavigate();
        history.push(`/dm/${response.data.id}`);
      })
      .catch((error) => {
        window.alert(
          error.response?.data?.error || "Could not start that direct message.",
        );
      });
  };

  const handleAddFriend = () => {
    const code = window.prompt("Enter your friend's friend code");
    if (!code?.trim()) return;

    axios
      .post("/friend-requests", { friendCode: code.trim() })
      .then(() => window.alert("Friend request sent."))
      .catch((error) => {
        window.alert(error.response?.data?.error || "Could not send request.");
      });
  };

  const handleCopyFriendCode = async () => {
    if (!friendCode) {
      getFriends();
      return;
    }
    try {
      await navigator.clipboard.writeText(friendCode);
      window.alert("Your friend code was copied.");
    } catch (error) {
      window.prompt("Share this friend code:", friendCode);
    }
  };

  const handleAcceptFriendRequest = (requestId) => {
    axios
      .post(`/friend-requests/${requestId}/accept`)
      .then(() => getFriends())
      .catch((error) => {
        window.alert(
          error.response?.data?.error || "Could not accept request.",
        );
      });
  };

  const handleAddChannel = (e) => {
    e.preventDefault();
    const channelName = prompt("Enter a new channel name");

    if (channelName) {
      axios
        .post("/new/channel", {
          channelName: channelName,
        })
        .then(() => {
          getChannels();
        })
        .catch((error) => {
          window.alert(
            error.response?.data?.error || "Could not create channel.",
          );
        });
    }
  };

  const handleSecureLegacyChannels = () => {
    const confirmed = window.confirm(
      "Secure existing legacy channels as private channels owned by your account? Other users will lose access until you invite them. This requires CHANNEL_MIGRATION_OWNER_UID to match your Firebase UID in the backend environment.",
    );
    if (!confirmed) return;

    axios
      .post("/channels/migrate-legacy")
      .then((response) => {
        getChannels();
        window.alert(
          `${response.data.securedCount} legacy channel(s) secured.`,
        );
      })
      .catch((error) => {
        window.alert(
          error.response?.data?.error || "Could not secure legacy channels.",
        );
      });
  };

  const handleCreateGroup = () => {
    const groupName = prompt("Enter a group name");

    if (!groupName || !user) return;

    axios
      .post("/groups", {
        name: groupName,
        creator: user,
      })
      .then(() => {
        getGroups();
      })
      .catch((err) => console.log(err));
  };

  const handleJoinGroup = () => {
    const inviteCode = prompt("Enter the invite code");

    if (!inviteCode || !user) return;

    axios
      .post("/groups/join", {
        inviteCode: inviteCode.trim().toUpperCase(),
        user,
      })
      .then(() => {
        getGroups();
      })
      .catch((err) => console.log(err));
  };

  const handleAddMemberToGroup = (groupId) => {
    const memberInput = prompt("Enter member email or UID to add to the group");

    if (!memberInput) return;

    const payload = {
      member: {
        displayName: memberInput,
        email: memberInput,
        uid: memberInput,
      },
    };

    axios
      .post(`/groups/${groupId}/members`, payload)
      .then(() => getGroups())
      .catch((err) => console.log(err));
  };

  const handleCopyInvite = async (group) => {
    const inviteLink = `${window.location.origin}/join/${group.inviteCode}`;

    try {
      await navigator.clipboard.writeText(inviteLink);
      alert(`Invite link copied for ${group.name}`);
    } catch (error) {
      alert(`Copy this invite code: ${group.inviteCode}`);
    }
  };

  const startGroupCall = () => {
    const callWindow = window.open(
      "https://meet.google.com/new",
      "_blank",
      "noopener,noreferrer",
    );

    if (!callWindow) {
      window.alert(
        "Your browser blocked the call window. Allow popups and try again.",
      );
      return;
    }

    window.alert(
      "A Google Meet room opened. Copy its link and share it with this group.",
    );
  };

  return (
    <div
      id="app-sidebar"
      className={`sidebar ${isOpen ? "sidebar--open" : ""}`}
    >
      <div className="sidebar__top">
        <h3>Clever Programmer</h3>
        <ExpandMoreIcon />
      </div>

      {/* Added flex-1 and overflow-y-auto to enable seamless vertical scrolling */}
      <div className="sidebar__channels flex-1 overflow-y-auto custom-scrollbar">
        <div className="sidebar__channelsHeader">
          <div className="sidebar__header">
            <ExpandMoreIcon />
            <h4>Text Channels</h4>
          </div>
          <div className="sidebar__channelActions">
            <button
              className="sidebar__secureLegacy"
              type="button"
              onClick={handleSecureLegacyChannels}
            >
              Secure old
            </button>
            <AddIcon
              onClick={handleAddChannel}
              className="sidebar__addChannel"
            />
          </div>
        </div>
        <div className="sidebar__channelsList">
          {channels?.map(({ id, name, isPrivate, isOwner }) => (
            <SidebarChannel
              key={id}
              id={id}
              channelName={name}
              isPrivate={isPrivate}
              isOwner={isOwner}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="sidebar__friends">
          <div className="sidebar__friendsHeader">
            <h4>Friends</h4>
            <button type="button" onClick={handleAddFriend}>
              Add friend
            </button>
          </div>
          <button
            className="sidebar__friendCode"
            type="button"
            onClick={
              friendCodeStatus === "ready" ? handleCopyFriendCode : getFriends
            }
            title="Copy your friend code"
          >
            {friendCodeStatus === "loading"
              ? "Friend code: Loading…"
              : friendCodeStatus === "error"
                ? "Friend code unavailable — Retry"
                : `Your code: ${friendCode}`}
          </button>
          {friendCodeStatus === "error" && friendCodeError && (
            <p className="sidebar__friendCodeError" role="alert">
              {friendCodeError}
            </p>
          )}
          {incomingRequests.map((request) => (
            <div className="sidebar__friendRequest" key={request.id}>
              <span>{request.sender?.displayName || "New friend"}</span>
              <button
                type="button"
                onClick={() => handleAcceptFriendRequest(request.id)}
              >
                Accept
              </button>
            </div>
          ))}
          {friends.map((friend) => (
            <button
              className="sidebar__friendRow"
              key={friend.uid}
              type="button"
              onClick={() => handleStartDirectMessage(friend.uid)}
              title={`Message ${friend.displayName}`}
            >
              <Avatar src={friend.photo} className="sidebar__dmAvatar">
                {friend.displayName?.[0] || "?"}
              </Avatar>
              <span>{friend.displayName || "Friend"}</span>
              <span className="sidebar__friendMessage">Message</span>
            </button>
          ))}
          {friends.length === 0 && incomingRequests.length === 0 && (
            <p className="sidebar__dmEmpty">Add a friend with their code</p>
          )}
        </div>

        <div className="sidebar__dms">
          <div className="sidebar__dmsHeader">
            <h4>Direct Messages</h4>
            <button
              type="button"
              onClick={handleAddFriend}
              aria-label="Add a friend"
            >
              + Friend
            </button>
          </div>
          <div className="sidebar__dmsList">
            {directMessages?.map((directMessage) => (
              <Link
                className="sidebar__dmLink"
                key={directMessage.id}
                to={`/dm/${directMessage.id}`}
                onClick={onNavigate}
              >
                <Avatar
                  className="sidebar__dmAvatar"
                  src={directMessage.otherParticipant?.photo}
                >
                  {directMessage.otherParticipant?.displayName?.[0] || "?"}
                </Avatar>
                <span>
                  {directMessage.otherParticipant?.displayName ||
                    "Unknown user"}
                </span>
              </Link>
            ))}
            {directMessages.length === 0 && (
              <p className="sidebar__dmEmpty">Start a private conversation</p>
            )}
          </div>
        </div>

        <div className="sidebar__groups">
          <div className="sidebar__groupsHeader">
            <h4>Groups</h4>
            <div className="sidebar__groupsActions">
              <button type="button" onClick={handleCreateGroup}>
                + Group
              </button>
              <button type="button" onClick={handleJoinGroup}>
                Join
              </button>
            </div>
          </div>

          {groups?.map((group) => (
            <div
              className="sidebar__groupItem"
              key={group._id || group.inviteCode}
            >
              <div className="sidebar__groupInfo">
                <strong>{group.name}</strong>
                <span>{group.inviteCode}</span>
              </div>
              <div className="sidebar__groupButtons">
                <button type="button" onClick={startGroupCall}>
                  Call
                </button>
                <button type="button" onClick={() => handleCopyInvite(group)}>
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddMemberToGroup(group._id || group.inviteCode)
                  }
                >
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sidebar__profile">
        <Avatar src={user.photo} onClick={() => auth.signOut()} />
        <div className="sidebar__profileInfo">
          <h3>{user.displayName}</h3>
          <p>#{user.uid.substring(0, 5)}</p>
        </div>

        <div className="sidebar__profileIcons">
          <MicIcon />
          <HeadsetIcon />
          <SettingsIcon />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
