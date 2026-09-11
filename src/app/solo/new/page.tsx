import type { Metadata } from "next";
import NewGameClient from "./NewGameClient";

export const metadata: Metadata = { title: "New Game — EduGame" };

export default function NewSoloGamePage() {
  return <NewGameClient />;
}
