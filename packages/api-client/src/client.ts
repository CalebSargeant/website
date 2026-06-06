import {
  WidgetCreateSchema,
  WidgetListSchema,
  WidgetSchema,
  type Widget,
  type WidgetCreate,
} from "@app/schemas";

/**
 * Minimal typed client for THIS repo's API. The base URL is ALWAYS injected by
 * the host app from env (VITE_* on web, EXPO_PUBLIC_* on mobile) — never hardcoded.
 */
export interface ApiClient {
  listWidgets(): Promise<Widget[]>;
  createWidget(input: WidgetCreate): Promise<Widget>;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Optional auth header factory (e.g. bearer token). Config, not hardcoded. */
  getAuthHeader?: () => Record<string, string> | undefined;
  fetchImpl?: typeof fetch;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, getAuthHeader, fetchImpl = fetch } = options;
  const root = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    init: RequestInit,
    parse: (data: unknown) => T,
  ): Promise<T> {
    const res = await fetchImpl(`${root}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...getAuthHeader?.(),
        ...init.headers,
      },
    });
    if (!res.ok) {
      throw new HttpError(res.status, `${init.method ?? "GET"} ${path} → ${res.status}`);
    }
    return parse(await res.json());
  }

  return {
    listWidgets: () =>
      request("/widgets", { method: "GET" }, (d) => WidgetListSchema.parse(d)),
    createWidget: (input) =>
      request(
        "/widgets",
        { method: "POST", body: JSON.stringify(WidgetCreateSchema.parse(input)) },
        (d) => WidgetSchema.parse(d),
      ),
  };
}

export { HttpError };
