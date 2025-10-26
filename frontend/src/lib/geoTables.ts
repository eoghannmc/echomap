import localforage from "localforage";

export const LIMITS = {
  maxTables: 20, maxColumnsPerTable: 20, maxRowsPerTable: 20, maxCustomFields: 4,
};

export type FieldDef = { key: string; label: string; type: "string"|"number"|"date" };
export type TableMeta = {
  id: string; name: string; fields: FieldDef[]; createdAt: number; updatedAt: number;
};
export type RowFeature = GeoJSON.Feature<GeoJSON.Point, {
  ID: string; name?: string; color?: string; bufferOn?: boolean; bufferRadius?: number;
  [k: string]: any;
}>;
export type TableBundle = { meta: TableMeta; rows: RowFeature[] };

const DB = localforage.createInstance({ name: "echo-tables" });

export async function listTables(): Promise<TableMeta[]> {
  const idx = (await DB.getItem<TableMeta[]>("tables-index")) || [];
  return idx;
}
async function saveIndex(list: TableMeta[]) { await DB.setItem("tables-index", list); }

export async function createTable(name = "Untitled"): Promise<TableMeta> {
  const all = await listTables();
  if (all.length >= LIMITS.maxTables) throw new Error("Max tables reached");
  const meta: TableMeta = {
    id: crypto.randomUUID(),
    name,
    fields: [{ key:"ID", label:"ID", type:"string" }], // ID required
    createdAt: Date.now(), updatedAt: Date.now()
  };
  await DB.setItem(`table:${meta.id}`, { meta, rows: [] } as TableBundle);
  await saveIndex([meta, ...all]);
  return meta;
}

export async function getTable(id: string): Promise<TableBundle> {
  const t = await DB.getItem<TableBundle>(`table:${id}`);
  if (!t) throw new Error("Table not found");
  return t;
}

export async function renameTable(id: string, newName: string) {
  const bundle = await getTable(id);
  bundle.meta.name = newName; bundle.meta.updatedAt = Date.now();
  await DB.setItem(`table:${id}`, bundle);
  const idx = await listTables();
  await saveIndex(idx.map(m => m.id === id ? bundle.meta : m));
}

export async function setFields(id: string, fields: FieldDef[]) {
  // enforce caps: first must be ID
  if (fields.length > LIMITS.maxColumnsPerTable) throw new Error("Too many columns");
  if (fields[0]?.key !== "ID") throw new Error("First field must be ID");
  const customCount = fields.length - 1;
  if (customCount > LIMITS.maxCustomFields) throw new Error("Too many custom fields (max 4 incl. ID)");
  const b = await getTable(id);
  b.meta.fields = fields; b.meta.updatedAt = Date.now();
  // migrate rows: drop non-existing keys, keep ID
  b.rows = b.rows.map(r => {
    const keep = Object.fromEntries(fields.map(f => [f.key, r.properties?.[f.key]]));
    return { ...r, properties: { ...r.properties, ...keep } };
  });
  await DB.setItem(`table:${id}`, b);
}

export async function addRow(id: string, feat: RowFeature) {
  const b = await getTable(id);
  if (!feat.properties?.ID) feat.properties = { ...feat.properties, ID: "tag" };
  // uniqueness on ID
  if (b.rows.some(r => r.properties.ID === feat.properties!.ID)) {
    throw new Error("ID must be unique");
  }
  if (b.rows.length >= LIMITS.maxRowsPerTable) throw new Error("Max rows reached");
  b.rows = [feat, ...b.rows]; b.meta.updatedAt = Date.now();
  await DB.setItem(`table:${id}`, b);
}

export async function updateRow(id: string, rowId: string, props: Partial<RowFeature["properties"]>) {
  const b = await getTable(id);
  const i = b.rows.findIndex(r => r.properties.ID === rowId);
  if (i < 0) throw new Error("Row not found");
  const nextID = props.ID ?? b.rows[i].properties.ID;
  if (nextID !== b.rows[i].properties.ID && b.rows.some(r => r.properties.ID === nextID)) {
    throw new Error("ID must be unique");
  }
  b.rows[i] = { ...b.rows[i], properties: { ...b.rows[i].properties, ...props } };
  b.meta.updatedAt = Date.now();
  await DB.setItem(`table:${id}`, b);
}

export async function deleteRow(id: string, rowId: string) {
  const b = await getTable(id);
  b.rows = b.rows.filter(r => r.properties.ID !== rowId);
  b.meta.updatedAt = Date.now();
  await DB.setItem(`table:${id}`, b);
}

export async function deleteTable(id: string) {
  await DB.removeItem(`table:${id}`);
  const idx = await listTables();
  await saveIndex(idx.filter(m => m.id !== id));
}
