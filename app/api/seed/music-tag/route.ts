import { prisma } from "@/lib/prisma";

export async function GET() {
  const res = await fetch(
    "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/musicTags.json",
  );
  const data = await res.json();

  const rows = data.map(
    (d: { id: number; musicId: number; musicTag: string; seq: number }) => ({
      id: d.id,
      musicId: d.musicId,
      musicTag: d.musicTag,
      seq: d.seq,
    }),
  );

  const result = await prisma.musicTag.createMany({
    data: rows,
    skipDuplicates: true,
  });
  return Response.json({ inserted: result.count, total: rows.length });
}
