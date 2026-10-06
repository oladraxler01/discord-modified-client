import React, { useEffect, useState } from "react";
import firebase from "firebase";
import "./Login.css";
import { auth, provider } from "./firebase";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";

const GoogleIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="login__googleIcon"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const VeilMonogram = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="login__brandIcon"
  >
    <rect x="2" y="3" width="7" height="26" rx="3.5" fill="#241b2c" />
    <path
      d="M13 13C13 7.47715 17.4772 3 23 3H25C28.3137 3 31 5.68629 31 9V23C31 26.3137 28.3137 29 25 29H23C17.4772 29 13 24.5228 13 19V13Z"
      fill="#241b2c"
    />
    <circle cx="22" cy="16" r="3.5" fill="#ffffff" />
  </svg>
);

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
  const [showPassword, setShowPassword] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    signIn();
  };

  return (
    <div className="login-fullscreen">
      <div className="login-container">
        {/* Left Section: Form & Auth */}
        <section className="login__formSection">
          <div className="login__formWrapper">
            {/* Brand Logo */}
            <div className="login__brand">
              <VeilMonogram />
              <span className="login__brandName">Veil.</span>
            </div>

            {/* Header Titles */}
            <div className="login__heading">
              <h1>Welcome Back</h1>
              <p>Lift the veil to enter your private conversations.</p>
            </div>

            {/* Continue with Google button */}
            <div className="login__socialAuth">
              <button
                className="login__googleBtn"
                onClick={signIn}
                disabled={isSigningIn}
                type="button"
                aria-label="Continue with Google"
              >
                <GoogleIcon />
                <span>{isSigningIn ? "Connecting with Google…" : "Continue with Google"}</span>
              </button>
            </div>

            {/* Elegant Divider */}
            <div className="login__divider" role="separator">
              <span>Or</span>
            </div>

            {/* Interactive Form Linked to Firebase Auth */}
            <form onSubmit={handleFormSubmit} className="login__fieldsForm">
              <div className="login__inputGroup">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="email"
                />
              </div>

              <div className="login__inputGroup">
                <label htmlFor="login-password">Password</label>
                <div className="login__passwordWrapper">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login__passwordToggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </button>
                </div>
              </div>

              <div className="login__optionsRow">
                <label className="login__checkboxLabel">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="login__forgotLink"
                  onClick={signIn}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                className="login__submitBtn"
                type="submit"
                disabled={isSigningIn}
              >
                {isSigningIn ? "Signing In…" : "Login"}
              </button>
            </form>

            {error && (
              <div className="login__error" role="alert">
                {error}
              </div>
            )}

            <div className="login__footer">
              <p>
                Don&apos;t have an account?{" "}
                <button type="button" onClick={signIn} className="login__footerLink">
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        </section>

        {/* Right Section: Artistic Reveal Card with Arched Cut-out */}
        <section className="login__visualSection" aria-label="Veil reveal showcase">
          <div className="login__archCard">
            <img
              src="/veil-reveal.jpg"
              alt="Translucent veil parting in the morning light revealing a calm sanctuary"
              className="login__archImage"
              loading="eager"
            />
            <div className="login__archOverlay" />
            <div className="login__archContent">
              <h2>
                Behind the veil lies your private community.
              </h2>
              <p>
                Encrypted channels, direct messages, and sovereign voice spaces.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
