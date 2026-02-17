import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom, joinRoom } from "../api";
import { useRoomContext } from "../context";
export function HomePage() {
    const [gmName, setGmName] = useState("Game Master");
    const [mode, setMode] = useState("sev-escalation");
    const [joinCode, setJoinCode] = useState("");
    const [joinName, setJoinName] = useState("Engineer");
    const [error, setError] = useState();
    const navigate = useNavigate();
    const { setSession, setState } = useRoomContext();
    const onCreate = async () => {
        setError(undefined);
        try {
            const created = await createRoom({ gmName, mode });
            setSession({
                roomCode: created.roomCode,
                playerId: created.gmPlayerId,
                gmSecret: created.gmSecret,
            });
            setState(created.state);
            navigate(`/room/${encodeURIComponent(created.roomCode)}`);
        }
        catch (err) {
            setError(err.message);
        }
    };
    const onJoin = async () => {
        setError(undefined);
        try {
            const joined = await joinRoom(joinCode, { name: joinName });
            setSession({ roomCode: joinCode, playerId: joined.playerId });
            setState(joined.state);
            navigate(`/room/${encodeURIComponent(joinCode)}`);
        }
        catch (err) {
            setError(err.message);
        }
    };
    return (_jsxs("main", { className: "page", children: [_jsxs("section", { className: "card", children: [_jsx("h1", { children: "Incident Training RPG" }), _jsx("p", { children: "Run multiplayer drills for incident coordination roles and communication discipline." }), _jsxs("label", { children: ["GM Name", _jsx("input", { value: gmName, onChange: (e) => setGmName(e.target.value) })] }), _jsxs("label", { children: ["Mode", _jsxs("select", { value: mode, onChange: (e) => setMode(e.target.value), children: [_jsx("option", { value: "sev-escalation", children: "SEV Escalation" }), _jsx("option", { value: "comms-crisis", children: "Comms Crisis" })] })] }), _jsx("button", { onClick: onCreate, children: "Create Room" })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Join Room" }), _jsxs("label", { children: ["Room Code", _jsx("input", { value: joinCode, onChange: (e) => setJoinCode(e.target.value.toUpperCase()) })] }), _jsxs("label", { children: ["Name", _jsx("input", { value: joinName, onChange: (e) => setJoinName(e.target.value) })] }), _jsx("button", { onClick: onJoin, children: "Join" })] }), error && _jsx("p", { className: "error", children: error })] }));
}
