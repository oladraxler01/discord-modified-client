import React, { useEffect, useState } from "react";
import { Link, useHistory, useParams } from "react-router-dom";
import axios from "./axios";
import "./GroupPages.css";

const GroupInvite = () => {
  const { inviteCode } = useParams();
  const history = useHistory();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let active = true;
    axios
      .get(`/group-invites/${encodeURIComponent(inviteCode)}`)
      .then(({ data }) => {
        if (active) setInvite(data);
      })
      .catch((requestError) => {
        if (active)
          setError(
            requestError.response?.data?.error ||
              "This group invite is invalid.",
          );
      });
    return () => {
      active = false;
    };
  }, [inviteCode]);

  const joinGroup = async () => {
    setIsJoining(true);
    setError("");
    try {
      const { data } = await axios.post("/groups/join", { inviteCode });
      window.dispatchEvent(new Event("veil-groups-updated"));
      history.replace(`/groups/${data._id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || "Could not join this group.",
      );
      setIsJoining(false);
    }
  };

  return (
    <main className="group-page">
      <section className="group-page__card">
        <p className="group-page__eyebrow">VEIL GROUP INVITE</p>
        <h1>{invite?.name || "Join a private group"}</h1>
        {invite ? (
          <>
            <p className="group-page__description">
              {invite.isMember
                ? "You already belong to this group."
                : `You were invited by ${invite.creatorName}. Accepting gives access to this group only.`}
            </p>
            {invite.isMember ? (
              <Link className="group-page__action" to={`/groups/${invite.id}`}>
                Open group
              </Link>
            ) : (
              <button
                className="group-page__action"
                type="button"
                onClick={joinGroup}
                disabled={isJoining}
              >
                {isJoining ? "Joining…" : `Join ${invite.name}`}
              </button>
            )}
          </>
        ) : !error ? (
          <p className="group-page__description">Checking this invite…</p>
        ) : null}
        {error && (
          <p className="group-page__error" role="alert">
            {error}
          </p>
        )}
        <Link className="group-page__back" to="/">
          Return to Veil
        </Link>
      </section>
    </main>
  );
};

export default GroupInvite;
