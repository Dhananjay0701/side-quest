"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* SW registration failed — app still works as a website */
    });
  }, []);

  return null;
}
