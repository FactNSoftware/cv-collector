import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { redirectIfAuthenticated } from "../lib/auth-guards";
import { getAppBaseHost, isValidTenantSlug } from "../lib/app-url";
import { OtpLoginForm } from "./components/OtpLoginForm";

export const dynamic = "force-dynamic";

const LOCALHOST_SUFFIX = ".localhost";

const normalizeHost = (value: string | null) => {
  if (!value) {
    return "";
  }

  return value
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .split(":")[0];
};

const toTenantSlugFromHost = (host: string) => {
  const baseHost = getAppBaseHost();

  if (baseHost && host !== baseHost) {
    const suffix = `.${baseHost}`;

    if (host.endsWith(suffix)) {
      const subdomain = host.slice(0, -suffix.length);

      if (subdomain && !subdomain.includes(".") && isValidTenantSlug(subdomain)) {
        return subdomain;
      }
    }
  }

  if (process.env.NODE_ENV !== "production" && host.endsWith(LOCALHOST_SUFFIX)) {
    const subdomain = host.slice(0, -LOCALHOST_SUFFIX.length);

    if (subdomain && !subdomain.includes(".") && isValidTenantSlug(subdomain)) {
      return subdomain;
    }
  }

  return null;
};

export default async function Home() {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host")
    ?? requestHeaders.get("host"),
  );
  const tenantSlug = host ? toTenantSlugFromHost(host) : null;

  if (tenantSlug) {
    redirect(`/o/${tenantSlug}`);
  }

  await redirectIfAuthenticated(null);
  return <OtpLoginForm />;
}
