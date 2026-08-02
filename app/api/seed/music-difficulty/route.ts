import { prisma } from "@/lib/prisma";

export async function GET() {
  const res = await fetch(
    "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/musicDifficulties.json",
  );
  const data = await res.json();

  const rows = data.map(
    (d: {
      id: number;
      musicId: number;
      musicDifficulty: string;
      playLevel: number;
      totalNoteCount: number;
    }) => ({
      id: d.id,
      musicId: d.musicId,
      musicDifficulty: d.musicDifficulty.toUpperCase(), // match UserMusicResult casing
      playLevel: d.playLevel,
      totalNoteCount: d.totalNoteCount,
    }),
  );

  const result = await prisma.musicDifficulty.createMany({
    data: rows,
    skipDuplicates: true,
  });

  return Response.json({ inserted: result.count, total: rows.length });
}
