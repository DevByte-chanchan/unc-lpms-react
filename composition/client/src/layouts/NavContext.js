import { createContext, useContext } from 'react'

// The sidebar's open/collapsed state, shared by the layout (which draws it) and the top bar (which holds
// the button). Outside a layout the defaults do nothing, so a header can still render on its own.
export const NavContext = createContext({ collapsed: false, toggle: () => {}, available: false })
export const useNav = () => useContext(NavContext)
