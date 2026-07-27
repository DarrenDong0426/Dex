import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type ChallengeStageRow = {
  character_id: string;
  rank: string;
  challenge_live_stage_status: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<ChallengeStageRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    // keep only the stage each character is currently on
    const data = parsed.data
      .filter((row) => row.challenge_live_stage_status === "IN_PROGRESS")
      .map((row) => ({
        characterId: Number(row.character_id),
        challengeLevel: Number(row.rank),
      }));

    await prisma.userChallengeStage.deleteMany();
    const result = await prisma.userChallengeStage.createMany({ data });

    return Response.json({
      inProgressRows: data.length,
      inserted: result.count,
    });
  } catch (err) {
    console.error("Challenge stage import failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
