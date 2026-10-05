import { Button } from "@material-ui/core";
import React, { useEffect, useState } from "react";
import firebase from "firebase";
import "./Login.css";
import { auth, provider } from "./firebase";

const describeAuthError = (authError) => {
  const code = authError?.code || "unknown";

  if (code === "auth/unauthorized-domain") {
    return `This website domain is not authorized by Firebase (${window.location.hostname}). Add it in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is disabled for this Firebase project. Enable Google under Firebase Console → Authentication → Sign-in method.";
  }
  if (
    code === "auth/popup-blocked" ||
    code === "auth/web-storage-unsupported"
  ) {
    return "Your browser blocked the sign-in popup. Switching to a redirect sign-in…";
  }
  if (code === "auth/popup-closed-by-user") {
    return "The sign-in window was closed before finishing. Please try again.";
  }
  return `${authError?.message || "Sign-in failed."} (Firebase code: ${code})`;
};

const Login = () => {
  const [error, setError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    auth.getRedirectResult().catch((redirectError) => {
      setError(describeAuthError(redirectError));
    });
  }, []);

  const signIn = async () => {
    setError("");
    setIsSigningIn(true);

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      await auth.signInWithPopup(provider);
    } catch (authError) {
      const code = authError?.code || "";
      if (
        code === "auth/popup-blocked" ||
        code === "auth/web-storage-unsupported"
      ) {
        setError(describeAuthError(authError));
        try {
          await auth.signInWithRedirect(provider);
          return;
        } catch (redirectError) {
          setError(describeAuthError(redirectError));
        }
      } else {
        setError(describeAuthError(authError));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="login">
      <div className="login__shell">
        <div className="login__left">
          <div className="login__brand">
            <div className="login__mark">V</div>
            <div className="login__wordmark">
              <span>Veil</span>
            </div>
          </div>

          <div className="login__welcome">
            <p className="login__eyebrow">Welcome back</p>
            <h1>Secure your conversations.</h1>
            <p className="login__subtext">
              Jump into communities, direct messages, voice notes, and shared
              files in a cleaner, calmer workspace.
            </p>
          </div>

          <div className="login__actions">
            <Button
              className="login__button"
              onClick={signIn}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Connecting…" : "Continue with Google"}
            </Button>

            {error && (
              <p className="login__error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="login__meta" aria-label="Veil features">
            <div>
              <span>Private</span>
              <strong>DMs</strong>
            </div>
            <div>
              <span>Shared</span>
              <strong>Files</strong>
            </div>
            <div>
              <span>Live</span>
              <strong>Rooms</strong>
            </div>
          </div>
        </div>

        <div className="login__visual" aria-label="Veil preview card">
          <div className="login__visualCard">
            <div className="login__visualGlow" />
            <div className="login__visualContent">
              <span>Browse thousands of properties</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
