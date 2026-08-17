import ProfileClient from "@/app/ProfileClient";
import { baseUrl } from "@/lib/baseUrl";

async function getData() {
  const res = await fetch(`${baseUrl()}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{
        profile { name rank createdAt }
        sekaiSummary {
          rank
          updatedAt
          cardCount
          eventCount
          difficulties { difficulty clears fullCombos fullPerfects }
          characters { characterId name characterRank challengeLevel favoriteTier unit honorAsset }
          favoriteSongs { musicId title assetbundleName }
        }
      }`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  return {
    profile: json.data?.profile ?? null,
    summary: json.data?.sekaiSummary ?? null,
  };
}

export default async function Page() {
  const { profile, summary } = await getData();
  return <ProfileClient profile={profile} summary={summary} />;
}
