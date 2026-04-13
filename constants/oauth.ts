import * as ReactNative from "react-native";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

// Extract scheme from bundle ID (last segment timestamp, prefixed with "manus")
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const bundleId = "space.manus.consulting.report.app.t20260406210209";
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

// Read from Constants.expoConfig.extra first (injected at build time via app.config.ts),
// then fall back to process.env for web/server-side rendering.
const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

const env = {
  portal: extra.oauthPortalUrl || process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL || "",
  server: extra.oauthServerUrl || process.env.EXPO_PUBLIC_OAUTH_SERVER_URL || "",
  appId: extra.appId || process.env.EXPO_PUBLIC_APP_ID || "",
  ownerId: extra.ownerOpenId || process.env.EXPO_PUBLIC_OWNER_OPEN_ID || "",
  ownerName: extra.ownerName || process.env.EXPO_PUBLIC_OWNER_NAME || "",
  apiBaseUrl: extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || "",
  deepLinkScheme: schemeFromBundleId,
};

export const OAUTH_PORTAL_URL = env.portal;
export const OAUTH_SERVER_URL = env.server;
export const APP_ID = env.appId;
export const OWNER_OPEN_ID = env.ownerId;
export const OWNER_NAME = env.ownerName;
export const API_BASE_URL = env.apiBaseUrl;

/**
 * Get the API base URL, deriving from current hostname if not set.
 * Metro runs on 8081, API server runs on 3000.
 * URL pattern: https://PORT-sandboxid.region.domain
 */
export function getApiBaseUrl(): string {
  // First: check app.config.ts extra.apiBaseUrl (injected at build time from EXPO_PACKAGER_PROXY_URL)
  const extraApiUrl = (Constants.expoConfig?.extra as any)?.apiBaseUrl ?? "";
  if (extraApiUrl) {
    return extraApiUrl.replace(/\/$/, "");
  }

  // If API_BASE_URL env var is set, use it
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/$/, "");
  }

  // On web, derive from current hostname by replacing port 8081 with 3000
  if (ReactNative.Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    // Pattern: 8081-sandboxid.region.domain -> 3000-sandboxid.region.domain
    const apiHostname = hostname.replace(/^8081-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
  }

  // On native (iOS/Android), derive from EXPO_PUBLIC_METRO_URL env var if available
  // Metro URL pattern: https://8081-sandboxid.region.domain -> API: https://3000-sandboxid.region.domain
  const metroUrl = process.env.EXPO_PUBLIC_METRO_URL ?? process.env.EXPO_PACKAGER_PROXY_URL ?? "";
  if (metroUrl) {
    const apiUrl = metroUrl.replace(/^(https?:\/\/)8081-/, "$13000-").replace(/\/+$/, "");
    if (apiUrl !== metroUrl) {
      return apiUrl;
    }
  }

  // Fallback: use the known sandbox API URL
  // This is derived from the Metro server URL at build time
  const knownApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";
  if (knownApiUrl) {
    return knownApiUrl.replace(/\/$/, "");
  }

  // Last resort fallback to empty (will use relative URL)
  return "";
}

export const SESSION_TOKEN_KEY = "app_session_token";
export const USER_INFO_KEY = "manus-runtime-user-info";

const encodeState = (value: string) => {
  if (typeof globalThis.btoa === "function") {
    return globalThis.btoa(value);
  }
  const BufferImpl = (globalThis as Record<string, any>).Buffer;
  if (BufferImpl) {
    return BufferImpl.from(value, "utf-8").toString("base64");
  }
  return value;
};

/**
 * Get the redirect URI for OAuth callback.
 * - Web: uses API server callback endpoint
 * - Native: uses API server /api/oauth/mobile endpoint which then redirects to manus:// deep link
 *   This avoids the exp:// scheme issue in Expo Go and the manus:// scheme rejection by OAuth server
 */
export const getRedirectUri = () => {
  if (ReactNative.Platform.OS === "web") {
    return `${getApiBaseUrl()}/api/oauth/callback`;
  } else {
    // Use server-side mobile callback endpoint
    // Server exchanges code for token, then redirects to manus:// deep link
    const apiBase = getApiBaseUrl();
    return `${apiBase}/api/oauth/mobile`;
  }
};

export const getLoginUrl = () => {
  const redirectUri = getRedirectUri();
  const state = encodeState(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", APP_ID);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

/**
 * Start OAuth login flow.
 *
 * On native platforms (iOS/Android), uses WebBrowser.openAuthSessionAsync which
 * supports ASWebAuthenticationSession on iOS — this correctly handles the manus* scheme
 * redirect even in Expo Go (unlike Linking.openURL which uses exp:// scheme).
 *
 * On web, this simply redirects to the login URL.
 *
 * @returns The redirect URL on success, or null.
 */
export async function startOAuthLogin(): Promise<string | null> {
  const loginUrl = getLoginUrl();
  const redirectUri = getRedirectUri();

  if (ReactNative.Platform.OS === "web") {
    // On web, just redirect
    if (typeof window !== "undefined") {
      window.location.href = loginUrl;
    }
    return null;
  }

  try {
    // openAuthSessionAsync uses ASWebAuthenticationSession on iOS and Chrome Custom Tabs on Android
    // The second parameter must be the FINAL redirect URI (manus*:// deep link),
    // NOT the intermediate server endpoint. The browser session closes when it sees
    // a URL starting with this scheme.
    const deepLinkBase = `${env.deepLinkScheme}://oauth/callback`;
    const result = await WebBrowser.openAuthSessionAsync(loginUrl, deepLinkBase);
    console.log("[OAuth] openAuthSessionAsync result:", result);

    if (result.type === "success" && result.url) {
      return result.url;
    }
    return null;
  } catch (error) {
    console.error("[OAuth] Failed to open auth session:", error);
    return null;
  }
}
