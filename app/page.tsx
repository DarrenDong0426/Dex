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
  console.log(json);
  if (!json.data?.profile) return null;
  return json.data.profile;
}

export default async function Page() {
  const profile = await getProfile();
  if (!profile) return <div>No profile yet - upload your data.</div>;
  return (
    <div>
      <h1>{profile.name}</h1>
      <p>{profile.rank}</p>
      <p>
        Playing since{" "}
        {new Date(Number(profile.createdAt)).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </p>
    </div>
  );
}
