import { cardThumbnail } from "@/lib/sekaiAssets";
import Image from "next/image";

type CardGridItem = {
  id: number;
  level: number;
  specialTraining: boolean;
  card: {
    name: string;
    rarity: number;
    assetbundleName: string;
  };
};

async function getCards(): Promise<CardGridItem[]> {
  const res = await fetch("http://localhost:3000/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ userCards { id level specialTraining card { name rarity assetbundleName } } }`,
    }),
    cache: "no-store",
  });
  const json = await res.json();
  return json.data?.userCards ?? [];
}

export default async function CardsPage() {
  const userCards = await getCards();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Cards ({userCards.length})</h1>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
        {userCards.map((uc, i) => (
          <div key={uc.id}>
            <Image
              src={cardThumbnail(uc.card.assetbundleName, uc.specialTraining)}
              alt={uc.card.name}
              width={156}
              height={156}
              unoptimized
              loading={i < 16 ? "eager" : "lazy"}
              className="w-full rounded"
            />
            <p className="text-xs truncate">{uc.card.name}</p>
            <p className="text-xs opacity-60">
              Lv{uc.level} · {uc.card.rarity}★
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
