"use client";
import { useEffect, useState } from "react";

export default function Header({
  autohide = false,
  onVisibleChange,
}: {
  autohide?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    onVisibleChange?.(visible);
  }, [visible, onVisibleChange]);

  useEffect(() => {
    if (!autohide) return;
    let timer: any;
    const show = () => setVisible(true);
    const scheduleHide = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000);
    };
    const onMove = (e: MouseEvent) => {
      if (e.clientY < 96) show();
      scheduleHide();
    };
    window.addEventListener("mousemove", onMove);
    scheduleHide();
    return () => {
      window.removeEventListener("mousemove", onMove);
      clearTimeout(timer);
    };
  }, [autohide]);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 bg-panel/90 text-textOnDark shadow-card backdrop-blur-md transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-10 pointer-events-none"
      }`}
    >
      <div className="mx-auto flex items-center justify-between px-6 py-3 max-w-6xl">
        <div className="flex items-center gap-2 cursor-pointer">
          <span
            className="text-accent text-2xl font-semibold"
            style={{ fontFamily: "var(--font-kanit)" }}
          >
            echo.io
          </span>
        </div>

        <nav className="flex items-center gap-6 text-sm font-medium">
          <button className="hover:text-accent transition-colors">About</button>
          <button className="hover:text-accent transition-colors">Contact</button>
          <button className="bg-accent text-white px-4 py-1 rounded-2xl shadow-card hover:bg-accent/80 transition-all">
            Login
          </button>
        </nav>
      </div>
    </header>
  );
}
