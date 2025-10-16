import { useRef, useEffect, useState } from "react";
import "./styles.css";

const Guest = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<booleam>(false);
  const [hostOffer, setHostOffer] = useState<string>("");
  const [answerSdp, setAnswerSdp] = useState<string>("");
  const [localCandidates, setLocalCandidates] = useState<string[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState<string[]>([]);

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

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        setLocalCandidates((prev) => [...prev, JSON.stringify(e.candidate)]);
      }
    };

    const offer = JSON.parse(hostOffer);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setAnswerSdp(JSON.stringify(answer));

    peerConnection.current = pc;
  };

  const handleAddRemoteCandidate = async () => {
    if (!peerConnection.current || !remoteCandidates) return;

    try {
      const iceCandidates = remoteCandidates.trim().split("\n");

      for (const candidate of iceCandidates) {
        const c = JSON.parse(candidate.trim());
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(c));
      }

      setRemoteCandidates("");
    } catch (err) {
      console.log("Error : ", err);
    }
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
      <div>
        <textarea
          value={localCandidates.join("\n")}
          readOnly
          rows={15}
          cols={50}
        />

        <textarea
          placeholder="Paste remote candidates here"
          value={remoteCandidates}
          onChange={(e) => setRemoteCandidates(e.target.value)}
          rows={15}
          cols={50}
        />

        <button onClick={handleAddRemoteCandidate}>
          Add remote ICE candidates
        </button>
      </div>
    </>
  );
};

export default Guest;
