import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { Widget, WidgetCreate } from "@app/schemas";
import type { ApiClient } from "./client";

export const widgetKeys = {
  all: ["widgets"] as const,
  list: () => [...widgetKeys.all, "list"] as const,
};

/** List widgets from THIS repo's API. */
export function useWidgets(client: ApiClient): UseQueryResult<Widget[]> {
  return useQuery({
    queryKey: widgetKeys.list(),
    queryFn: () => client.listWidgets(),
  });
}

/** Create a widget, then invalidate the list. */
export function useCreateWidget(
  client: ApiClient,
): UseMutationResult<Widget, Error, WidgetCreate> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WidgetCreate) => client.createWidget(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: widgetKeys.all });
    },
  });
}
