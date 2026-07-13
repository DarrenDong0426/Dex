"use server";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

export async function importGameData(formData: FormData) {
  const file = formData.get("file") as File;
  const text = await file.text();
  const parsed = Papa.parse(text, { header: true });
  const row = parsed.data[0] as Record<string, string>;

  await prisma.profile.upsert({
    where: { id: 1 },
    update: {
      name: row.name,
      rank: Number(row.rank),
      createdAt: new Date(row.created_at),
    },
    create: {
      id: 1,
      name: row.name,
      rank: Number(row.rank),
      createdAt: new Date(row.created_at),
    },
  });
}
