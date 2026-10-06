import React, { useState } from "react";
import { Avatar, Button, TextField } from "@material-ui/core";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { selectUser, updateDisplayName } from "./features/userSlice";
import { auth } from "./firebase";
import { usePrivacy } from "./PrivacyContext";
import "./Settings.css";

const Settings = () => {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const { isPrivacyMode, togglePrivacyMode } = usePrivacy();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const saveDisplayName = async (event) => {
    event.preventDefault();
    const nextName = displayName.trim();
    if (!nextName || !auth.currentUser) return;
    setSaving(true);
    setStatus("");
    try {
      await auth.currentUser.updateProfile({ displayName: nextName });
      dispatch(updateDisplayName(nextName));
      setStatus("Display name updated.");
    } catch (error) {
      setStatus(error.message || "Could not update your display name.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <div>
          <p>VEIL ACCOUNT</p>
          <h1>Settings</h1>
        </div>
        <Link to="/" className="settings-page__back">
          Back to chat
        </Link>
      </header>
      <section className="settings-card">
        <div className="settings-card__identity">
          <Avatar className="settings-card__avatar" src={user?.photo}>
            {user?.displayName?.[0] || "V"}
          </Avatar>
          <div>
            <h2>{user?.displayName || "Veil user"}</h2>
            <p>{user?.email || "Email unavailable"}</p>
          </div>
        </div>
        <form onSubmit={saveDisplayName} className="settings-card__form">
          <TextField
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            variant="outlined"
            fullWidth
            inputProps={{ maxLength: 80 }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={saving || !displayName.trim()}
          >
            {saving ? "Saving…" : "Save name"}
          </Button>
          {status && (
            <p className="settings-card__status" role="status">
              {status}
            </p>
          )}
        </form>

        {/* Privacy Section */}
        <section className="settings-card__privacySection">
          <div className="settings-card__privacyHeader">
            <h2>Privacy</h2>
          </div>
          <div className="settings-card__privacyControl">
            <div className="settings-card__toggleRow">
              <span className="settings-card__toggleTitle">Anti-Shoulder Surfing Mode</span>
              <label className="settings-card__switch">
                <input
                  type="checkbox"
                  checked={isPrivacyMode}
                  onChange={togglePrivacyMode}
                  aria-label="Toggle Anti-Shoulder Surfing Mode"
                />
                <span className="settings-card__slider" />
              </label>
            </div>
            <p className="settings-card__privacyNote">
              Anti-Shoulder Surfing Mode: Blurs all chat messages to protect your screen from onlookers. Simply hover your mouse over an individual message to temporarily reveal it.
            </p>
          </div>
        </section>

        <dl className="settings-card__details">
          <div>
            <dt>Email</dt>
            <dd>{user?.email || "—"}</dd>
          </div>
          <div>
            <dt>Firebase / Mongo profile UID</dt>
            <dd>{user?.uid || "—"}</dd>
          </div>
          <div>
            <dt>Profile source</dt>
            <dd>
              Firebase Authentication; server-side friend profile is keyed by
              this UID.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
};

export default Settings;
