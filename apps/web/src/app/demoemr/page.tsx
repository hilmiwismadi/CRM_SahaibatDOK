import type { Metadata } from "next";
import DemoEmr from "./DemoEmr";

export const metadata: Metadata = {
  title: "Demo DOK Companion",
  description: "Simulasi ekstensi DOK Companion mengisi EMR yang sudah dipakai klinik",
};

export default function DemoEmrPage() {
  return <DemoEmr />;
}
