import { useNavigate } from "react-router-dom";
import "./styles.css";

const CallEnded = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div className="call-ended-container">
      <h1>Call Ended</h1>
      <p>The call has ended. Thank you for using Oreo Cam!</p>
      <div className="call-ended-actions">
        <button
          onClick={() => navigate("/")}
          className="home-button home-button-create"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default CallEnded;

