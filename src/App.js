import React, { useEffect, useState } from "react";
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

function App() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [panicMode, setPanicMode] = useState(false);
  const [chatTheme, setChatTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("veil-chat-theme") || "light";
  });

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("veil-chat-theme", chatTheme);
    }
  }, [chatTheme]);

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
    <div className="app" data-theme={chatTheme}>
      {user ? (
        <>
          <div className="app__mobileBar">
            <button
              className="app__menuButton"
              type="button"
              aria-expanded={isSidebarOpen}
              aria-controls="app-sidebar"
              onClick={() => setIsSidebarOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
              <span>Channels</span>
            </button>
          </div>
          <div className="app__content">
            <Sidebar
              isOpen={isSidebarOpen}
              onNavigate={() => setIsSidebarOpen(false)}
            />
            {isSidebarOpen && (
              <button
                className="app__backdrop"
                type="button"
                aria-label="Close channel menu"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            <Switch>
              <Route path="/invite/:token" component={ChannelInvite} />
              <Route
                path="/dm/:roomId"
                render={(props) => (
                  <Chat {...props} theme={chatTheme} setTheme={setChatTheme} />
                )}
              />
              <Route
                path="/chat/:roomId"
                render={(props) => (
                  <Chat {...props} theme={chatTheme} setTheme={setChatTheme} />
                )}
              />
              <Route
                exact
                path="/"
                render={(props) => (
                  <Chat {...props} theme={chatTheme} setTheme={setChatTheme} />
                )}
              />
              <Route
                render={(props) => (
                  <Chat {...props} theme={chatTheme} setTheme={setChatTheme} />
                )}
              />
            </Switch>
          </div>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}

export default App;
