import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WidgetCreate, type WidgetCreate as WidgetCreateInput } from "@app/schemas";
import { useCreateWidget, useWidgets } from "@app/api-client";
// Shared WEB component library (shadcn). Web only — never used on mobile.
import { Button, Input } from "@platform/ui";
import { apiClient } from "../lib/api";

export function WidgetsScreen() {
  const widgets = useWidgets(apiClient);
  const createWidget = useCreateWidget(apiClient);

  const form = useForm<WidgetCreateInput>({
    resolver: zodResolver(WidgetCreate),
    defaultValues: { name: "", item_id: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    createWidget.mutate(values, { onSuccess: () => form.reset() });
  });

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Widget name" {...form.register("name")} />
        <Input placeholder="Item ID (shared Item)" {...form.register("item_id")} />
        <Button type="submit" disabled={createWidget.isPending}>
          {createWidget.isPending ? "Adding…" : "Add widget"}
        </Button>
      </form>

      {widgets.isLoading && <p>Loading…</p>}
      {widgets.isError && <p className="text-red-600">Failed to load widgets.</p>}

      <ul className="divide-y rounded-md border">
        {widgets.data?.map((w) => (
          <li key={w.id} className="flex justify-between px-4 py-3">
            <span className="font-medium">{w.name}</span>
            <span className="text-sm text-gray-500">item {w.item_id.slice(0, 8)}…</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
