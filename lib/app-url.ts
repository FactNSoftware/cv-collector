const DEFAULT_APP_URL = "https://recruitment.factnsoftware.com";

export const getAppBaseUrl = () => {
  const configured = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  return configured.replace(/\/+$/, "");
};
