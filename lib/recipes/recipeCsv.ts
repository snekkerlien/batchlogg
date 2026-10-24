type RecipeCsvRow = Record<string, string>;
type RecipeInsertRow = Record<string, unknown>;

const recipeTypes = new Set([
  "Beer",
  "Braggot",
  "Cider",
  "Mead",
  "Other",
  "Seltzer",
  "Wine",
]);

const numericFields = [
  "volume",
  "og",
  "fg",
  "abv",
  "ibu",
  "ebc",
  "honey_amount",
  "base_liquid_amount",
  "sugar_amount",
  "boil_time",
  "boil_volume",
] as const;

const jsonFields = [
  "fruits",
  "malts",
  "hops",
  "dry_hops",
  "ingredients",
  "steps",
  "malt_warnings",
  "notes_log",
] as const;

const stringFields = [
  "honey_type",
  "base_liquid",
  "juice_type",
  "yeast",
  "additives",
  "full_process",
  "notes",
  "secondary_additions",
  "secondary_notes",
] as const;

function removeSpreadsheetEscape(value: string): string {
  return /^'[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
}

function parseCsvRecords(content: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];

    if (quoted) {
      if (character === '"') {
        if (content[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        value += character;
      }
      continue;
    }

    if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && content[index + 1] === "\n") index += 1;
      record.push(value);
      if (record.some((cell) => cell !== "")) records.push(record);
      record = [];
      value = "";
    } else if (character === '"') {
      throw new Error("The CSV file contains an invalid quote.");
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV file has an unfinished quoted value.");
  if (value.length > 0 || record.length > 0) {
    record.push(value);
    if (record.some((cell) => cell !== "")) records.push(record);
  }
  return records;
}

export function parseRecipeCsv(content: string): RecipeCsvRow[] {
  const records = parseCsvRecords(content);
  const header = records.shift()?.map((cell, index) =>
    index === 0 ? cell.replace(/^\uFEFF/, "").trim() : cell.trim()
  );
  if (!header?.length) throw new Error("The CSV file is empty.");
  if (new Set(header).size !== header.length || header.some((column) => !column)) {
    throw new Error("The CSV file has duplicate or empty column names.");
  }
  for (const required of ["name", "type", "volume"]) {
    if (!header.includes(required)) {
      throw new Error(`The CSV file is missing the required "${required}" column.`);
    }
  }
  if (!records.length) throw new Error("The CSV file does not contain any recipes.");

  return records.map((cells, rowIndex) => {
    if (cells.length !== header.length) {
      throw new Error(`CSV row ${rowIndex + 2} has a different number of columns than the header.`);
    }
    return Object.fromEntries(
      header.map((column, index) => [column, removeSpreadsheetEscape(cells[index])])
    );
  });
}

function parseNumber(value: string, field: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`The CSV contains an invalid ${field} value.`);
  return parsed;
}

function parseJson(value: string, field: string): unknown {
  if (value.trim() === "") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`The CSV contains invalid JSON in the "${field}" column.`);
  }
}

function parseBoolean(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  throw new Error('The CSV contains an invalid "had_secondary" value.');
}

export function recipeCsvRowToInsert(
  csvRow: RecipeCsvRow,
  userId: string
): RecipeInsertRow {
  const name = csvRow.name.trim();
  if (!name || name.length > 120) {
    throw new Error("Each imported recipe must have a name of 1–120 characters.");
  }
  if (!recipeTypes.has(csvRow.type)) {
    throw new Error(`"${name}" has an unsupported recipe type.`);
  }

  const volume = parseNumber(csvRow.volume, "batch volume");
  if (volume === null || volume <= 0 || volume > 100_000) {
    throw new Error(`"${name}" has an invalid batch volume.`);
  }

  const row: RecipeInsertRow = {
    user_id: userId,
    type: csvRow.type,
    name,
    volume,
    is_public: false,
    batch_id: null,
  };

  for (const field of numericFields) {
    if (field in csvRow) row[field] = parseNumber(csvRow[field], field);
  }
  for (const field of jsonFields) {
    if (field in csvRow) row[field] = parseJson(csvRow[field], field);
  }
  for (const field of stringFields) {
    if (field in csvRow) row[field] = csvRow[field] || null;
  }
  if ("had_secondary" in csvRow) {
    row.had_secondary = parseBoolean(csvRow.had_secondary);
  }

  return row;
}
