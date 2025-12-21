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

const Guest = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [hostOffer, setHostOffer] = useState<string>("");
  const [answerSdp, setAnswerSdp] = useState<string>("");
  const [localCandidates, setLocalCandidates] = useState<string[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState<string[]>([]);
  const [roomId, setRoomId] = useState<string>("");
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [isHostVideoOn, setIsHostVideoOn] = useState<boolean>(true);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);

  const handleCreateAnswer = async (roomIdparam: string, offerSdp: string) => {
    const pc = new RTCPeerConnection();
    const guestDataRef = doc(db, "rooms", roomIdparam, "guestData", "data");

    localStream.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream.current));

    pc.ontrack = (e) => {
      if (remoteFeed.current) {
        remoteFeed.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const candidateStr = JSON.stringify(e.candidate);

        setLocalCandidates((prev) => [...prev, candidateStr]);
        try {
          await updateDoc(guestDataRef, {
            iceCandidates: arrayUnion(candidateStr),
          });
          console.log("Adding Guest candidate to firebase : ", candidateStr);
        } catch (error) {
          console.log("Error adding Guest ICE candidate to firebase : ", error);
        }
      }
    };
    const offer = JSON.parse(offerSdp);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    setAnswerSdp(JSON.stringify(answer));

    const answerSdpString = JSON.stringify(answer);

    try {
      await setDoc(
        guestDataRef,
        {
          answerSdp: answerSdpString,
        },
        { merge: true }
      );
      console.log("Answer SDP written to Firebase");
    } catch (error) {
      console.log("Error writing answer SDP to Firebase : ", error);
    }

    peerConnection.current = pc;
  };

  const handleEnterRoom = async () => {
    if (
      !localStream.current ||
      localStream.current.getVideoTracks().length === 0
    ) {
      alert("Please turn on the video first");
      return;
    }

    if (!roomId.trim()) {
      alert("Please enter the room ID");
      return;
    }

    const hostDataRef = doc(db, "rooms", roomId.trim(), "hostData", "data");

    onSnapshot(hostDataRef, async (snapshot) => {
      const data = snapshot.data();

      if (!data) {
        alert("Room not found");
        return;
      }

      if (data.offerSdp && !peerConnection.current) {
        setHostOffer(data.offerSdp);
        await handleCreateAnswer(roomId.trim(), data.offerSdp);
      }

      if (
        data.iceCandidates &&
        Array.isArray(data.iceCandidates) &&
        peerConnection.current
      ) {
        data.iceCandidates.forEach(async (candidateStr: string) => {
          try {
            const candidate = JSON.parse(candidateStr);
            await peerConnection.current?.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log(
              "Added host ice candidate to Guest peer connection side"
            );

            setRemoteCandidates(data.iceCandidates.join("\n"));
          } catch (error) {
            console.log("Error adding host ICE Candidate : ", error);
          }
        });
      }
    });

    setIsInRoom(true);
    console.log("Entered room : ", roomId.trim());
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
        if (!localStream.current && (isVideoOn || isAudioOn)) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStream.current = stream;

          if (localFeed.current) {
            localFeed.current.srcObject = stream;
          }
        }
        if (localStream.current) {
          localStream.current.getVideoTracks().forEach((track) => {
            track.enabled = isVideoOn;
          });

          localStream.current.getVideoTracks().forEach((track) => {
            track.enabled = isAudioOn;
          });
        }
      } catch (error) {
        console.log("Error : ", error);
      }
    };

    getLocalFeed();
  }, [isVideoOn, isAudioOn]);

  return (
    <>
      <h1>Guest Screen</h1>
      <div>
        <div className="video-screens-container">
          <div className="screen">
            <div className="video-container">
              {!isHostVideoOn && <div>Host</div>}
              <video
                ref={remoteFeed}
                autoPlay
                playsInline
                muted
                style={{ opacity: isHostVideoOn ? 1 : 0 }}
              />
            </div>
            <p>Remote feed</p>
            <button
              onClick={() => {
                setIsHostVideoOn((prev) => !prev);
              }}
            >
              Turn Host Video {isHostVideoOn ? "off" : "on"}
            </button>
          </div>

          <div className="screen">
            <div className="video-container">
              <video ref={localFeed} autoPlay playsInline muted />
              <p>Local feed</p>
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

      <div>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isInRoom}
        />
        <button onClick={handleEnterRoom} disabled={!isVideoOn || isInRoom}>
          Enter Room
        </button>
        {isInRoom && <p>In room: {roomId}</p>}
      </div>
    </>
  );
};

export default Guest;
