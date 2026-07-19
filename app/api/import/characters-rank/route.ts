import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CharRow = {
  character_id: string;
  character_rank: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded " }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<CharRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const data = parsed.data.map((row) => ({
      characterId: Number(row.character_id),
      characterRank: Number(row.character_rank),
    }));

    await prisma.userCharacter.deleteMany();
    const result = await prisma.userCharacter.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
    });
  } catch (err) {
    console.error("Character rank import failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
