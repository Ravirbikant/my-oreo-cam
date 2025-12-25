import { useNavigate } from "react-router-dom";

const CallEnded = (): JSX.Element => {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Call Ended</h1>
      <p>The call has ended. Thank you for using Oreo Cam!</p>
      <div>
        <button onClick={() => navigate("/")}>Return to Home</button>
      </div>
    </div>
  );
};

export default CallEnded;
