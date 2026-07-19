import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type MusicRow = {
  music_id: string;
  music_difficulty_type: string;
  play_type: string;
  play_result: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded!" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<MusicRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const RANK: Record<string, number> = {
      NOT_CLEAR: 0,
      CLEAR: 1,
      FULL_COMBO: 2,
      FULL_PERFECT: 3,
    };
    const best = new Map<
      string,
      { musicId: number; difficulty: string; playResult: string }
    >();
    for (const row of parsed.data) {
      const musicId = Number(row.music_id);
      const difficulty = row.music_difficulty_type;
      const key = `${musicId}:${difficulty}`;
      const current = best.get(key);
      if (
        !current ||
        (RANK[row.play_result] ?? -1) > (RANK[current.playResult] ?? -1)
      ) {
        best.set(key, { musicId, difficulty, playResult: row.play_result });
      }
    }
    const data = [...best.values()];

    await prisma.userMusicResult.deleteMany();
    const result = await prisma.userMusicResult.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
    });
  } catch (err) {
    console.error("Music import failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
