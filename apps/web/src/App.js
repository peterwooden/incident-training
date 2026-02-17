import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";
import { RoomContext } from "./context";
export default function App() {
    const [session, setSessionState] = useState(undefined);
    const [state, setState] = useState(undefined);
    const value = useMemo(() => ({
        session,
        setSession: (next) => setSessionState(next),
        state,
        setState,
    }), [session, state]);
    return (_jsx(RoomContext.Provider, { value: value, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(HomePage, {}) }), _jsx(Route, { path: "/room/:roomCode", element: _jsx(RoomPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
