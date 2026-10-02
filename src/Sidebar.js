import React, { useState, useEffect, useCallback } from "react";
import "./Sidebar.css";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import AddIcon from "@material-ui/icons/Add";
import SidebarChannel from "./SidebarChannel";
import SignalCellularAltIcon from "@material-ui/icons/SignalCellularAlt";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
import CallIcon from "@material-ui/icons/Call";
import { Avatar } from "@material-ui/core";
import MicIcon from "@material-ui/icons/Mic";
import HeadsetIcon from "@material-ui/icons/Headset";
import SettingsIcon from "@material-ui/icons/Settings";
import { useSelector } from "react-redux";
import { selectUser } from "./features/userSlice";
import { auth } from "./firebase"; // Removed 'db' since we use Mongo now
import axios from "./axios";
import Pusher from "pusher-js";

const pusher = new Pusher("e97d599fd9d4473f90d2", {
  cluster: "us2",
});

const Sidebar = () => {
  const user = useSelector(selectUser);
  const userId = user?.uid;
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);

  const getChannels = useCallback(() => {
    axios
      .get("/get/channelList")
      .then((res) => {
        setChannels(res.data);
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
      .then((res) => setGroups(res.data))
      .catch((err) => console.log(err));
  }, [userId]);

  useEffect(() => {
    getChannels();
    getGroups();

    const channel = pusher.subscribe("my-channel");
    const handleChannelUpdate = () => {
      getChannels();
    };
    channel.bind("my-event", handleChannelUpdate);

    return () => {
      channel.unbind("my-event", handleChannelUpdate);
      pusher.unsubscribe("my-channel");
    };
  }, [getChannels, getGroups]);

  // FIXED: Now sends data to your Node/Mongo backend instead of Firebase
  const handleAddChannel = (e) => {
    e.preventDefault();
    const channelName = prompt("Enter a new channel name");

    if (channelName) {
      axios
        .post("/new/channel", {
          channelName: channelName,
        })
        .then(() => {
          // Refresh the channel list immediately after adding
          getChannels();
        });
    }
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

  return (
    <div className="sidebar">
      <div className="sidebar__top">
        <h3>Clever Programmer</h3>
        <ExpandMoreIcon />
      </div>

      <div className="sidebar__channels">
        <div className="sidebar__channelsHeader">
          <div className="sidebar__header">
            <ExpandMoreIcon />
            <h4>Text Channels</h4>
          </div>
          <AddIcon onClick={handleAddChannel} className="sidebar__addChannel" />
        </div>
        <div className="sidebar__channelsList">
          {/* FIXED: Mapped to match your backend's { id, name } structure */}
          {channels.map(({ id, name }) => (
            <SidebarChannel key={id} id={id} channelName={name} />
          ))}
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

          {groups.map((group) => (
            <div
              className="sidebar__groupItem"
              key={group._id || group.inviteCode}
            >
              <div className="sidebar__groupInfo">
                <strong>{group.name}</strong>
                <span>{group.inviteCode}</span>
              </div>
              <div className="sidebar__groupButtons">
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

      <div className="sidebar__voice">
        <SignalCellularAltIcon
          className="sidebar__voiceIcons"
          fontSize="large"
        />
        <div className="sidebar__voiceInfo">
          <h3>Voice Connected</h3>
          <p>Stream</p>
        </div>
        <div className="sidebar__voiceIcons">
          <InfoOutlinedIcon />
          <CallIcon />
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
