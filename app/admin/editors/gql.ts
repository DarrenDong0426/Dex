// app/admin/editors/gql.ts — shared GraphQL fetch helper for admin editors.

export async function gql(query: string, variables?: Record<string, unknown>) {
  const r = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0]?.message ?? "GraphQL error");
  return j.data;
}
