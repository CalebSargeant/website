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

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Generate + download the CV in the browser. */
export function useGenerateCv(
  client: ApiClient,
): UseMutationResult<void, Error, "pdf" | "json" | undefined> {
  return useMutation({
    mutationFn: async (format = "pdf") => {
      const blob = await client.getCvBlob(format);
      downloadBlob(blob, format === "json" ? "cv.json" : "cv.pdf");
    },
  });
}

/** Tailor the CV to a pasted job description, then download the tailored PDF. */
export function useTailorCv(client: ApiClient): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: async (jobDescription: string) => {
      const blob = await client.tailorCvBlob(jobDescription, "pdf");
      downloadBlob(blob, "cv_tailored.pdf");
    },
  });
}
