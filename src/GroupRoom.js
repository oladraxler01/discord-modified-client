import React, { useCallback, useEffect, useState } from "react";
import { Avatar, Button } from "@material-ui/core";
import { Link, useParams } from "react-router-dom";
import axios from "./axios";
import { useSelector } from "react-redux";
import { selectUser } from "./features/userSlice";
import "./GroupPages.css";

const GroupRoom = () => {
  const { groupId } = useParams();
  const user = useSelector(selectUser);
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");

  const loadGroup = useCallback(() => {
    setError("");
    axios
      .get(`/groups/${encodeURIComponent(groupId)}`)
      .then(({ data }) => setGroup(data))
      .catch((requestError) => {
        setGroup(null);
        setError(
          requestError.response?.data?.error ||
            "You do not have access to this group.",
        );
      });
  }, [groupId]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const copyInvite = async () => {
    const link = `${window.location.origin}/join/${encodeURIComponent(group.inviteCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      window.alert("Group-specific invite link copied.");
    } catch (copyError) {
      window.prompt("Copy this group invite link:", link);
    }
  };

  const addMember = async () => {
    const member = window.prompt("Enter the member's Firebase UID or email");
    if (!member?.trim()) return;
    try {
      await axios.post(`/groups/${group._id}/members`, {
        member: { uid: member.trim(), email: member.trim() },
      });
      loadGroup();
    } catch (requestError) {
      window.alert(
        requestError.response?.data?.error || "Could not add that member.",
      );
    }
  };

  const startCall = () => {
    const callWindow = window.open(
      "https://meet.google.com/new",
      "_blank",
      "noopener,noreferrer",
    );
    if (!callWindow) window.alert("Allow pop-ups to start a call.");
  };

  return (
    <main className="group-page group-page--room">
      <section className="group-page__card">
        <div className="group-page__topline">
          <p className="group-page__eyebrow">PRIVATE VEIL GROUP</p>
          <Link to="/">Back to chat</Link>
        </div>
        {error ? (
          <p className="group-page__error" role="alert">
            {error}
          </p>
        ) : !group ? (
          <p className="group-page__description">Loading this group…</p>
        ) : (
          <>
            <h1>{group.name}</h1>
            <p className="group-page__description">
              This group has its own membership and invite link. Only listed
              members can open its group page.
            </p>
            <div className="group-page__actions">
              <Button variant="contained" color="primary" onClick={copyInvite}>
                Share group invite
              </Button>
              <Button variant="outlined" onClick={startCall}>
                Start group call
              </Button>
              {group.creator?.uid === user?.uid && (
                <Button variant="outlined" onClick={addMember}>
                  Add member
                </Button>
              )}
            </div>
            <h2>
              Members <span>{group.members?.length || 0}</span>
            </h2>
            <div className="group-page__members">
              {group.members?.map((member) => (
                <div className="group-page__member" key={member.uid}>
                  <Avatar src={member.photo}>
                    {member.displayName?.[0] || "?"}
                  </Avatar>
                  <div>
                    <strong>{member.displayName || "Veil user"}</strong>
                    <small>
                      {member.uid === group.creator?.uid
                        ? "Group creator"
                        : "Member"}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default GroupRoom;
