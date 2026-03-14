import { OtpLoginForm } from "./components/OtpLoginForm";
import { redirectIfAuthenticated } from "../lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function Home(
  props: { searchParams?: Promise<{ next?: string }> },
) {
  const searchParams = await props.searchParams;
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : null;
  await redirectIfAuthenticated(nextPath);

  return <OtpLoginForm />;
}
