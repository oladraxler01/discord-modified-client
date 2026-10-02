import { useEffect } from "react";
import Pusher from "pusher-js";

const pusher = new Pusher("e97d599fd9d4473f90d2", {
  cluster: "us2",
});

const usePusherRoom = (roomId, onMessage) => {
  useEffect(() => {
    if (!roomId) return undefined;

    const roomChannelName = `chat-${roomId}`;
    const roomChannel = pusher.subscribe(roomChannelName);

    roomChannel.bind("newMessage", onMessage);

    return () => {
      roomChannel.unbind("newMessage", onMessage);
      pusher.unsubscribe(roomChannelName);
    };
  }, [roomId, onMessage]);
};

export default usePusherRoom;
