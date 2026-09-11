import type { Metadata } from "next";
import FinancialsClient from "./FinancialsClient";

export const metadata: Metadata = { title: "Financials — EduGame" };

export default function FinancialsPage() {
  return <FinancialsClient />;
}
