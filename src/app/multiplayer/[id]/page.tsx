import type { Metadata } from "next";
import MultiplayerRoomClient from "./MultiplayerRoomClient";

export const metadata: Metadata = { title: "Multiplayer — EduGame" };

export default function MultiplayerRoomPage() {
  return <MultiplayerRoomClient />;
}
