import { Resume, type Resume as ResumeType } from "@app/schemas";

/** GitHub stats widget payload (this repo's API response shape). */
export interface GithubStats {
  login: string;
  name: string | null;
  followers: number;
  public_repos: number;
  total_stars: number;
  top_languages: { name: string; count: number }[];
  latest_repo: {
    name: string;
    url: string;
    description: string | null;
    pushed_at: string;
  } | null;
}

/**
 * Typed client for THIS repo's API. The base URL is ALWAYS injected by the host
 * app from env (VITE_* on web, EXPO_PUBLIC_* on mobile) — never hardcoded.
 */
export interface ApiClient {
  getProfile(): Promise<ResumeType>;
  getGithubStats(): Promise<GithubStats>;
  askCv(question: string): Promise<string>;
  /** URL for the generated CV (e.g. for an <a download> link). */
  cvUrl(format?: "pdf" | "json"): string;
  /** Fetch the generated CV as a Blob (for programmatic download). */
  getCvBlob(format?: "pdf" | "json"): Promise<Blob>;
}

export interface ApiClientOptions {
  baseUrl: string;
  getAuthHeader?: () => Record<string, string> | undefined;
  fetchImpl?: typeof fetch;
}

export class HttpError extends Error {
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

  async function json<T>(path: string, init: RequestInit, parse: (d: unknown) => T): Promise<T> {
    const res = await fetchImpl(`${root}${path}`, {
      ...init,
      headers: { "content-type": "application/json", ...getAuthHeader?.(), ...init.headers },
    });
    if (!res.ok) throw new HttpError(res.status, `${init.method ?? "GET"} ${path} → ${res.status}`);
    return parse(await res.json());
  }

  return {
    getProfile: () => json("/profile", { method: "GET" }, (d) => Resume.parse(d)),
    getGithubStats: () => json("/github/stats", { method: "GET" }, (d) => d as GithubStats),
    askCv: (question) =>
      json(
        "/ask",
        { method: "POST", body: JSON.stringify({ question }) },
        (d) => (d as { answer: string }).answer,
      ),
    cvUrl: (format = "pdf") => `${root}/cv?format=${format}`,
    getCvBlob: async (format = "pdf") => {
      const res = await fetchImpl(`${root}/cv?format=${format}`, { headers: { ...getAuthHeader?.() } });
      if (!res.ok) throw new HttpError(res.status, `GET /cv → ${res.status}`);
      return res.blob();
    },
  };
}
