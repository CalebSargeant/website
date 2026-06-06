import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { Resume } from "@app/schemas";
import type { ApiClient, GithubStats } from "./client";

export const keys = {
  profile: ["profile"] as const,
  github: ["github", "stats"] as const,
};

export function useProfile(client: ApiClient): UseQueryResult<Resume> {
  return useQuery({ queryKey: keys.profile, queryFn: () => client.getProfile() });
}

export function useGithubStats(client: ApiClient): UseQueryResult<GithubStats> {
  return useQuery({
    queryKey: keys.github,
    queryFn: () => client.getGithubStats(),
    staleTime: 5 * 60 * 1000,
  });
}

/** Ask-my-CV assistant (one-shot question → answer). */
export function useAskCv(client: ApiClient): UseMutationResult<string, Error, string> {
  return useMutation({ mutationFn: (question: string) => client.askCv(question) });
}

/** Generate + download the CV in the browser. */
export function useGenerateCv(
  client: ApiClient,
): UseMutationResult<void, Error, "pdf" | "json" | undefined> {
  return useMutation({
    mutationFn: async (format = "pdf") => {
      const blob = await client.getCvBlob(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "cv.json" : "cv.pdf";
      a.click();
      URL.revokeObjectURL(url);
    },
  });
}
