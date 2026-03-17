import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  getAuthSessionFromCookies,
  getAuthSessionFromRequest,
  type AuthSession,
} from "./auth-session";
import { isAdminEmail } from "./admin-access";
import {
  resolveOrganizationAccess,
  type OrganizationMembership,
  type OrganizationRecord,
} from "./organizations";
import { isSuperAdminEmail } from "./super-admin-access";

const UNAUTHORIZED_MESSAGE = "Unauthorized.";
const NOT_FOUND_MESSAGE = "Not found.";

type ApiAuthResult =
  | { session: AuthSession }
  | { response: NextResponse };

type OrganizationApiAuthResult =
  | {
    session: AuthSession;
    organization: OrganizationRecord;
    membership: OrganizationMembership | null;
    isSuperAdmin: boolean;
  }
  | { response: NextResponse };

export type OrganizationPageSession = {
  session: AuthSession;
  organization: OrganizationRecord;
  membership: OrganizationMembership | null;
  isSuperAdmin: boolean;
};

export const requireApiSession = async (request: Request): Promise<ApiAuthResult> => {
  const session = await getAuthSessionFromRequest(request);

  if (!session) {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 401 },
      ),
    };
  }

  return { session };
};

export const requirePageSession = async (): Promise<AuthSession> => {
  const session = await getAuthSessionFromCookies();

  if (!session) {
    redirect("/");
  }

  return session;
};

export const requireAdminApiSession = async (request: Request): Promise<ApiAuthResult> => {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth;
  }

  const isAdmin = await isAdminEmail(auth.session.email);

  if (!isAdmin) {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 403 },
      ),
    };
  }

  return auth;
};

export const requireSuperAdminApiSession = async (
  request: Request,
): Promise<ApiAuthResult> => {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth;
  }

  const isSuperAdmin = await isSuperAdminEmail(auth.session.email);

  if (!isSuperAdmin) {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 403 },
      ),
    };
  }

  return auth;
};

export const requireAdminPageSession = async (): Promise<AuthSession> => {
  const session = await requirePageSession();
  const isAdmin = await isAdminEmail(session.email);

  if (!isAdmin) {
    redirect("/apply");
  }

  return session;
};

export const requireCandidatePageSession = async (): Promise<AuthSession> => {
  const session = await requirePageSession();
  const isAdmin = await isAdminEmail(session.email);

  if (isAdmin) {
    redirect("/admin");
  }

  return session;
};

const resolveOrganizationPageAccess = async (
  organizationSlug: string,
): Promise<OrganizationPageSession> => {
  const session = await requirePageSession();
  const [{ organization, membership }, isSuperAdmin] = await Promise.all([
    resolveOrganizationAccess({
      slug: organizationSlug,
      email: session.email,
    }),
    isSuperAdminEmail(session.email),
  ]);

  if (!organization) {
    redirect("/applications");
  }

  if (organization.status !== "active") {
    redirect("/applications");
  }

  if (!isSuperAdmin && !membership) {
    redirect("/applications");
  }

  return {
    session,
    organization,
    membership,
    isSuperAdmin,
  };
};

export const requireOrganizationAdminPageSession = async (
  organizationSlug: string,
): Promise<OrganizationPageSession> => {
  return resolveOrganizationPageAccess(organizationSlug);
};

export const requireOrganizationOwnerPageSession = async (
  organizationSlug: string,
): Promise<OrganizationPageSession> => {
  const access = await resolveOrganizationPageAccess(organizationSlug);

  if (!access.isSuperAdmin && access.membership?.role !== "owner") {
    redirect("/applications");
  }

  return access;
};

export const requireSuperAdminPageSession = async (): Promise<AuthSession> => {
  const session = await requirePageSession();
  const isSuperAdmin = await isSuperAdminEmail(session.email);

  if (!isSuperAdmin) {
    redirect("/apply");
  }

  return session;
};

export const requireOrganizationAccessApiSession = async (
  request: Request,
  organizationSlug: string,
): Promise<OrganizationApiAuthResult> => {
  const auth = await requireApiSession(request);

  if ("response" in auth) {
    return auth;
  }

  const [{ organization, membership }, isSuperAdmin] = await Promise.all([
    resolveOrganizationAccess({
      slug: organizationSlug,
      email: auth.session.email,
    }),
    isSuperAdminEmail(auth.session.email),
  ]);

  if (!organization) {
    return {
      response: NextResponse.json(
        { message: NOT_FOUND_MESSAGE },
        { status: 404 },
      ),
    };
  }

  if (organization.status !== "active") {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 403 },
      ),
    };
  }

  if (!isSuperAdmin && !membership) {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 403 },
      ),
    };
  }

  return {
    session: auth.session,
    organization,
    membership,
    isSuperAdmin,
  };
};

export const requireOrganizationOwnerApiSession = async (
  request: Request,
  organizationSlug: string,
): Promise<OrganizationApiAuthResult> => {
  const auth = await requireOrganizationAccessApiSession(request, organizationSlug);

  if ("response" in auth) {
    return auth;
  }

  if (!auth.isSuperAdmin && auth.membership?.role !== "owner") {
    return {
      response: NextResponse.json(
        { message: UNAUTHORIZED_MESSAGE },
        { status: 403 },
      ),
    };
  }

  return auth;
};

const getPortalAccessFlags = async (email: string) => {
  const [isSuperAdmin, isAdmin] = await Promise.all([
    isSuperAdminEmail(email),
    isAdminEmail(email),
  ]);

  return {
    isSuperAdmin,
    isAdmin,
  };
};

export const getDefaultPortalPath = async (email: string) => {
  const access = await getPortalAccessFlags(email);

  if (access.isSuperAdmin) {
    return "/system";
  }

  if (access.isAdmin) {
    return "/admin";
  }

  return "/applications";
};

const isSafeInternalPath = (path: string) => {
  return path.startsWith("/") && !path.startsWith("//");
};

export const getPostAuthRedirectPath = async (
  email: string,
  requestedPath?: string | null,
) => {
  const access = await getPortalAccessFlags(email);
  const defaultPath = access.isSuperAdmin
    ? "/system"
    : access.isAdmin
      ? "/admin"
      : "/applications";

  if (!requestedPath || !isSafeInternalPath(requestedPath)) {
    return defaultPath;
  }

  const isAdminPath = requestedPath.startsWith("/admin");
  const isSystemPath = requestedPath.startsWith("/system");
  const isTenantPath = requestedPath.startsWith("/o/");

  if (access.isSuperAdmin) {
    return isAdminPath || isSystemPath || isTenantPath ? requestedPath : defaultPath;
  }

  if (access.isAdmin) {
    return isAdminPath || isTenantPath ? requestedPath : defaultPath;
  }

  return isAdminPath || isSystemPath ? defaultPath : requestedPath;
};

export const redirectIfAuthenticated = async (requestedPath?: string | null) => {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(await getPostAuthRedirectPath(session.email, requestedPath));
  }
};
