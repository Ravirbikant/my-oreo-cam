import { useRef, useEffect, useState } from "react";
import "./styles.css";

const Guest = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<booleam>(false);

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
        <div className="local-video-container">
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
    </>
  );
};

export default Guest;
