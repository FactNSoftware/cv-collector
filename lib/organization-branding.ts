import {
  getAppTableClient,
  isTableConflictError,
  isTableNotFoundError,
} from "./azure-tables";
import {
  getOrganizationById,
  getOrganizationBySlug,
  type OrganizationRecord,
} from "./organizations";
import { getAppBaseHost, isValidTenantSlug } from "./app-url";

const ORGANIZATION_SETTINGS_TYPE = "organization-settings";
const ORGANIZATION_SETTINGS_ROW_KEY = "branding";
const ORGANIZATION_DOMAIN_SCOPE = "system:organization-domains";
const ORGANIZATION_DOMAIN_TYPE = "organization-domain";

type OrganizationBrandingEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  organizationId: string;
  customDomain?: string;
  domainVerified?: boolean;
  domainVerifiedAt?: number;
  themeJson?: string;
  tabTitle?: string;
  tabIconUrl?: string;
  emailDomain?: string;
  emailDomainVerified?: boolean;
  emailDomainVerifiedAt?: number;
  emailSenderName?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
};

type OrganizationDomainEntity = {
  partitionKey: string;
  rowKey: string;
  type: string;
  organizationId: string;
  organizationSlug: string;
  domain: string;
  verified?: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TenantTheme = {
  canvas: string;
  panel: string;
  panelStrong: string;
  sidebarAccent: string;
  sidebarAccentInk: string;
  ink: string;
  muted: string;
  brand: string;
  brandStrong: string;
  border: string;
  borderStrong: string;
};

export type OrganizationBrandingSettings = {
  organizationId: string;
  customDomain: string | null;
  domainVerified: boolean;
  domainVerifiedAt: string | null;
  theme: TenantTheme;
  tabTitle: string;
  tabIconUrl: string | null;
  emailDomain: string | null;
  emailDomainVerified: boolean;
  emailDomainVerifiedAt: string | null;
  emailSenderName: string;
  createdAt: string | null;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string;
};

export type EmailDomainDnsRecord = {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
  description: string;
};

export type EmailDomainVerifyResult = {
  spf: boolean;
  dkim1: boolean;
  dkim2: boolean;
  allVerified: boolean;
  message: string;
  details?: Record<string, string>;
};

export type TenantBrandingContext = {
  host: string | null;
  organization: OrganizationRecord | null;
  settings: OrganizationBrandingSettings | null;
  theme: TenantTheme;
};

export type TenantMetadata = {
  title: string;
  applicationName: string;
  description: string;
  iconUrl: string;
};

export const DEFAULT_TENANT_THEME: TenantTheme = {
  canvas: "#eef4ee",
  panel: "#fcfdf9",
  panelStrong: "#e5efe5",
  sidebarAccent: "#003d18",
  sidebarAccentInk: "#a5eb2e",
  ink: "#171a17",
  muted: "#667067",
  brand: "#a5eb2e",
  brandStrong: "#0f4f21",
  border: "#d4ded4",
  borderStrong: "#b8c9b8",
};

const TENANT_THEME_KEYS: Array<keyof TenantTheme> = [
  "canvas",
  "panel",
  "panelStrong",
  "sidebarAccent",
  "sidebarAccentInk",
  "ink",
  "muted",
  "brand",
  "brandStrong",
  "border",
  "borderStrong",
];

const toSettingsPartitionKey = (organizationId: string) => `org:${organizationId}:settings`;
const toDomainRowKey = (domain: string) => encodeURIComponent(domain);
const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeHexColor = (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return null;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex);

  if (!normalized) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
};

const withAlpha = (hex: string, alpha: number) => {
  const rgb = hexToRgb(hex);

  if (!rgb) {
    return `rgba(0, 0, 0, ${alpha.toFixed(2)})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(2)})`;
};

const parseThemeJson = (themeJson: string | undefined): TenantTheme => {
  if (!themeJson) {
    return { ...DEFAULT_TENANT_THEME };
  }

  try {
    const parsed = JSON.parse(themeJson) as Partial<Record<keyof TenantTheme, string>>;
    const theme: TenantTheme = { ...DEFAULT_TENANT_THEME };

    for (const key of TENANT_THEME_KEYS) {
      const candidate = parsed[key];

      if (typeof candidate !== "string") {
        continue;
      }

      const normalized = normalizeHexColor(candidate);

      if (normalized) {
        theme[key] = normalized;
      }
    }

    return theme;
  } catch {
    return { ...DEFAULT_TENANT_THEME };
  }
};

const normalizeThemeInput = (
  input: Partial<Record<keyof TenantTheme, string>>,
) => {
  const sanitized: Partial<Record<keyof TenantTheme, string>> = {};

  for (const [rawKey, rawValue] of Object.entries(input)) {
    if (!TENANT_THEME_KEYS.includes(rawKey as keyof TenantTheme)) {
      throw new Error(`Unknown theme key: ${rawKey}`);
    }

    if (typeof rawValue !== "string") {
      throw new Error(`Theme value for ${rawKey} must be a color string.`);
    }

    const normalized = normalizeHexColor(rawValue);

    if (!normalized) {
      throw new Error(`Theme value for ${rawKey} must be a valid hex color.`);
    }

    sanitized[rawKey as keyof TenantTheme] = normalized;
  }

  return sanitized;
};

const normalizeDomain = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }

  const raw = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(",")[0]
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .trim();

  if (!raw) {
    return "";
  }

  if (raw.startsWith("[")) {
    return "";
  }

  return raw
    .split(":")[0]
    .replace(/\.$/, "");
};

const normalizeOptionalText = (value: string | null | undefined, maxLength: number) => {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (normalized.length > maxLength) {
    throw new Error(`Value must be ${maxLength} characters or fewer.`);
  }

  return normalized;
};

const normalizeOptionalTabTitle = (value: string | null | undefined) => {
  return normalizeOptionalText(value, 120);
};

const normalizeOptionalIconUrl = (value: string | null | undefined) => {
  const normalized = normalizeOptionalText(value, 2048);

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("/")) {
    return normalized;
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error("Tab icon URL must be a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Tab icon URL must start with http:// or https://.");
  }

  return parsed.toString();
};

const isCustomDomainValid = (domain: string) => {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(domain);
};

const LOCALHOST_SUFFIX = ".localhost";

const getTenantSlugFromHost = (host: string) => {
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

const toBrandingSettings = (
  entity: OrganizationBrandingEntity,
): OrganizationBrandingSettings => {
  const customDomain = normalizeDomain(entity.customDomain);

  return {
    organizationId: entity.organizationId,
    customDomain: customDomain || null,
    domainVerified: entity.domainVerified === true,
    domainVerifiedAt:
      Number.isFinite(entity.domainVerifiedAt) && (entity.domainVerifiedAt ?? 0) > 0
        ? new Date(entity.domainVerifiedAt!).toISOString()
        : null,
    theme: parseThemeJson(entity.themeJson),
    tabTitle: entity.tabTitle?.trim() || "",
    tabIconUrl: normalizeOptionalIconUrl(entity.tabIconUrl) || null,
    emailDomain: normalizeDomain(entity.emailDomain) || null,
    emailDomainVerified: entity.emailDomainVerified === true,
    emailDomainVerifiedAt:
      Number.isFinite(entity.emailDomainVerifiedAt) && (entity.emailDomainVerifiedAt ?? 0) > 0
        ? new Date(entity.emailDomainVerifiedAt!).toISOString()
        : null,
    emailSenderName: entity.emailSenderName?.trim() || "",
    createdAt: Number.isFinite(entity.createdAt) && entity.createdAt > 0
      ? new Date(entity.createdAt).toISOString()
      : null,
    createdBy: entity.createdBy,
    updatedAt: Number.isFinite(entity.updatedAt) && entity.updatedAt > 0
      ? new Date(entity.updatedAt).toISOString()
      : null,
    updatedBy: entity.updatedBy,
  };
};

const getBrandingEntityByOrganizationId = async (
  organizationId: string,
): Promise<OrganizationBrandingEntity | null> => {
  const tableClient = await getAppTableClient();

  try {
    return await tableClient.getEntity<OrganizationBrandingEntity>(
      toSettingsPartitionKey(organizationId),
      ORGANIZATION_SETTINGS_ROW_KEY,
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const getDomainEntity = async (domain: string) => {
  const tableClient = await getAppTableClient();

  try {
    return await tableClient.getEntity<OrganizationDomainEntity>(
      ORGANIZATION_DOMAIN_SCOPE,
      toDomainRowKey(domain),
    );
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return null;
    }

    throw error;
  }
};

const deleteDomainEntity = async (domain: string) => {
  const tableClient = await getAppTableClient();

  try {
    await tableClient.deleteEntity(ORGANIZATION_DOMAIN_SCOPE, toDomainRowKey(domain));
  } catch (error) {
    if (isTableNotFoundError(error)) {
      return;
    }

    throw error;
  }
};

export const removeOrganizationBrandingSettingsByOrganizationId = async (
  organizationId: string,
) => {
  const normalizedOrganizationId = organizationId.trim();

  if (!normalizedOrganizationId) {
    return;
  }

  const existingEntity = await getBrandingEntityByOrganizationId(normalizedOrganizationId);

  if (!existingEntity) {
    return;
  }

  const customDomain = normalizeDomain(existingEntity.customDomain);
  const tableClient = await getAppTableClient();

  try {
    await tableClient.deleteEntity(
      toSettingsPartitionKey(normalizedOrganizationId),
      ORGANIZATION_SETTINGS_ROW_KEY,
    );
  } catch (error) {
    if (!isTableNotFoundError(error)) {
      throw error;
    }
  }

  if (customDomain) {
    await deleteDomainEntity(customDomain);
  }
};

const ensureDomainOwnership = async ({
  domain,
  organization,
}: {
  domain: string;
  organization: OrganizationRecord;
}) => {
  const tableClient = await getAppTableClient();
  const now = Date.now();
  const rowKey = toDomainRowKey(domain);

  try {
    await tableClient.createEntity<OrganizationDomainEntity>({
      partitionKey: ORGANIZATION_DOMAIN_SCOPE,
      rowKey,
      type: ORGANIZATION_DOMAIN_TYPE,
      organizationId: organization.id,
      organizationSlug: organization.slug,
      domain,
      verified: false, // starts unverified; activated after DNS check
      createdAt: now,
      updatedAt: now,
    });
    return;
  } catch (error) {
    if (!isTableConflictError(error)) {
      throw error;
    }
  }

  const existing = await getDomainEntity(domain);

  if (!existing) {
    throw new Error("Custom domain conflict. Try again.");
  }

  if (existing.organizationId !== organization.id) {
    throw new Error("Custom domain is already assigned to another organization.");
  }

  await tableClient.upsertEntity<OrganizationDomainEntity>({
    partitionKey: ORGANIZATION_DOMAIN_SCOPE,
    rowKey,
    type: ORGANIZATION_DOMAIN_TYPE,
    organizationId: organization.id,
    organizationSlug: organization.slug,
    domain,
    verified: existing.verified === true, // preserve if already verified
    createdAt: existing.createdAt,
    updatedAt: now,
  }, "Replace");
};

const setDomainEntityVerified = async (
  domain: string,
  verified: boolean,
): Promise<void> => {
  const existing = await getDomainEntity(domain);
  if (!existing) return;
  const tableClient = await getAppTableClient();
  await tableClient.upsertEntity<OrganizationDomainEntity>(
    { ...existing, verified, updatedAt: Date.now() },
    "Replace",
  );
};

export const getOrganizationBrandingSettingsByOrganizationId = async (
  organizationId: string,
): Promise<OrganizationBrandingSettings | null> => {
  const entity = await getBrandingEntityByOrganizationId(organizationId);
  return entity ? toBrandingSettings(entity) : null;
};

export const getOrganizationBrandingSettingsBySlug = async (
  slug: string,
) => {
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    return {
      organization: null,
      settings: null,
    };
  }

  const settings = await getOrganizationBrandingSettingsByOrganizationId(organization.id);

  return {
    organization,
    settings,
  };
};

export const upsertOrganizationBrandingSettings = async ({
  slug,
  customDomain,
  theme,
  tabTitle,
  tabIconUrl,
  domainVerified,
  emailDomain,
  emailSenderName,
  emailDomainVerified,
  updatedBy,
}: {
  slug: string;
  customDomain?: string | null;
  theme?: Partial<Record<keyof TenantTheme, string>>;
  tabTitle?: string;
  tabIconUrl?: string | null;
  /** Explicitly mark the current custom domain as DNS-verified (or reset to false). */
  domainVerified?: boolean;
  emailDomain?: string | null;
  emailSenderName?: string;
  /** Explicitly mark the current email domain as DNS-verified (or reset to false). */
  emailDomainVerified?: boolean;
  updatedBy: string;
}) => {
  const organization = await getOrganizationBySlug(slug);

  if (!organization) {
    throw new Error("Organization not found.");
  }

  const normalizedUpdatedBy = normalizeEmail(updatedBy);

  if (!normalizedUpdatedBy) {
    throw new Error("updatedBy is required.");
  }

  const existingEntity = await getBrandingEntityByOrganizationId(organization.id);
  const existingSettings = existingEntity
    ? toBrandingSettings(existingEntity)
    : {
      organizationId: organization.id,
      customDomain: null,
      theme: { ...DEFAULT_TENANT_THEME },
      tabTitle: "",
      tabIconUrl: null,
      emailDomain: null,
      emailDomainVerified: false,
      emailDomainVerifiedAt: null,
      emailSenderName: "",
      createdAt: null,
      createdBy: normalizedUpdatedBy,
      updatedAt: null,
      updatedBy: normalizedUpdatedBy,
    };

  const normalizedThemePatch = theme ? normalizeThemeInput(theme) : {};
  const changedThemeKeys = Object.keys(normalizedThemePatch) as Array<keyof TenantTheme>;
  const nextTheme: TenantTheme = {
    ...existingSettings.theme,
    ...normalizedThemePatch,
  };
  const nextTabTitle = tabTitle !== undefined
    ? normalizeOptionalTabTitle(tabTitle)
    : existingSettings.tabTitle;
  const nextTabIconUrl = tabIconUrl !== undefined
    ? (normalizeOptionalIconUrl(tabIconUrl) || null)
    : existingSettings.tabIconUrl;

  let nextCustomDomain = existingSettings.customDomain;

  if (customDomain !== undefined) {
    const normalizedDomain = normalizeDomain(customDomain);

    if (normalizedDomain && !isCustomDomainValid(normalizedDomain)) {
      throw new Error("Custom domain must be a valid hostname (for example careers.example.com).");
    }

    nextCustomDomain = normalizedDomain || null;
  }

  const domainChanged = nextCustomDomain !== existingSettings.customDomain;

  if (domainChanged && nextCustomDomain) {
    await ensureDomainOwnership({
      domain: nextCustomDomain,
      organization,
    });
  }

  // Determine verified status: domain change always resets. Explicit flag overrides.
  const nextDomainVerified = domainChanged
    ? false
    : (domainVerified !== undefined ? domainVerified : (existingEntity?.domainVerified === true));
  const nextDomainVerifiedAt = nextDomainVerified
    ? (existingEntity?.domainVerifiedAt && existingEntity.domainVerified === true
        ? existingEntity.domainVerifiedAt
        : Date.now())
    : undefined;

  // Sync verification flag to the domain routing entity
  if (!domainChanged && domainVerified !== undefined && nextCustomDomain) {
    await setDomainEntityVerified(nextCustomDomain, nextDomainVerified);
  }

  // ── Email domain ───────────────────────────────────────────────────────────
  let nextEmailDomain = existingSettings.emailDomain;
  if (emailDomain !== undefined) {
    const normalized = normalizeDomain(emailDomain);
    if (normalized && !isCustomDomainValid(normalized)) {
      throw new Error("Email domain must be a valid hostname (for example mail.example.com).");
    }
    nextEmailDomain = normalized || null;
  }
  const emailDomainChanged = nextEmailDomain !== existingSettings.emailDomain;
  const nextEmailDomainVerified = emailDomainChanged
    ? false
    : (emailDomainVerified !== undefined ? emailDomainVerified : (existingEntity?.emailDomainVerified === true));
  const nextEmailDomainVerifiedAt = nextEmailDomainVerified
    ? (existingEntity?.emailDomainVerifiedAt && existingEntity.emailDomainVerified === true
        ? existingEntity.emailDomainVerifiedAt
        : Date.now())
    : undefined;
  const nextEmailSenderName =
    emailSenderName !== undefined ? emailSenderName.trim() : (existingEntity?.emailSenderName?.trim() ?? "");
  const now = Date.now();
  const tableClient = await getAppTableClient();
  const entity: OrganizationBrandingEntity = {
    partitionKey: toSettingsPartitionKey(organization.id),
    rowKey: ORGANIZATION_SETTINGS_ROW_KEY,
    type: ORGANIZATION_SETTINGS_TYPE,
    organizationId: organization.id,
    customDomain: nextCustomDomain || "",
    domainVerified: nextDomainVerified,
    domainVerifiedAt: nextDomainVerifiedAt,
    themeJson: JSON.stringify(nextTheme),
    tabTitle: nextTabTitle,
    tabIconUrl: nextTabIconUrl || "",
    emailDomain: nextEmailDomain || "",
    emailDomainVerified: nextEmailDomainVerified,
    emailDomainVerifiedAt: nextEmailDomainVerifiedAt,
    emailSenderName: nextEmailSenderName,
    createdAt: existingEntity?.createdAt ?? now,
    createdBy: existingEntity?.createdBy ?? normalizedUpdatedBy,
    updatedAt: now,
    updatedBy: normalizedUpdatedBy,
  };

  await tableClient.upsertEntity(entity, "Replace");

  if (domainChanged && existingSettings.customDomain && existingSettings.customDomain !== nextCustomDomain) {
    await deleteDomainEntity(existingSettings.customDomain);
  }

  return {
    organization,
    settings: toBrandingSettings(entity),
    changedThemeKeys,
    domainChanged,
  };
};

export const getTenantMetadata = (
  organization: OrganizationRecord | null,
  settings: OrganizationBrandingSettings | null,
): TenantMetadata => {
  const resolvedTitle = settings?.tabTitle?.trim()
    || organization?.name?.trim()
    || "Talent Workspace";
  const resolvedIconUrl = settings?.tabIconUrl?.trim()
    || organization?.logoUrl?.trim()
    || "/icon.svg";

  return {
    title: resolvedTitle,
    applicationName: resolvedTitle,
    description: organization?.description?.trim()
      || "A modern recruiting workspace for jobs, applications, candidate review, and hiring collaboration.",
    iconUrl: resolvedIconUrl,
  };
};

export const resolveOrganizationByCustomDomain = async (host: string | null) => {
  const normalizedHost = normalizeDomain(host);

  if (!normalizedHost) {
    return null;
  }

  const domainEntity = await getDomainEntity(normalizedHost);

  if (!domainEntity || domainEntity.type !== ORGANIZATION_DOMAIN_TYPE) {
    return null;
  }

  // Only explicitly verified domains are active. Pending / legacy entries
  // without verification must not be used for routing.
  if (domainEntity.verified !== true) {
    return null;
  }

  const organization = await getOrganizationById(domainEntity.organizationId)
    ?? await getOrganizationBySlug(domainEntity.organizationSlug);

  if (!organization || organization.id !== domainEntity.organizationId) {
    return null;
  }

  return organization;
};

export const resolveTenantBrandingFromHost = async (
  host: string | null,
): Promise<TenantBrandingContext> => {
  const normalizedHost = normalizeDomain(host);

  if (!normalizedHost) {
    return {
      host: null,
      organization: null,
      settings: null,
      theme: { ...DEFAULT_TENANT_THEME },
    };
  }

  try {
    const organization = await resolveOrganizationByCustomDomain(normalizedHost)
      ?? await (async () => {
        const slug = getTenantSlugFromHost(normalizedHost);
        return slug ? getOrganizationBySlug(slug) : null;
      })();

    if (!organization) {
      return {
        host: normalizedHost,
        organization: null,
        settings: null,
        theme: { ...DEFAULT_TENANT_THEME },
      };
    }

    const settings = await getOrganizationBrandingSettingsByOrganizationId(organization.id);

    return {
      host: normalizedHost,
      organization,
      settings,
      theme: settings?.theme ?? { ...DEFAULT_TENANT_THEME },
    };
  } catch {
    return {
      host: normalizedHost,
      organization: null,
      settings: null,
      theme: { ...DEFAULT_TENANT_THEME },
    };
  }
};

/**
 * Performs a server-side DNS CNAME lookup to confirm that `domain` points to
 * `platformHost`. Returns `{ verified, message }` — does NOT write to storage.
 */
export const verifyCustomDomain = async (
  domain: string,
  platformHost: string,
): Promise<{ verified: boolean; message: string; details?: string }> => {
  const dns = await import("node:dns");
  const target = platformHost.toLowerCase().replace(/\.$/, "");

  try {
    const cnames = await dns.promises.resolveCname(domain);
    for (const cname of cnames) {
      if (cname.toLowerCase().replace(/\.$/, "") === target) {
        return { verified: true, message: "DNS record verified. Your domain is now active." };
      }
    }
    return {
      verified: false,
      message: `CNAME found but is pointing to the wrong destination.`,
      details: `Expected: ${platformHost} — Found: ${cnames.join(", ")}`,
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENODATA" || code === "ENOTFOUND" || code === "ENOTDIR") {
      return {
        verified: false,
        message: "No CNAME record found for this domain.",
        details: "Add the DNS record shown below, then wait for propagation (usually minutes, up to 48 hours) and try again.",
      };
    }
    throw err;
  }
};

/**
 * Returns the ACS sending domain derived from AZURE_EMAIL_SENDER_ADDRESS
 * (e.g. "DoNotReply@abc.azurecomm.net" → "abc.azurecomm.net").
 */
const getAcsSenderDomain = (): string => {
  const sender = process.env.AZURE_EMAIL_SENDER_ADDRESS ?? "";
  const atIdx = sender.indexOf("@");
  if (atIdx === -1) return "";
  return sender.slice(atIdx + 1).toLowerCase().trim();
};

/**
 * Returns the DNS records that must be added to `emailDomain` so that Azure
 * Communication Services can send email on behalf of that domain.
 */
export const getEmailDomainDnsRecords = (emailDomain: string): EmailDomainDnsRecord[] => {
  const acsDomain = getAcsSenderDomain();
  const dashed = emailDomain.replace(/\./g, "-");
  return [
    {
      type: "TXT",
      name: emailDomain,
      value: "v=spf1 include:spf.protection.outlook.com ~all",
      description: "SPF — authorises Azure mail servers to send on behalf of your domain.",
    },
    {
      type: "CNAME",
      name: `selector1._domainkey.${emailDomain}`,
      value: acsDomain ? `selector1-${dashed}._domainkey.${acsDomain}` : `selector1-${dashed}._domainkey.mail.azurecomm.net`,
      description: "DKIM key 1 — used by receiving servers to verify email authenticity.",
    },
    {
      type: "CNAME",
      name: `selector2._domainkey.${emailDomain}`,
      value: acsDomain ? `selector2-${dashed}._domainkey.${acsDomain}` : `selector2-${dashed}._domainkey.mail.azurecomm.net`,
      description: "DKIM key 2 — rotating pair for uninterrupted key rotation.",
    },
  ];
};

/**
 * DNS-validates SPF (TXT) and both DKIM CNAME records for a custom email domain.
 * Does NOT write to storage — call upsertOrganizationBrandingSettings with
 * emailDomainVerified=true to persist a successful result.
 */
export const verifyEmailDomain = async (
  emailDomain: string,
): Promise<EmailDomainVerifyResult> => {
  const dns = await import("node:dns");
  const records = getEmailDomainDnsRecords(emailDomain);
  const dkim1Record = records[1];
  const dkim2Record = records[2];
  const details: Record<string, string> = {};

  // ── SPF ──────────────────────────────────────────────────────────────────
  let spf = false;
  try {
    const txtSets = await dns.promises.resolveTxt(emailDomain);
    const flat = txtSets.map((chunks) => chunks.join("")).join("\n");
    details.spfFound = flat || "(none)";
    spf = flat.includes("v=spf1") && flat.includes("spf.protection.outlook.com");
  } catch {
    details.spfError = "No TXT records found (or DNS error).";
  }

  // ── DKIM 1 ───────────────────────────────────────────────────────────────
  let dkim1 = false;
  try {
    const cnames1 = await dns.promises.resolveCname(dkim1Record.name);
    details.dkim1Found = cnames1.join(", ") || "(none)";
    const expectedSuffix = `._domainkey.${getAcsSenderDomain()}`;
    dkim1 = cnames1.some((c) => c.toLowerCase().includes("._domainkey.") &&
      (getAcsSenderDomain() ? c.toLowerCase().endsWith(expectedSuffix) : c.toLowerCase().includes("._domainkey.")));
  } catch {
    details.dkim1Error = "No CNAME found for selector1._domainkey." + emailDomain;
  }

  // ── DKIM 2 ───────────────────────────────────────────────────────────────
  let dkim2 = false;
  try {
    const cnames2 = await dns.promises.resolveCname(dkim2Record.name);
    details.dkim2Found = cnames2.join(", ") || "(none)";
    const expectedSuffix = `._domainkey.${getAcsSenderDomain()}`;
    dkim2 = cnames2.some((c) => c.toLowerCase().includes("._domainkey.") &&
      (getAcsSenderDomain() ? c.toLowerCase().endsWith(expectedSuffix) : c.toLowerCase().includes("._domainkey.")));
  } catch {
    details.dkim2Error = "No CNAME found for selector2._domainkey." + emailDomain;
  }

  const allVerified = spf && dkim1 && dkim2;
  const failed = [!spf && "SPF", !dkim1 && "DKIM (selector1)", !dkim2 && "DKIM (selector2)"].filter(Boolean);

  return {
    spf,
    dkim1,
    dkim2,
    allVerified,
    message: allVerified
      ? "All DNS records verified. Email domain is active."
      : `Verification failed: ${failed.join(", ")} ${failed.length === 1 ? "record is" : "records are"} missing or incorrect.`,
    details,
  };
};

/**
 * Returns the verified sender address for an organization, falling back to the
 * platform system sender if no custom email domain is configured.
 */
export const getOrgEmailSender = async (
  organizationId: string,
): Promise<{ address: string; displayName: string }> => {
  const settings = await getOrganizationBrandingSettingsByOrganizationId(organizationId);
  if (settings?.emailDomain && settings.emailDomainVerified) {
    const domain = settings.emailDomain;
    const name = settings.emailSenderName || "";
    return { address: `noreply@${domain}`, displayName: name };
  }
  return { address: "", displayName: "" }; // caller falls back to system default
};

export const toTenantCssVariables = (theme: TenantTheme): Record<string, string> => {
  return {
    "--color-canvas": theme.canvas,
    "--color-panel": theme.panel,
    "--color-panel-strong": theme.panelStrong,
    "--color-sidebar-accent": theme.sidebarAccent,
    "--color-sidebar-accent-ink": theme.sidebarAccentInk,
    "--color-ink": theme.ink,
    "--color-muted": theme.muted,
    "--color-brand": theme.brand,
    "--color-brand-strong": theme.brandStrong,
    "--color-border": theme.border,
    "--color-border-strong": theme.borderStrong,
    "--color-bg-radial-a": withAlpha(theme.brand, 0.16),
    "--color-bg-radial-b": withAlpha(theme.sidebarAccent, 0.08),
    "--color-bg-linear-start": theme.panel,
    "--color-bg-linear-end": theme.canvas,
    "--color-selection": withAlpha(theme.brand, 0.24),
    "--color-focus-ring": withAlpha(theme.brand, 0.18),
    "--color-link": theme.brandStrong,
    "--color-link-hover": theme.sidebarAccent,
    "--color-overlay": withAlpha(theme.sidebarAccent, 0.14),
    "--color-dialog-overlay": withAlpha(theme.sidebarAccent, 0.48),
    "--shadow-soft": `0 24px 60px ${withAlpha(theme.sidebarAccent, 0.08)}`,
  };
};
