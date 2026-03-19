import { redirectIfAuthenticated } from "../../../lib/auth-guards";
import { SystemLoginForm } from "../../components/SystemLoginForm";

export const dynamic = "force-dynamic";

export default async function SystemLoginPage() {
  await redirectIfAuthenticated("/system");

  return <SystemLoginForm />;
}
