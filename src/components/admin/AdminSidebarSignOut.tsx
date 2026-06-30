"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminSidebarSignOut() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.replace("/admin/sign-in");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={signingOut}
      className="admin-sidebar-link w-full disabled:opacity-50"
    >
      <span className="admin-nav-icon admin-nav-icon-muted" aria-hidden>
        <span className="text-[13px] font-semibold leading-none text-zinc-500">↩</span>
      </span>
      <span className="flex-1 text-left text-[13px] font-medium text-zinc-700">
        {signingOut ? "Signing out…" : "Sign out"}
      </span>
    </button>
  );
}
