import type { Metadata } from "next";
import PlayClient from "./PlayClient";

export const metadata: Metadata = { title: "Play — EduGame" };

export default function SoloPlayPage() {
  return <PlayClient />;
}
