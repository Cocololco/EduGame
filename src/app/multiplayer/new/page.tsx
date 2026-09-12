import type { Metadata } from "next";
import NewMultiplayerClient from "./NewMultiplayerClient";

export const metadata: Metadata = { title: "New Multiplayer Game — EduGame" };

export default function NewMultiplayerPage() {
  return <NewMultiplayerClient />;
}
