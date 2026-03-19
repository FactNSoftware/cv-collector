import { redirectIfAuthenticated } from "../lib/auth-guards";
import { OtpLoginForm } from "./components/OtpLoginForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  await redirectIfAuthenticated(null);
  return <OtpLoginForm />;
}
