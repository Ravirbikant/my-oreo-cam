import { useRef, useEffect, useState } from "react";
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
import "./styles.css";
import {
  FaCopy,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPlus,
  FaUser,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { FaMaximize, FaMinimize } from "react-icons/fa6";
import screenfull from "screenfull";

const Host = (): JSX.Element => {
  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string>("");
  const processedAnswerRef = useRef<string>("");
  const guestJoinedRef = useRef<boolean>(false);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isEndingCall, setIsEndingCall] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
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
        setIsConnecting(false);
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
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        setIsConnecting(false);
        alert("Connection failed. Please try again.");
      }
    };

    const offer = await pc.createOffer();
    pc.setLocalDescription(offer);
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

    const newRoomId = Date.now().toString();
    setCurrentRoomId(newRoomId);
    navigate(`/host?roomId=${newRoomId}`, { replace: true });

    const roomRef = doc(db, "rooms", newRoomId);

    try {
      await setDoc(roomRef, {
        roomId: newRoomId,
        createdAt: serverTimestamp(),
      });
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
            navigate("/call-ended");
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
        setIsConnecting(true);

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
      navigate("/call-ended");
    } catch (err) {
      console.log("Error ending the call : ", err);
    }
    setIsEndingCall(false);
  };

  const toggleFullscreen = () => {
    if (screenfull.isEnabled) {
      screenfull.toggle();
    }
  };

  const handleCopyLink = async () => {
    const guestLink = `${window.location.origin}/guest?roomId=${currentRoomId}`;
    try {
      await navigator.clipboard.writeText(guestLink);
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (err) {
      console.log("Error copying link : ", err);
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

  useEffect(() => {
    if (!screenfull.isEnabled) return;
    const handleChange = () => setIsFullScreen(screenfull.isFullscreen);
    screenfull.on("change", handleChange);
    return () => screenfull.off("change", handleChange);
  }, []);

  return (
    <>
      <div>
        <div className="remote-feed-container">
          <video ref={remoteFeed} autoPlay playsInline />
        </div>

        <div className="header">
          <div>
            <div className="room-id-container">
              <div className="header-info">
                <div className="online-icon"></div>Host
              </div>
              {currentRoomId && (
                <div className="header-info" style={{ marginTop: "10px" }}>
                  <FaCopy
                    className="icon"
                    style={{ cursor: "pointer" }}
                    onClick={handleCopyLink}
                  />
                  <p>{currentRoomId}</p>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate("/guest")}
            className="action-icon-button"
          >
            <FaUser className="icon" />
            <p>Enter as guest</p>
          </button>
        </div>

        <div className="local-feed-container">
          <video ref={localFeed} autoPlay playsInline muted />
        </div>
      </div>

      <div className="footer">
        {!currentRoomId ? (
          <button onClick={handleCreateRoom} className="action-icon-button">
            <FaPlus className="icon" />
            <p>Create Room</p>
          </button>
        ) : (
          <div className="video-controls">
            <div className="action-buttons">
              <button
                className="action-icon-button"
                onClick={() => {
                  setIsVideoOn((prev) => !prev);
                }}
              >
                {isVideoOn ? (
                  <FaVideo className="icon" />
                ) : (
                  <FaVideoSlash className="icon" />
                )}
              </button>

              <button
                onClick={() => {
                  setIsAudioOn((prev) => !prev);
                }}
                className="action-icon-button"
              >
                {isAudioOn ? (
                  <FaMicrophone className="icon" />
                ) : (
                  <FaMicrophoneSlash className="icon" />
                )}
              </button>
              <button onClick={toggleFullscreen} className="action-icon-button">
                {!isFullScreen ? (
                  <FaMaximize className="icon" />
                ) : (
                  <FaMinimize className="icon" />
                )}
              </button>
              <button
                onClick={handleEndCall}
                className="action-icon-button end-call-button"
              >
                <MdCallEnd className="icon" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isCopied && (
        <div className="copied-message">
          <p>Link copied to clipboard!</p>
        </div>
      )}

      {isConnecting && (
        <div className="loading-overlay">
          <p>Connecting...</p>
        </div>
      )}
    </>
  );
};

export default Host;
