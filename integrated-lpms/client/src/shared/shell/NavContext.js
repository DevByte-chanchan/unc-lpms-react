import { createContext, useContext } from 'react';

export const NavContext = createContext({ collapsed: false, toggle: () => {}, available: false });
export const useNav = () => useContext(NavContext);
