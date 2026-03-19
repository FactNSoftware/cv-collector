import { getAuthSessionFromCookies } from "../../lib/auth-session";
import { PortalDiscoveryForm } from "../components/PortalDiscoveryForm";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await getAuthSessionFromCookies();

  return (
    <PortalDiscoveryForm
      initialVerifiedEmail={session?.email ?? null}
      hasSession={Boolean(session)}
    />
  );
}
