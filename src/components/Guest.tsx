import { useRef, useEffect } from "react";

const Guest = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    const getLocalFeed = async (): Promise<void> => {
      try {
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
  }, []);

  return (
    <>
      <div>
        <video ref={localFeed} autoPlay playsInline muted />
      </div>
    </>
  );
};

export default Guest;
