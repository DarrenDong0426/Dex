import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type AreaItemRow = {
  area_item_id: string;
  level: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<AreaItemRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const existing = await prisma.areaItem.findMany({ select: { id: true } });
    const validIds = new Set(existing.map((i) => i.id));

    const data = parsed.data
      .map((row) => ({
        areaItemId: Number(row.area_item_id),
        level: Number(row.level),
      }))
      .filter((d) => validIds.has(d.areaItemId));

    await prisma.userAreaItem.deleteMany();
    const result = await prisma.userAreaItem.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
      skipped: parsed.data.length - result.count,
    });
  } catch (err) {
    console.error("Area item import failed: ", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
