import { useRef, useEffect, useState } from "react";
import "./styles.css";

const Host = (): JSX.Element => {
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
      <h1>Host Screen</h1>
      <div>
        <div className="video-screens-container">
          <div className="video-container">
            <video ref={localFeed} autoPlay playsInline muted />
            <button
              onClick={() => {
                setIsVideoOn((prev) => !prev);
              }}
            >
              Turn Video {isVideoOn ? "off" : "on"}
            </button>
          </div>

          <div className="video-container">
            <video ref={localFeed} autoPlay playsInline muted />
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
    </>
  );
};

export default Host;
