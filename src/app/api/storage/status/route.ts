import { NextResponse } from "next/server";
import { getStorageBackend } from "@/lib/storage/internalDatabase";

export async function GET() {
  return NextResponse.json({
    backend: getStorageBackend(),
    cloud: getStorageBackend() === "redis",
  });
}
