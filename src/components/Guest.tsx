import { useRef, useEffect, useState } from "react";
import "./styles.css";

const Guest = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<booleam>(false);
  const [hostOffer, setHostOffer] = useState<string>("");
  const [answerSdp, setAnswerSdp] = useState<string>("");

  const handleCreateAnswer = async () => {
    const pc = new RTCPeerConnection();

    localStream.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream.current));

    pc.ontrack = (e) => {
      if (remoteFeed.current) {
        remoteFeed.current.srcObject = e.streams[0];
      }
    };

    const offer = JSON.parse(hostOffer);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setAnswerSdp(JSON.stringify(answer));
    console.log(answer);
  };

  useEffect(() => {
    const getLocalFeed = async (): Promise<void> => {
      try {
        if (!isVideoOn) return;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        localStream.current = stream;
        if (localFeed.current) {
          localFeed.current.srcObject = stream;
        }
      } catch (error) {
        console.log("Error : ", error);
      }
    };

    getLocalFeed();

    return () => {
      localStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [isVideoOn]);

  return (
    <>
      <h1>Guest Screen</h1>
      <div>
        <div className="video-screens-container">
          <div className="screen">
            <div className="video-container">
              <video ref={remoteFeed} autoPlay playsInline muted />
            </div>
            <button onClick={() => {}}>Turn Video</button>
          </div>

          <div className="screen">
            <div className="video-container">
              <video ref={localFeed} autoPlay playsInline muted />
            </div>
            <button
              onClick={() => {
                setIsVideoOn((prev) => !prev);
              }}
            >
              Turn Video {isVideoOn ? "off" : "on"}
            </button>
          </div>
        </div>
      </div>

      <textarea
        placeholder="Paste offer from host"
        value={hostOffer}
        onChange={(e) => setHostOffer(e.target.value)}
        rows={5}
        cols={30}
      />
      <button onClick={handleCreateAnswer}>Create answer</button>

      <textarea readOnly value={answerSdp} rows={5} cols={30} />
    </>
  );
};

export default Guest;
