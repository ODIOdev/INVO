"use client";

import { useEffect } from "react";
import { runAppInitSync } from "@/lib/storage/dbClient";

export function AppInitSync() {
  useEffect(() => {
    runAppInitSync().catch(() => {});
  }, []);

  return null;
}
