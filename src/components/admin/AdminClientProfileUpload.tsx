"use client";

import { useRef, useState } from "react";
import {
  PROFILE_IMAGE_ACCEPT,
  readProfileImageFile,
} from "@/lib/client-profile-image";

type AdminClientProfileUploadProps = {
  value: string;
  onChange: (profileImage: string) => void;
  initials: string;
  disabled?: boolean;
};

export default function AdminClientProfileUpload({
  value,
  onChange,
  initials,
  disabled = false,
}: AdminClientProfileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const dataUrl = await readProfileImageFile(file);
      onChange(dataUrl);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="admin-client-profile-preview">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold tracking-tight text-zinc-600">
            {initials}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800">Profile photo</p>
        <p className="mt-0.5 text-xs text-zinc-500">
          JPG, PNG, or WebP up to 5 MB
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="btn-outline px-3 py-1.5 text-xs"
            disabled={disabled || uploading}
          >
            {uploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
          </button>
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setUploadError(null);
              }}
              className="btn-ghost text-xs"
              disabled={disabled || uploading}
            >
              Remove
            </button>
          ) : null}
        </div>
        {uploadError ? (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || uploading}
      />
    </div>
  );
}

export function AdminClientAvatar({
  profileImage,
  initials,
  className = "admin-client-avatar",
}: {
  profileImage: string;
  initials: string;
  className?: string;
}) {
  if (profileImage) {
    return (
      <span className={`${className} overflow-hidden p-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profileImage}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return <span className={className}>{initials}</span>;
}
