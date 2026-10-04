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

  return (
    <div className="app">
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
              <Route path="/dm/:roomId" component={Chat} />
              <Route path="/chat/:roomId" component={Chat} />
              <Route exact path="/" component={Chat} />
              <Route component={Chat} />
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
