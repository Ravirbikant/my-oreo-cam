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

const Guest = (): JSX.Element => {
  const [searchParams] = useSearchParams();

  const localFeed = useRef<HTMLVideoElement>(null);
  const remoteFeed = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState<boolean>(true);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const roomId = useRef<string>(searchParams.get("roomId") || "");
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [isHostVideoOn, setIsHostVideoOn] = useState<boolean>(true);
  const [isAudioOn, setIsAudioOn] = useState<boolean>(true);
  const [isEndingCall, setIsEndingCall] = useState<boolean>(false);
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

    if (!roomId.current.trim()) {
      alert("Please enter the room ID");
      return;
    }

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
        } catch (err) {
          console.log("Error clearning up guest data : ", err);
        }
        setIsEndingCall(false);
        setIsInRoom(false);
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
      navigate("/call-ended");
    } catch (err) {
      console.log("Error ending the call : ", err);
    }
    setIsEndingCall(false);
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
              {roomId.current && <p>{roomId.current}</p>}
            </div>
          </div>
          <button
            onClick={() => navigate("/host")}
            className="action-icon-button"
          >
            <FaUser className="icon" />
            <p>Enter as host</p>
          </button>
        </div>

        <div className="local-feed-container">
          <video ref={localFeed} autoPlay playsInline muted />
        </div>
      </div>

      <div className="footer">
        {isInRoom ? (
          <>Enter</>
        ) : (
          <div className="guest-video-controls">
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
    </>
    // <>
    //   <div>
    //     <div>
    //       <p>Remote feed</p>
    //       <button
    //         onClick={() => {
    //           setIsHostVideoOn((prev) => !prev);
    //         }}
    //       >
    //         Turn Host Video {isHostVideoOn ? "off" : "on"}
    //       </button>
    //     </div>

    //     <div>
    //       <div>
    //         <video ref={localFeed} autoPlay playsInline muted />
    //         <p>Local feed</p>
    //       </div>
    //       <button
    //         onClick={() => {
    //           setIsVideoOn((prev) => !prev);
    //         }}
    //       >
    //         Turn Video {isVideoOn ? "off" : "on"}
    //       </button>
    //       <button
    //         onClick={() => {
    //           setIsAudioOn((prev) => !prev);
    //         }}
    //       >
    //         Turn Audio {isAudioOn ? "off" : "on"}
    //       </button>
    //     </div>
    //   </div>

    //   <div>
    //     <input
    //       type="text"
    //       placeholder="Enter Room ID"
    //       value={roomId.current}
    //       onChange={(e) => (roomId.current = e.target.value)}
    //       disabled={isInRoom}
    //     />
    //     <button onClick={handleEnterRoom} disabled={!isVideoOn || isInRoom}>
    //       Enter Room
    //     </button>
    //     {isInRoom && (
    //       <>
    //         <p>In room: {roomId.current}</p>
    //         <button
    //           onClick={handleEndCall}
    //           disabled={isEndingCall || !isInRoom}
    //         >
    //           {isEndingCall ? "Ending call..." : "End Call"}
    //         </button>
    //       </>
    //     )}
    //   </div>
    // </>
  );
};

export default Guest;
