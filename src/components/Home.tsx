import { useState } from "react";
import "./styles.css";
import { useNavigate } from "react-router-dom";

const Home = (): React.JSX.Element => {
  const [name, setName] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const navigate = useNavigate();
  const handleCreateRoom = () => {
    navigate(`/host`);
  };

  const handleJoinRoom = () => {
    console.log("Join room clicked with name:", name, "roomId:", roomId);
  };

  return (
    <div className="home-container">
      <h1>Oreo Cam</h1>
      <div className="home-form">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="home-input"
        />
        <button
          onClick={handleCreateRoom}
          disabled={!name.trim()}
          className="home-button home-button-create"
        >
          Create Room
        </button>
        <div className="home-join-row">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="home-input home-input-room"
          />
          <button
            onClick={handleJoinRoom}
            disabled={!name.trim() || !roomId.trim()}
            className="home-button home-button-join"
          >
            Join Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
