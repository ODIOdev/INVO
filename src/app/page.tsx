import { cookies } from "next/headers";
import LandingPage from "@/components/LandingPage";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

export const metadata = {
  title: "Over Drive OS — Invoice & Quote System",
  description: "Create professional quotes and invoices for your clients.",
};

export default async function Home() {
  const cookieStore = await cookies();
  const profile = await verifyAdminSessionToken(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value
  );

  return <LandingPage profile={profile} />;
}
