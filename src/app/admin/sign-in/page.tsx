import { Suspense } from "react";
import AdminSignInForm from "@/components/admin/AdminSignInForm";

export const metadata = {
  title: "Sign in | Over Drive OS Dashboard",
  description: "Sign in to the Over Drive OS admin dashboard",
};

export default function AdminSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#eceef1] text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <AdminSignInForm />
    </Suspense>
  );
}
