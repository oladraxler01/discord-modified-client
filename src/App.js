import React, { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import Sidebar from "./Sidebar";
import Chat from "./Chat";
import ChannelInvite from "./ChannelInvite";
import { selectUser } from "./features/userSlice";
import { useDispatch, useSelector } from "react-redux";
import Login from "./Login";
import { auth } from "./firebase";
import { login, logout } from "./features/userSlice";
import { Route, Switch } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";
import SidebarMedia from "./SidebarMedia";
import Settings from "./Settings";
import { useTheme } from "./ThemeContext";

function App() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const location = useLocation();
  const { currentTheme } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [activeMessages, setActiveMessages] = useState([]);
  const chatActions = useRef(null);
  const registerChatActions = useCallback((actions) => {
    chatActions.current = actions;
  }, []);

  // Panic Button Listener
  useEffect(() => {
    let lastEscapeTime = 0;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        const currentTime = new Date().getTime();
        // Detect double-tap within 500ms
        if (currentTime - lastEscapeTime < 500) {
          setPanicMode(true);
          // Disguise the browser tab
          document.title = "Google";
          const favicon = document.querySelector("link[rel~='icon']");
          if (favicon) {
            favicon.href = "https://www.google.com/favicon.ico";
          }
        }
        lastEscapeTime = currentTime;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      if (authUser) {
        dispatch(
          login({
            uid: authUser.uid,
            photo: authUser.photoURL,
            email: authUser.email,
            displayName: authUser.displayName,
          }),
        );
      } else {
        dispatch(logout());
      }
    });

    return unsubscribe;
  }, [dispatch]);

  // Instantly unmount the real app and show a fake screen if panicked
  if (panicMode) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: "8rem",
        }}
      >
        <img
          src="https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
          alt="Google"
          style={{ width: "256px", marginBottom: "2rem" }}
        />
        <input
          type="text"
          style={{
            width: "50%",
            maxWidth: "500px",
            border: "1px solid #dfe1e5",
            borderRadius: "24px",
            padding: "12px 20px",
            outline: "none",
            boxShadow: "0 1px 6px rgba(32,33,36,.28)",
          }}
        />
      </div>
    );
  }

  return (
    <div className="app" data-theme={currentTheme}>
      {user ? (
        <div className="app-shell">
          <div className="app__mobileBar">
            <button
              className="app__menuButton"
              type="button"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
              onClick={() => {
                setIsMediaOpen(false);
                setIsSidebarOpen((open) => !open);
              }}
            >
              <span aria-hidden="true">☰</span>
              <span>Channels</span>
            </button>
            <button
              className={`app__menuButton app__menuButton--media ${isMediaOpen ? "is-active" : ""}`}
              type="button"
              aria-expanded={isMediaOpen}
              aria-controls="shared-media-panel"
              onClick={() => {
                setIsSidebarOpen(false);
                setIsMediaOpen((open) => !open);
              }}
            >
              <span aria-hidden="true">▣</span>
              <span>Shared files</span>
            </button>
          </div>

          <nav className="app-nav" aria-label="Primary navigation">
            <Link className={`app-nav__button ${location.pathname === "/" || location.pathname.startsWith("/chat/") || location.pathname.startsWith("/dm/") ? "is-active" : ""}`} to="/" aria-label="Messages" title="Messages">
              ◌
            </Link>
            <button className="app-nav__button" type="button" aria-label="Search messages" title="Search messages" onClick={() => chatActions.current?.focusSearch()}>
              ⌕
            </button>
            <button className="app-nav__button" type="button" aria-label="Start call" title="Start call" onClick={() => chatActions.current?.startCall()}>
              ☎
            </button>
            <Link className={`app-nav__button ${location.pathname === "/settings" ? "is-active" : ""}`} to="/settings" aria-label="Settings" title="Settings">
              ⚙
            </Link>
          </nav>

          <div className={`app-channel-column ${isSidebarOpen ? "is-open" : ""}`}>
            <Sidebar
              isOpen={isSidebarOpen}
              onNavigate={() => setIsSidebarOpen(false)}
            />
          </div>

          <div className="app-chat-column">
            {isSidebarOpen && (
              <button
                className="app__backdrop"
                type="button"
                aria-label="Close channel menu"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            {isMediaOpen && (
              <button
                className="app__mediaBackdrop"
                type="button"
                aria-label="Close shared files panel"
                onClick={() => setIsMediaOpen(false)}
              />
            )}
            <Switch>
              <Route path="/invite/:token" component={ChannelInvite} />
              <Route exact path="/settings" component={Settings} />
              <Route
                path="/dm/:roomId"
                render={(props) => (
                  <Chat {...props} onMessagesChange={setActiveMessages} onRegisterActions={registerChatActions} />
                )}
              />
              <Route
                path="/chat/:roomId"
                render={(props) => (
                  <Chat {...props} onMessagesChange={setActiveMessages} onRegisterActions={registerChatActions} />
                )}
              />
              <Route
                exact
                path="/"
                render={(props) => (
                  <Chat {...props} onMessagesChange={setActiveMessages} onRegisterActions={registerChatActions} />
                )}
              />
              <Route
                render={(props) => (
                  <Chat {...props} onMessagesChange={setActiveMessages} onRegisterActions={registerChatActions} />
                )}
              />
            </Switch>
          </div>
          {location.pathname !== "/settings" && (
            <SidebarMedia
              messages={activeMessages}
              isOpen={isMediaOpen}
              onClose={() => setIsMediaOpen(false)}
            />
          )}
        </div>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
