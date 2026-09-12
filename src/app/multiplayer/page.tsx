import type { Metadata } from "next";
import MyMultiplayerGamesClient from "./MyMultiplayerGamesClient";

export const metadata: Metadata = { title: "My Multiplayer Games — EduGame" };

export default function MultiplayerIndexPage() {
  return <MyMultiplayerGamesClient />;
}
