import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type BondHonorRow = {
  bonds_honor_id: string;
  level: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<BondHonorRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const existing = await prisma.bondHonor.findMany({ select: { id: true } });
    const validIds = new Set(existing.map((h) => h.id));

    const data = parsed.data
      .map((row) => ({
        bondHonorId: Number(row.bonds_honor_id),
        level: Number(row.level),
      }))
      .filter((d) => validIds.has(d.bondHonorId));

    await prisma.userBondHonors.deleteMany();
    const result = await prisma.userBondHonors.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
      skipped: parsed.data.length - result.count,
    });
  } catch (err) {
    console.error("Bond honor import failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
