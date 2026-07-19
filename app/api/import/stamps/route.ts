import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type StampRow = { stamp_id: string };

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<StampRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const existing = await prisma.stamp.findMany({ select: { id: true } });
    const validIds = new Set(existing.map((s) => s.id));

    const data = parsed.data
      .map((row) => ({ stampId: Number(row.stamp_id) }))
      .filter((d) => validIds.has(d.stampId));

    await prisma.userStamp.deleteMany();
    const result = await prisma.userStamp.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
    });
  } catch (err) {
    console.error("Stamp import failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
