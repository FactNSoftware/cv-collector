const DEFAULT_APP_URL = "https://recruitment.factnsoftware.com";
const LOCALHOST_SUFFIX = ".localhost";

export const normalizeHost = (value: string | null | undefined) => {
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

export const normalizeAuthority = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  return value
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
};

export const getRequestHost = (headers: Headers | { get(name: string): string | null }) => {
  return normalizeHost(headers.get("x-forwarded-host") ?? headers.get("host"));
};

export const getRequestAuthority = (headers: Headers | { get(name: string): string | null }) => {
  return normalizeAuthority(headers.get("x-forwarded-host") ?? headers.get("host"));
};

export const getAppBaseUrl = () => {
  const configured = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  return configured.replace(/\/+$/, "");
};

export const getAppBaseHost = () => {
  try {
    return new URL(getAppBaseUrl()).hostname.toLowerCase();
  } catch {
    return "";
  }
};

export const getSessionCookieDomain = (): string | undefined => {
  // Sessions are intentionally host-only. Root/base-host authentication and
  // tenant-host authentication are bridged with an explicit portal handoff
  // route, which is more reliable than attempting to share cookies across
  // subdomains and localhost variants.
  return undefined;
};

const TENANT_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export const isValidTenantSlug = (value: string) => {
  return TENANT_SLUG_PATTERN.test(value.trim().toLowerCase());
};

export const toTenantSubdomainHost = (slug: string) => {
  const normalizedSlug = slug.trim().toLowerCase();

  if (!isValidTenantSlug(normalizedSlug)) {
    return "";
  }

  const baseHost = getAppBaseHost();

  if (!baseHost) {
    return "";
  }

  return `${normalizedSlug}.${baseHost}`;
};

export const toTenantSubdomainUrl = (slug: string, path = "/") => {
  const host = toTenantSubdomainHost(slug);

  if (!host) {
    return "";
  }

  const baseUrl = new URL(getAppBaseUrl());
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  baseUrl.hostname = host;
  baseUrl.pathname = normalizedPath;
  return baseUrl.toString();
};

export const toTenantPortalUrl = ({
  slug,
  path = "/",
  requestAuthority,
  protocol = "https",
}: {
  slug: string;
  path?: string;
  requestAuthority?: string | null;
  protocol?: string | null;
}) => {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedProtocol = protocol === "http" || protocol === "https" ? protocol : "https";
  const baseHost = getAppBaseHost();

  if (baseHost && baseHost !== "localhost" && !/^\d+\.\d+\.\d+\.\d+$/.test(baseHost)) {
    return toTenantSubdomainUrl(normalizedSlug, normalizedPath);
  }

  const authority = normalizeAuthority(requestAuthority);

  if (!authority) {
    return "";
  }

  const [hostPart, portPart] = authority.split(":");
  const portSuffix = portPart ? `:${portPart}` : "";

  if (hostPart === "localhost" || hostPart.endsWith(LOCALHOST_SUFFIX)) {
    return `${normalizedProtocol}://${normalizedSlug}.localhost${portSuffix}${normalizedPath}`;
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostPart)) {
    return "";
  }

  return `${normalizedProtocol}://${normalizedSlug}.${hostPart}${portSuffix}${normalizedPath}`;
};
