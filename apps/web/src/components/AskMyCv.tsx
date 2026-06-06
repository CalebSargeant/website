import { useState } from "react";
import { useAskCv } from "@app/api-client";
import { Button, Input } from "@platform/ui";
import { apiClient } from "../lib/api";

// "Ask my CV" — visitors ask anything; answers are grounded in the profile data.
export function AskMyCv() {
  const ask = useAskCv(apiClient);
  const [question, setQuestion] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) ask.mutate(question.trim());
  };

  return (
    <section className="rounded-xl border bg-white/50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-brand">Ask my CV 🤖</h2>
      <p className="mb-3 text-sm text-gray-500">
        Ask anything about my experience — answered live from this site's data.
      </p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What's your cloud experience?"
        />
        <Button type="submit" disabled={ask.isPending}>
          {ask.isPending ? "Thinking…" : "Ask"}
        </Button>
      </form>
      {ask.isError && (
        <p className="mt-3 text-sm text-red-600">
          The assistant isn't available right now.
        </p>
      )}
      {ask.data && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm">{ask.data}</p>
      )}
    </section>
  );
}
