"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

interface NavVisibilityContextValue {
  isNavVisible: boolean;
  hideNav: () => void;
  showNav: () => void;
}

const NavVisibilityContext = createContext<NavVisibilityContextValue>({
  isNavVisible: true,
  hideNav: () => {},
  showNav: () => {},
});

export function NavVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const hideNav = useCallback(() => setIsNavVisible(false), []);
  const showNav = useCallback(() => setIsNavVisible(true), []);

  return (
    <NavVisibilityContext.Provider value={{ isNavVisible, hideNav, showNav }}>
      {children}
    </NavVisibilityContext.Provider>
  );
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext);
}
