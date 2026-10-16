/**
 * Local SQLite via node:sqlite. The file lives at $GLOSS_DATA_DIR/gloss.db
 * when the desktop shell sets it (the app's userData directory), else
 * .data/gloss.db next to this checkout. Single-user ("local" user_id). The
 * schema is created on first open, so there is no migrate step. Server-side only.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

let database: DatabaseSync | null = null;

export function db(): DatabaseSync {
  if (!database) {
    const dir = process.env.GLOSS_DATA_DIR ?? path.join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    database = new DatabaseSync(path.join(dir, "gloss.db"));
    database.exec(SCHEMA);
  }
  return database;
}

/** The tables the sync route reads and writes. Names are only ever taken from this list. */
export const COLLECTIONS = ["articles", "highlights", "glosses", "briefs", "progress"] as const;
export type Collection = (typeof COLLECTIONS)[number];
export const isCollection = (v: unknown): v is Collection => typeof v === "string" && (COLLECTIONS as readonly string[]).includes(v);

/** Single local user: every row is stored under this id. */
export const LOCAL_USER = "local";

const SCHEMA = `
create table if not exists articles (
  user_id text not null,
  id text not null,
  article_id text not null,
  data text not null,
  doc text,
  deleted integer not null default 0,
  updated_at text not null,
  primary key (user_id, id)
);
create table if not exists highlights (
  user_id text not null,
  id text not null,
  article_id text not null,
  data text not null,
  deleted integer not null default 0,
  updated_at text not null,
  primary key (user_id, id)
);
create table if not exists glosses (
  user_id text not null,
  id text not null,
  article_id text not null,
  data text not null,
  deleted integer not null default 0,
  updated_at text not null,
  primary key (user_id, id)
);
create table if not exists briefs (
  user_id text not null,
  id text not null,
  article_id text not null,
  data text not null,
  deleted integer not null default 0,
  updated_at text not null,
  primary key (user_id, id)
);
create table if not exists progress (
  user_id text not null,
  id text not null,
  article_id text not null,
  data text not null,
  deleted integer not null default 0,
  updated_at text not null,
  primary key (user_id, id)
);
create index if not exists articles_user_updated on articles (user_id, updated_at);
create index if not exists highlights_user_updated on highlights (user_id, updated_at);
create index if not exists glosses_user_updated on glosses (user_id, updated_at);
create index if not exists briefs_user_updated on briefs (user_id, updated_at);
create index if not exists progress_user_updated on progress (user_id, updated_at);
create table if not exists covers (
  user_id text not null,
  id text not null,
  jpeg text not null,
  created_at text not null,
  primary key (user_id, id)
);
`;

export type PushRow = { id: string; article_id: string; data: unknown; deleted: boolean; doc?: unknown };
export type PullRow = { id: string; articleId: string; data: unknown; deleted: boolean };

const now = () => new Date().toISOString();
const parse = (v: unknown) => {
  try {
    return typeof v === "string" ? JSON.parse(v) : v;
  } catch {
    return v;
  }
};

/** Rows changed since `since` in every collection, tombstones included, plus the server clock to pull from next time. */
export async function pullRows(_userId: string, since: string): Promise<{ now: string; changes: Record<Collection, PullRow[]> }> {
  const d = db();
  const changes = Object.fromEntries(
    COLLECTIONS.map((t) => [
      t,
      (d.prepare(`select id, article_id, data, deleted from ${t} where user_id = ? and updated_at > ? order by updated_at`).all(LOCAL_USER, since) as Record<string, unknown>[]).map(
        (r) => ({ id: String(r.id), articleId: String(r.article_id), data: r.deleted ? null : parse(r.data), deleted: Boolean(r.deleted) })
      ),
    ])
  ) as Record<Collection, PullRow[]>;
  return { now: now(), changes };
}

/** Upsert every collection's rows in one transaction. The server stamps the time, so the latest write wins. */
export async function pushRows(_userId: string, changes: Partial<Record<Collection, PushRow[]>>): Promise<void> {
  const d = db();
  const stamp = now();
  d.exec("begin");
  try {
    for (const [table, rows] of Object.entries(changes)) {
      if (!isCollection(table) || !rows?.length) continue;
      const isArticles = table === "articles";
      const stmt = d.prepare(
        `insert into ${table} (user_id, id, article_id, data, deleted, updated_at${isArticles ? ", doc" : ""})
         values (?, ?, ?, ?, ?, ?${isArticles ? ", ?" : ""})
         on conflict (user_id, id) do update set
           article_id = excluded.article_id, data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at${
             isArticles ? ", doc = case when excluded.deleted then null else coalesce(excluded.doc, articles.doc) end" : ""
           }`
      );
      for (const r of rows) {
        const binds: (string | number | null)[] = [LOCAL_USER, r.id, r.article_id, JSON.stringify(r.data ?? null), r.deleted ? 1 : 0, stamp];
        if (isArticles) binds.push(r.doc == null ? null : JSON.stringify(r.doc));
        stmt.run(...binds);
      }
    }
    // A text taken off the shelf takes its painted cover with it.
    const gone = (changes.articles ?? []).filter((r) => r.deleted).map((r) => r.id);
    if (gone.length) {
      const del = d.prepare("delete from covers where user_id = ? and id = ?");
      for (const id of gone) del.run(LOCAL_USER, id);
    }
    d.exec("commit");
  } catch (e) {
    d.exec("rollback");
    throw e;
  }
}

/** One article's full text. */
export async function articleDoc(_userId: string, id: string): Promise<unknown | null> {
  const row = db().prepare("select doc from articles where user_id = ? and id = ? and deleted = 0 and doc is not null").get(LOCAL_USER, id) as { doc?: string } | undefined;
  return row?.doc ? parse(row.doc) : null;
}

/* ---------- covers ---------- */

export async function saveCover(_userId: string, id: string, jpeg: Uint8Array): Promise<void> {
  db()
    .prepare("insert into covers (user_id, id, jpeg, created_at) values (?, ?, ?, ?) on conflict (user_id, id) do update set jpeg = excluded.jpeg, created_at = excluded.created_at")
    .run(LOCAL_USER, id, Buffer.from(jpeg).toString("base64"), now());
}

export async function loadCover(_userId: string, id: string): Promise<Uint8Array | null> {
  const row = db().prepare("select jpeg from covers where user_id = ? and id = ?").get(LOCAL_USER, id) as { jpeg?: string } | undefined;
  return row?.jpeg ? Uint8Array.from(Buffer.from(String(row.jpeg), "base64")) : null;
}
