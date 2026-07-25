import { prisma } from "@/lib/prisma";

const CARDS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/cards.json";

type MasterCard = {
  id: number;
  prefix: string;
  characterId: number;
  cardRarityType: string;
  assetbundleName: string;
};

function parseRarity(cardRarityType: string): number {
  if (cardRarityType == "rarity_birthday") return 5;
  const digit = Number(cardRarityType.replace("rarity_", ""));
  return Number.isNaN(digit) ? 0 : digit;
}

export async function GET() {
  try {
    const res = await fetch(CARDS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const cards = (await res.json()) as MasterCard[];

    const data = cards.map((card) => ({
      id: card.id,
      name: card.prefix,
      rarity: parseRarity(card.cardRarityType),
      characterId: card.characterId,
      assetbundleName: card.assetbundleName,
    }));

    const result = await prisma.card.createMany({
      data,
      skipDuplicates: true,
    });

    return Response.json({ fetched: cards.length, inserted: result.count });
  } catch (err) {
    console.error("Card seed failed:", err);
    return Response.json({ error: "Seed failed" }, { status: 500 });
  }
}
