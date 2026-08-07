import { prisma } from "@/lib/prisma";

export async function GET() {
  const res = await fetch(
    "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/honorGroups.json",
  );
  const data = await res.json();

  for (const d of data) {
    await prisma.honorGroup.upsert({
      where: { id: d.id },
      update: { name: d.name ?? null, honorType: d.honorType ?? null },
      create: {
        id: d.id,
        name: d.name ?? null,
        honorType: d.honorType ?? null,
      },
    });
  }
  return Response.json({ count: data.length });
}
