const DEFAULT_APP_URL = "https://recruitment.factnsoftware.com";

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

// Returns the cookie domain to use when setting the session cookie.
// For production deployments this scopes the cookie to all tenant subdomains
// (e.g. slug-a.example.com and slug-b.example.com) so a slug change does not
// invalidate the current session. For localhost / bare IP addresses the domain
// is left unset to avoid browser quirks with special hostnames.
export const getSessionCookieDomain = (): string | undefined => {
  const baseHost = getAppBaseHost();

  if (!baseHost || baseHost === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(baseHost)) {
    return undefined;
  }

  return `.${baseHost}`;
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
