import { prisma } from "@/lib/prisma";

const CHARACTERS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/gameCharacters.json";

type MasterCharacter = {
  id: number;
  firstName: string;
  givenName: string;
  unit: string;
};

export async function GET() {
  try {
    const res = await fetch(CHARACTERS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const characters = (await res.json()) as MasterCharacter[];

    const data = characters.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      givenName: c.givenName,
      unit: c.unit,
    }));

    const result = await prisma.character.createMany({
      data,
      skipDuplicates: true,
    });

    return Response.json({
      fetched: characters.length,
      inserted: result.count,
    });
  } catch (err) {
    console.error("Character seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
