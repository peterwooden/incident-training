import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinRoom } from "../api";
import { useRoomContext } from "../context";

export function JoinRoomPage() {
  const { roomCode = "" } = useParams();
  const [name, setName] = useState("Player");
  const [error, setError] = useState<string | undefined>();
  const navigate = useNavigate();
  const { setSession, setState } = useRoomContext();

  const normalizedCode = roomCode.toUpperCase();

  const onJoin = async () => {
    setError(undefined);
    try {
      const joined = await joinRoom(normalizedCode, { name, preferredRole: "Observer" });
      setSession({ roomCode: normalizedCode, playerId: joined.playerId });
      setState(joined.state);
      navigate(`/room/${encodeURIComponent(normalizedCode)}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="landing-shell join-shell">
      <section className="landing-card join-card">
        <p className="eyebrow">Join Session</p>
        <h1>Room {normalizedCode}</h1>
        <p>Enter your display name to join the waiting room.</p>
        <label>
          Display Name
          <input value={name} maxLength={30} onChange={(event) => setName(event.target.value)} />
        </label>
        <button onClick={onJoin} disabled={!name.trim()}>
          Join Waiting Room
        </button>
        {error && <p className="error">{error}</p>}
      </section>
    </main>
  );
}
