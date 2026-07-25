import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

type EventRow = {
  event_id: string;
  rank: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file)
      return Response.json({ error: "No file uploaded" }, { status: 400 });

    const text = await file.text();
    const parsed = Papa.parse<EventRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    const existing = await prisma.event.findMany({ select: { id: true } });
    const validIds = new Set(existing.map((e) => e.id));

    const data = parsed.data
      .map((row) => {
        const rank = Number(row.rank);
        return {
          eventId: Number(row.event_id),
          rank: Number.isFinite(rank) ? rank : null,
        };
      })
      .filter((d) => validIds.has(d.eventId));

    await prisma.userEvent.deleteMany();
    const result = await prisma.userEvent.createMany({ data });

    return Response.json({
      parsed: parsed.data.length,
      inserted: result.count,
      skipped: parsed.data.length - result.count,
    });
  } catch (err) {
    console.error("Event import failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
