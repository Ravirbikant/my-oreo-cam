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
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaUser,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";
import { MdCallEnd } from "react-icons/md";
import { FaMaximize, FaMinimize } from "react-icons/fa6";
import screenfull from "screenfull";

const Guest = (): JSX.Element => {
  const [searchParams] = useSearchParams();

  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const roomId = useRef<string>(searchParams.get("roomId") || "");
  const [roomIdInput, setRoomIdInput] = useState<string>(
    searchParams.get("roomId") || ""
  );
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isEndingCall, setIsEndingCall] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isGuestDataWritten, setIsGuestDataWritten] = useState<boolean>(false);
  const [hostJoined, setHostJoined] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleCreateAnswer = async (roomIdparam: string, offerSdp: string) => {
    const pc = new RTCPeerConnection();
    const guestDataRef = doc(db, "rooms", roomIdparam, "guestData", "data");

    localStream.current
      ?.getTracks()
      .forEach((track) => pc.addTrack(track, localStream.current));

    pc.ontrack = (e) => {
      if (remoteFeed.current) {
        remoteFeed.current.srcObject = e.streams[0];
        setIsConnecting(false);
        setHostJoined(true);
      }
    };

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        const candidateStr = JSON.stringify(e.candidate);

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

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        setIsConnecting(false);
        alert("Connection failed. Please try again.");
      }
    };

    const offer = JSON.parse(offerSdp);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

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
      setIsGuestDataWritten(true);
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

    if (!roomIdInput.trim()) {
      alert("Please enter the room ID");
      return;
    }

    roomId.current = roomIdInput.trim();

    const hostDataRef = doc(
      db,
      "rooms",
      roomId.current.trim(),
      "hostData",
      "data"
    );
    const guestDataRef = doc(
      db,
      "rooms",
      roomId.current.trim(),
      "guestData",
      "data"
    );

    onSnapshot(hostDataRef, async (snapshot) => {
      if (!snapshot.exists()) {
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
          await deleteDoc(guestDataRef);
          navigate("/call-ended");
          setHostJoined(false);
        } catch (err) {
          console.log("Error clearning up guest data : ", err);
        }
        setIsEndingCall(false);
        setIsInRoom(false);
        setIsGuestDataWritten(false);
        roomId.current = "";
        return;
      }

      const data = snapshot.data();

      if (!data) {
        alert("Room not found");
        return;
      }

      if (data.offerSdp && !peerConnection.current) {
        await handleCreateAnswer(roomId.current.trim(), data.offerSdp);
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
          } catch (error) {
            console.log("Error adding host ICE Candidate : ", error);
          }
        });
      }
    });

    setIsInRoom(true);
    setIsConnecting(true);
    console.log("Entered room : ", roomId.current.trim());
  };

  const handleEndCall = async () => {
    if (!roomId.current || isEndingCall) return;

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
      await deleteDoc(doc(db, "rooms", roomId.current, "guestData", "data"));
      roomId.current = "";
      setIsGuestDataWritten(false);
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
  }, [isVideoOn, isAudioOn]);

  useEffect(() => {
    if (!screenfull.isEnabled) return;
    const handleChange = () => setIsFullScreen(screenfull.isFullscreen);
    screenfull.on("change", handleChange);
    return () => screenfull.off("change", handleChange);
  }, []);

  useEffect(() => {
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach((track) => track.stop());
        localStream.current = null;
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
    };
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
                <div className="online-icon"></div>Guest
              </div>
            </div>
          </div>
          {isGuestDataWritten ? (
            <p>{roomId.current}</p>
          ) : (
            <button
              onClick={() => navigate("/host")}
              className="action-icon-button primary-btn"
            >
              <FaUser className="icon" />
              <p>Enter as host</p>
            </button>
          )}
        </div>

        <div
          className={`local-feed-container ${
            !hostJoined ? "local-feed-fullscreen" : ""
          }`}
        >
          <video ref={localFeed} autoPlay playsInline muted />
        </div>
      </div>

      <div className="footer">
        {!isInRoom ? (
          <div className="guest-enter-room">
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              className="room-id-input"
            />
            <button
              onClick={handleEnterRoom}
              className="action-icon-button primary-btn enter-room-button"
              disabled={!isVideoOn}
            >
              Enter Room
            </button>
          </div>
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

      {isConnecting && (
        <div className="loading-overlay">
          <p>Connecting...</p>
        </div>
      )}
    </>
  );
};

export default Guest;
