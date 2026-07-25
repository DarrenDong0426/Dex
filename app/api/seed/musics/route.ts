import { prisma } from "@/lib/prisma";
import { stringify } from "querystring";

const MUSIC_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/musics.json";

type MasterMusic = {
  id: number;
  title: string;
  assetbundleName: string;
};

export async function GET() {
  try {
    const res = await fetch(MUSIC_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }
    const musics = (await res.json()) as MasterMusic[];

    const data = musics.map((m) => ({
      id: m.id,
      title: m.title,
      assetbundleName: m.assetbundleName,
    }));

    const result = await prisma.music.createMany({
      data,
      skipDuplicates: true,
    });

    return Response.json({ fetched: musics.length, inserted: result.count });
  } catch (err) {
    console.error("Music seed failed: ", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
