import { OtpLoginForm } from "./components/OtpLoginForm";
import { redirectIfAuthenticated } from "../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function Home() {
  await redirectIfAuthenticated("/apply");

  return <OtpLoginForm />;
}
