import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import Temp from "@/components/Temp";
import WorldHeatMap from "@/components/WorldHeatMap";
import CovidDashboard from "@/components/dashboard4";
// import CovidDashboard from "@/components/Covid";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  return (
    <div className="">
      <CovidDashboard/>
    </div>
  );
}
