import { useRef, useEffect, useState } from "react";
import "./styles.css";
import {
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from "../firebase";
import { serverTimestamp } from "firebase/firestore";

const Host = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(false);
  const [createdOffer, setCreatedOffer] = useState<string>("");
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [localCandidates, setLocalCandidates] = useState<string[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState<string[]>([]);
  const [answerSdp, setAnswerSdp] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const handleCreateOffer = async () => {
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

    const offer = await pc.createOffer();
    pc.setLocalDescription(offer);
    setCreatedOffer(JSON.stringify(offer));
    const offerSdp = JSON.stringify(offer);
    const roomId = "test123";
    const roomRef = doc(db, "rooms", roomId);

    try {
      await setDoc(
        roomRef,
        {
          offerSdp,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("Sdp offer written to firebase");
    } catch (err) {
      console.log("Error writing offer sdp to firebase : ", err);
    }
    peerConnection.current = pc;
  };

  const handleWriteFirestore = async () => {
    const roomId = "test123";
    const roomRef = doc(db, "rooms", roomId);
    try {
      console.log("Inside try");
      await setDoc(roomRef, {
        roomId,
        hello: "Hi firebase",
        createdAt: new Date().toISOString(),
      });

      console.log("Done");
    } catch (err) {
      console.log("Error : ", err);
    }
  };

  const handleSetAnswer = async () => {
    if (!peerConnection.current || !answerSdp) return;

    const answer = JSON.parse(answerSdp);
    await peerConnection.current.setRemoteDescription(
      new RTCSessionDescription(answer)
    );

    console.log("Answer set");
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
      <h1>Host Screen</h1>
      <div>
        <div className="video-screens-container">
          <div className="screen">
            <div className="video-container">
              <video ref={localFeed} autoPlay playsInline muted />
            </div>
            <p>Local feed</p>
            <button
              onClick={() => {
                setIsVideoOn((prev) => !prev);
              }}
            >
              Turn Video {isVideoOn ? "off" : "on"}
            </button>
          </div>

          <div className="screen">
            <div className="video-container">
              <video ref={remoteFeed} autoPlay playsInline muted />
            </div>

            <p>Remote feed</p>
            <button onClick={() => {}}>Turn Video</button>
          </div>
        </div>
      </div>
      <button onClick={handleWriteFirestore}>Write to firestore</button>
      <button onClick={handleCreateOffer}>Create an offer</button>
      <textarea value={createdOffer} readOnly rows={5} cols={30}></textarea>

      <textarea
        value={answerSdp}
        onChange={(e) => setAnswerSdp(e.target.value)}
        rows={5}
        cols={30}
      />
      <button onClick={handleSetAnswer}>Set Answer</button>

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

export default Host;
