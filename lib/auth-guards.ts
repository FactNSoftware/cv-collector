import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  getAuthSessionFromCookies,
  getAuthSessionFromRequest,
  type AuthSession,
} from "./auth-session";

const UNAUTHORIZED_MESSAGE = "Unauthorized.";

type ApiAuthResult =
  | { session: AuthSession }
  | { response: NextResponse };

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

export const redirectIfAuthenticated = async (path: string) => {
  const session = await getAuthSessionFromCookies();

  if (session) {
    redirect(path);
  }
};
