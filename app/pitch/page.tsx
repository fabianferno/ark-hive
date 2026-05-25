import type { Metadata } from "next";
import { PitchDeck } from "@/components/pitch/PitchDeck";

export const metadata: Metadata = {
  title: "Pitch",
  description:
    "Ark-Hive turns an AI agent's entire cognition into a public, verifiable, query-able data layer on Arkiv.",
};

export default function PitchPage() {
  return <PitchDeck />;
}
