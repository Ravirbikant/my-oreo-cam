import { useNavigate } from "react-router-dom";
import "./styles.css";

const CallEnded = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div className="remote-feed-container call-ended-container">
      <h1>Call Ended</h1>
      <p>The call has ended. Thank you for using Oreo Cam!</p>
      <div>
        <button onClick={() => navigate("/")} className="action-icon-button">
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default CallEnded;
