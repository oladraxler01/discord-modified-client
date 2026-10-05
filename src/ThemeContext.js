import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
const VALID_THEMES = ["light", "violet", "midnight"];

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = window.localStorage.getItem("veil-chat-theme");
    return VALID_THEMES.includes(savedTheme) ? savedTheme : "light";
  });

  useEffect(() => {
    window.localStorage.setItem("veil-chat-theme", currentTheme);
  }, [currentTheme]);

  const value = useMemo(() => ({ currentTheme, setCurrentTheme }), [currentTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
