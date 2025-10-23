import "./globals.css";
import { Kanit } from "next/font/google";

// Import Kanit Semi-Bold (weight 600)
const kanit = Kanit({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-kanit",
});

export const metadata = {
  title: "EchoApp",
  description: "More data, better data, better cities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* The Kanit variable adds the font globally */}
      <body className={kanit.variable}>{children}</body>
    </html>
  );
}
import Image from "next/image";

<button id="welcomeGo" className="icon-btn" title="Search">
  <Image
    src="/icons/EchoLogoWhite.png"
    alt="Search"
    width={18}
    height={18}
    className="icon-img"
    priority
  />
</button>

