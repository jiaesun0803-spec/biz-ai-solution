import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * IMPORTANT (tRPC v11): The `transformer` must be inside `httpBatchLink`,
 * NOT at the root createClient level. This ensures client and server
 * use the same serialization format (superjson).
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiBaseUrl()}/api/trpc`,
        // tRPC v11: transformer MUST be inside httpBatchLink, not at root
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        // AI 보고서 생성 등 장시간 요청을 위해 타임아웃 300초(5분) 설정
        fetch(url, options) {
          const AI_TIMEOUT_MS = 300_000;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
          // 외부에서 전달된 signal이 있으면 연동
          const externalSignal = (options as RequestInit | undefined)?.signal;
          if (externalSignal) {
            externalSignal.addEventListener('abort', () => controller.abort());
          }
          return fetch(url, {
            ...options,
            credentials: "include",
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
      }),
    ],
  });
}
