import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import axios from "./axios";
import "./ChannelInvite.css";

const ChannelInvite = () => {
  const { token } = useParams();
  const history = useHistory();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let isMounted = true;
    axios
      .get(`/channel-invites/${encodeURIComponent(token)}`)
      .then((response) => {
        if (isMounted) setInvite(response.data);
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError.response?.data?.error ||
              "This invite is invalid or has expired.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const joinChannel = () => {
    setIsJoining(true);
    setError("");
    axios
      .post(`/channel-invites/${encodeURIComponent(token)}/accept`)
      .then((response) => history.replace(`/chat/${response.data.id}`))
      .catch((requestError) => {
        setError(
          requestError.response?.data?.error ||
            "Could not join this channel. Please try again.",
        );
        setIsJoining(false);
      });
  };

  return (
    <main className="channelInvite">
      <section className="channelInvite__card">
        <p className="channelInvite__eyebrow">PRIVATE CHANNEL INVITE</p>
        <h1>Join a conversation</h1>
        {invite ? (
          <>
            <p className="channelInvite__description">
              You were invited to <strong>#{invite.channelName}</strong>.
              Joining adds access to this channel only.
            </p>
            <button
              className="channelInvite__join"
              type="button"
              disabled={isJoining}
              onClick={joinChannel}
            >
              {isJoining ? "Joining…" : `Join #${invite.channelName}`}
            </button>
          </>
        ) : !error ? (
          <p className="channelInvite__description">Checking your invite…</p>
        ) : null}
        {error && (
          <p className="channelInvite__error" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
};

export default ChannelInvite;
