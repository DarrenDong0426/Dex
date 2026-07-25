import ProfileClient from "@/app/ProfileClient";

async function getProfile() {
  const res = await fetch("http://localhost:3000/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ profile { name rank createdAt } }`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.data?.profile) return null;
  return json.data.profile;
}

export default async function Page() {
  const profile = await getProfile();
  return <ProfileClient profile={profile} />;
}
