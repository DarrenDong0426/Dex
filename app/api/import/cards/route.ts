import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type CardRow = {
  card_id: string;
  level: string;
  master_rank: string;
  skill_level: string;
  special_training_status: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "no file uploaded" }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<CardRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const data = parsed.data.map((row) => ({
      cardId: Number(row.card_id),
      level: Number(row.level),
      masterRank: Number(row.master_rank),
      skillLevel: Number(row.skill_level),
      specialTraining: row.special_training_status === "DONE",
    }));

    await prisma.userCard.deleteMany();
    const result = await prisma.userCard.createMany({ data });

    return Response.json({ parsed: data.length, inserted: result.count });
  } catch (err) {
    console.error("Card import failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
