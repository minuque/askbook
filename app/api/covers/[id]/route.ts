import { loadCover, LOCAL_USER } from "@/lib/db";

export const runtime = "nodejs";

/** A stored cover image. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jpeg = await loadCover(LOCAL_USER, (await params).id);
  if (!jpeg) return Response.json({ error: "Not found." }, { status: 404 });
  return new Response(new Blob([jpeg as Uint8Array<ArrayBuffer>]), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" } });
}
