import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { sendAction, startRoom, subscribeToRoom } from "../api";
import { useRoomContext } from "../context";
const ACTIONS = [
    "assign_role",
    "acknowledge_incident",
    "open_bridge",
    "escalate_vendor",
    "publish_update",
    "stabilize_service",
    "declare_resolved",
];
export function RoomPage() {
    const { roomCode = "" } = useParams();
    const { session, state, setState } = useRoomContext();
    const [error, setError] = useState();
    const navigate = useNavigate();
    useEffect(() => {
        if (!session || session.roomCode !== roomCode) {
            navigate("/");
            return;
        }
        const close = subscribeToRoom(roomCode, session.playerId, setState);
        return close;
    }, [navigate, roomCode, session, setState]);
    const pendingObjectives = useMemo(() => state?.objectives.filter((objective) => !objective.completed) ?? [], [state]);
    if (!session || !state) {
        return _jsx("main", { className: "page", children: "Loading..." });
    }
    const onStart = async () => {
        if (!session.gmSecret) {
            return;
        }
        setError(undefined);
        try {
            const started = await startRoom(roomCode, { gmSecret: session.gmSecret });
            setState(started.state);
        }
        catch (err) {
            setError(err.message);
        }
    };
    const onAction = async (actionType) => {
        setError(undefined);
        try {
            const updated = await sendAction(roomCode, {
                playerId: session.playerId,
                actionType,
            });
            setState(updated.state);
        }
        catch (err) {
            setError(err.message);
        }
    };
    return (_jsxs("main", { className: "page", children: [_jsxs("section", { className: "card", children: [_jsxs("h1", { children: ["Room ", state.roomCode] }), _jsxs("p", { children: ["Mode: ", state.mode] }), _jsxs("p", { children: ["Status: ", state.status] }), _jsxs("p", { children: ["Pressure: ", state.pressure] }), _jsxs("p", { children: ["Score: ", state.score] }), _jsx("p", { children: state.publicSummary }), session.gmSecret && state.status === "lobby" && _jsx("button", { onClick: onStart, children: "Start Scenario" })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Objectives" }), _jsx("ul", { children: state.objectives.map((objective) => (_jsxs("li", { children: ["[", objective.completed ? "x" : " ", "] ", objective.description] }, objective.id))) }), pendingObjectives.length === 0 && _jsx("p", { children: "All objectives complete." })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Actions" }), _jsx("div", { className: "actions", children: ACTIONS.map((actionType) => (_jsx("button", { onClick: () => onAction(actionType), disabled: state.status !== "running", children: actionType }, actionType))) })] }), _jsxs("section", { className: "card", children: [_jsx("h2", { children: "Timeline" }), _jsx("ul", { children: state.timeline
                            .slice()
                            .reverse()
                            .map((entry) => (_jsxs("li", { children: [new Date(entry.atEpochMs).toLocaleTimeString(), " | ", entry.kind, " | ", entry.message] }, entry.id))) })] }), error && _jsx("p", { className: "error", children: error })] }));
}
