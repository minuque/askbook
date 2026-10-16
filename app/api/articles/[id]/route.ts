import { articleDoc, LOCAL_USER } from "@/lib/db";

export const runtime = "nodejs";

/** One imported text's full body, for a device that has the shelf entry but not the text. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const doc = await articleDoc(LOCAL_USER, (await params).id);
  if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ doc });
}
