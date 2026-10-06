import { useEffect } from "react";
import Pusher from "pusher-js";
import axios from "../axios";

const pusher = new Pusher("e97d599fd9d4473f90d2", {
  cluster: "us2",
  channelAuthorization: {
    customHandler: (params, callback) => {
      axios
        .post("/pusher/auth", params)
        .then((response) => callback(null, response.data))
        .catch((error) => callback(error, null));
    },
  },
});

const usePusherRoom = (
  roomId,
  onMessage,
  isDirectMessage = false,
  isInviteOnly = false,
) => {
  useEffect(() => {
    if (!roomId) return undefined;

    const roomChannelName = isDirectMessage
      ? `private-dm-${roomId}`
      : isInviteOnly
        ? `private-room-${roomId}`
        : `chat-${roomId}`;
    const roomChannel = pusher.subscribe(roomChannelName);

    roomChannel.bind("newMessage", onMessage);
    roomChannel.bind("timerUpdate", onMessage);

    return () => {
      roomChannel.unbind("newMessage", onMessage);
      roomChannel.unbind("timerUpdate", onMessage);
      pusher.unsubscribe(roomChannelName);
    };
  }, [roomId, onMessage, isDirectMessage, isInviteOnly]);
};

export default usePusherRoom;
