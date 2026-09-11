import type { Metadata } from "next";
import MyGamesClient from "./MyGamesClient";

export const metadata: Metadata = { title: "My Games — EduGame" };

export default function MyGamesPage() {
  return <MyGamesClient />;
}
