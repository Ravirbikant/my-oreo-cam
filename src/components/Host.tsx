import { useRef, useEffect, useState } from "react";
import "./styles.css";

const Host = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<booleam>(false);
  const [createdOffer, setCreatedOffer] = useState<string>("");
  const peerConnection = useRef<RTCPeerConnection | null>(null);

  const handleCreateOffer = async () => {
    const pc = new RTCPeerConnection();

    localStream.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream.current));

    const offer = await pc.createOffer();
    pc.setLocalDescription(offer);
    setCreatedOffer(JSON.stringify(offer));

    peerConnection.current = pc;
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
      <h1>Host Screen</h1>
      <div>
        <div className="video-screens-container">
          <div className="screen">
            <div className="video-container">
              <video ref={localFeed} autoPlay playsInline muted />
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

      <button onClick={handleCreateOffer}>Create an offer</button>
      <textarea value={createdOffer} readOnly rows={5} cols={30}></textarea>
    </>
  );
};

export default Host;
