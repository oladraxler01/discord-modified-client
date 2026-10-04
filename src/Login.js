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
      <div className="login__logo">
        <img
          src="https://www.freepnglogos.com/uploads/discord-logo-png/discord-logo-logodownload-download-logotipos-1.png"
          alt="discord logo"
        />
      </div>

      <Button onClick={signIn} disabled={isSigningIn}>
        {isSigningIn ? "Signing in…" : "Sign in with Google"}
      </Button>
      {error && (
        <p className="login__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Login;
