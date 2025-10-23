import "./globals.css";
import { Kanit } from "next/font/google";

const kanit = Kanit({ subsets: ["latin"], weight: ["300","400","500","600","700"] });

export const metadata = {
  title: "EchoApp",
  description: "Prototype smart search + map",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={kanit.className} style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
{/* Top actions bar (fixed) */}
<div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 w-[min(980px,92vw)] flex items-center justify-between">
  <div className="flex items-center gap-2">
    <button id="btn-layers" className="px-3 py-1.5 rounded-xl bg-white/95 border shadow">Layers</button>
  </div>
  <div className="flex items-center gap-2">
    <button id="btn-mydata" className="px-3 py-1.5 rounded-xl bg-white/95 border shadow">My Data</button>
    <button id="btn-input"  className="px-3 py-1.5 rounded-xl bg-white/95 border shadow">Input</button>
    <button id="btn-export" className="px-3 py-1.5 rounded-xl bg-white/95 border shadow">Export</button>
    <button id="btn-account" className="px-3 py-1.5 rounded-xl bg-white/95 border shadow">Account</button>
  </div>
</div>
