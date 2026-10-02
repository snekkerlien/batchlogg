import { NextResponse } from "next/server";
import JSZip from "jszip";
import { supabaseServer } from "@/lib/supabase/supabaseServerFinal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARCHIVE_SIZE = 4 * 1024 * 1024;
const MAX_JSON_SIZE = 50 * 1024 * 1024;
const INSERT_BATCH_SIZE = 250;

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJsonFile(zip: JSZip, name: string): Promise<unknown> {
  const file = zip.file(name);
  if (!file) {
    throw new Error(`Backup is missing ${name}`);
  }

  const text = await file.async("string");
  if (text.length > MAX_JSON_SIZE) {
    throw new Error(`${name} is too large`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${name} is not valid JSON`);
  }
}

function readRows(value: unknown, name: string): JsonRecord[] {
  if (
    !Array.isArray(value) ||
    !value.every(
      (row) =>
        isJsonRecord(row) &&
        typeof row.id === "string" &&
        row.id.length > 0
    )
  ) {
    throw new Error(`${name} must be an array of records with IDs`);
  }

  return value;
}

export async function POST(request: Request) {
  const { supabase } = supabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload a valid backup ZIP file" }, { status: 400 });
  }

  const uploadedFile = formData.get("backup");
  if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
    return NextResponse.json({ error: "Select a backup ZIP file" }, { status: 400 });
  }
  if (uploadedFile.size > MAX_ARCHIVE_SIZE) {
    return NextResponse.json({ error: "Backup ZIP must be 4 MB or smaller" }, { status: 413 });
  }

  let metadata: unknown;
  let kar: JsonRecord[];
  let batches: JsonRecord[];
  let recipes: JsonRecord[];

  try {
    const zip = await JSZip.loadAsync(await uploadedFile.arrayBuffer());
    [metadata, kar, batches, recipes] = await Promise.all([
      readJsonFile(zip, "metadata.json"),
      readJsonFile(zip, "kar.json").then((value) => readRows(value, "kar.json")),
      readJsonFile(zip, "batches.json").then((value) => readRows(value, "batches.json")),
      readJsonFile(zip, "recipes.json").then((value) => readRows(value, "recipes.json")),
    ]);

    if (!isJsonRecord(metadata) || metadata.format_version !== 1) {
      return NextResponse.json(
        { error: "Unsupported backup format. Please upload a Batchlog backup." },
        { status: 400 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid backup file";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const tables = [
    { name: "kar", rows: kar },
    { name: "batches", rows: batches },
    { name: "recipes", rows: recipes },
  ] as const;

  let processed = 0;
  for (const table of tables) {
    const rows = table.rows.map((row) => ({ ...row, user_id: user.id }));

    for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
      const chunk = rows.slice(offset, offset + INSERT_BATCH_SIZE);
      const { error } = await supabase
        .from(table.name)
        .upsert(chunk, { onConflict: "id", ignoreDuplicates: true });

      if (error) {
        return NextResponse.json(
          {
            error: `Restore stopped while importing ${table.name}. ${processed} records were processed before the error: ${error.message}`,
            processed,
          },
          { status: 500 }
        );
      }
      processed += chunk.length;
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    message: "Missing records were added. Existing records and your current profile settings were left unchanged.",
  });
}
