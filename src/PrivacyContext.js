import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const PrivacyContext = createContext(null);

export const PrivacyProvider = ({ children }) => {
  const [isPrivacyMode, setIsPrivacyMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = window.localStorage.getItem("veil-privacy-mode");
    return saved === "true";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("veil-privacy-mode", String(isPrivacyMode));
    }
  }, [isPrivacyMode]);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => !prev);
  };

  const value = useMemo(
    () => ({ isPrivacyMode, setIsPrivacyMode, togglePrivacyMode }),
    [isPrivacyMode],
  );

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
};

export default PrivacyContext;
