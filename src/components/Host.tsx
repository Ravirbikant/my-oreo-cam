import { useRef, useEffect, useState } from "react";
import "./styles.css";
import {
  db,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
  deleteDoc,
} from "../firebase";
import { serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const Host = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const [createdOffer, setCreatedOffer] = useState<string>("");
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [localCandidates, setLocalCandidates] = useState<string[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState<string[]>([]);
  const [answerSdp, setAnswerSdp] = useState<string>("");
  const [currentRoomId, setCurrentRoomId] = useState<string>("");
  const processedAnswerRef = useRef<string>("");
  const guestJoinedRef = useRef<boolean>(false);
  const [isGuestVideoOn, setIsGuestVideoOn] = useState<boolean>(true);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isEndingCall, setIsEndingCall] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleCreateOffer = async (roomId: string) => {
    const pc = new RTCPeerConnection();
    const hostDataRef = doc(db, "rooms", roomId, "hostData", "data");

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
        try {
          await updateDoc(hostDataRef, {
            iceCandidates: arrayUnion(JSON.stringify(e.candidate)),
          });
          console.log("Added ice candidate to firebase : ", e.candidate);
        } catch (err) {
          console.log("Error adding ice candidiate to firebase : ", err);
        }
        setLocalCandidates((prev) => [...prev, JSON.stringify(e.candidate)]);
      }
    };

    const offer = await pc.createOffer();
    pc.setLocalDescription(offer);
    setCreatedOffer(JSON.stringify(offer));
    const offerSdp = JSON.stringify(offer);

    try {
      await setDoc(
        hostDataRef,
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

  const handleCreateRoom = async () => {
    if (
      !localFeed.current ||
      localStream.current.getVideoTracks().length === 0
    ) {
      alert("Please turn on the video first");
      return;
    }

    const newRoomId = `room-${Date.now()}`;
    setCurrentRoomId(newRoomId);

    const roomRef = doc(db, "rooms", newRoomId);

    try {
      await setDoc(roomRef, {
        roomId: newRoomId,
        createdAt: serverTimestamp(),
      });
      console.log("Room created");
      await handleCreateOffer(newRoomId);
      setUpFirebaseListeners(newRoomId);
    } catch (error) {
      console.log("Error creating room : ", error);
    }
  };

  const setUpFirebaseListeners = (roomId: string) => {
    const guestDataRef = doc(db, "rooms", roomId, "guestData", "data");
    guestJoinedRef.current = false;

    onSnapshot(guestDataRef, async (snapshot) => {
      if (!snapshot.exists()) {
        if (guestJoinedRef.current) {
          setIsEndingCall(true);
          if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
          }
          if (localStream.current) {
            localStream.current.getTracks().forEach((track) => track.stop());
            localStream.current = null;
          }

          try {
            await deleteDoc(doc(db, "rooms", roomId, "hostData", "data"));
            navigate("/");
          } catch (err) {
            console.log("Error cleaning up host data : ", err);
          }
          setIsEndingCall(false);
          setCurrentRoomId("");
        }
        return;
      }

      guestJoinedRef.current = true;
      const data = snapshot.data();

      if (!data) return;

      if (data?.answerSdp && data.answerSdp !== processedAnswerRef.current) {
        processedAnswerRef.current = data.answerSdp;
        setAnswerSdp(data.answerSdp);

        if (peerConnection.current) {
          const answer = JSON.parse(data.answerSdp);
          peerConnection.current.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        }
      }

      if (data?.iceCandidates && Array.isArray(data.iceCandidates)) {
        data.iceCandidates.forEach((candidateStr: string) => {
          if (peerConnection.current) {
            try {
              const candidate = JSON.parse(candidateStr);
              peerConnection.current.addIceCandidate(
                new RTCIceCandidate(candidate)
              );
            } catch (err) {
              console.log("Error adding guest ICE candidate : " + err);
            }
          }
        });

        setRemoteCandidates(data.iceCandidates.join("\n"));
      }
    });
  };

  const handleEndCall = async () => {
    if (!currentRoomId || isEndingCall) return;

    setIsEndingCall(true);

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localStream.current) {
      localStream.current.getTracks().forEach((track) => track.stop());
      localStream.current = null;
    }

    try {
      await deleteDoc(doc(db, "rooms", currentRoomId, "hostData", "data"));
      setCurrentRoomId("");
      navigate("/");
    } catch (err) {
      console.log("Error ending the call : ", err);
    }
    setIsEndingCall(false);
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

          localStream.current.getAudioTracks().forEach((track) => {
            track.enabled = isAudioOn;
          });
        }
      } catch (error) {
        console.log("Error : ", error);
      }
    };

    getLocalFeed();

    //May also add firebase listeners cleanup here
  }, [isVideoOn, isAudioOn]);

  return (
    <>
      <h1>Host ka Screen</h1>
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

            <button
              onClick={() => {
                setIsAudioOn((prev) => !prev);
              }}
            >
              Turn Audio {isAudioOn ? "off" : "on"}
            </button>
          </div>

          <div className="screen">
            <div className="video-container">
              {!isGuestVideoOn && <div className="placeholder">Guest</div>}
              <video
                ref={remoteFeed}
                autoPlay
                playsInline
                style={{ opacity: isGuestVideoOn ? 1 : 0 }}
              />
            </div>

            <p>Remote feed</p>
            <button
              onClick={() => {
                setIsGuestVideoOn((prev) => setIsGuestVideoOn(!prev));
              }}
            >
              Turn Guest video {isGuestVideoOn ? "off" : "on"}
            </button>
          </div>
        </div>

        <button onClick={handleEndCall}>End call</button>
      </div>
      {/* <button onClick={handleCreateOffer}>Create an offer</button>
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
      </div> */}
      <button onClick={handleCreateRoom}>Create room</button>
      {currentRoomId && <p>Room Id : {currentRoomId}</p>}
    </>
  );
};

export default Host;
