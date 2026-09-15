import { readFileSync, writeFileSync } from "fs";
import { formatPatchiName } from "./patchiSymbols.mjs";

function migrateSlots(slots) {
  return slots.map((slot) => ({
    ...slot,
    bird: formatPatchiName(slot.bird),
  }));
}

function migratePaksha(paksha) {
  return {
    ...paksha,
    groups: paksha.groups.map((group) => ({
      ...group,
      yamas: group.yamas.map((yama) => ({
        ...yama,
        day: migrateSlots(yama.day),
        night: migrateSlots(yama.night),
      })),
    })),
  };
}

const jsonPaths = ["src/data/pancha-pakshi.json"];

for (const jsonPath of jsonPaths) {
  const data = JSON.parse(readFileSync(jsonPath, "utf8"));
  const migrated =
    data.valarpirai && data.theipirai
      ? {
          ...data,
          valarpirai: migratePaksha(data.valarpirai),
          theipirai: migratePaksha(data.theipirai),
        }
      : migratePaksha(data);
  writeFileSync(jsonPath, JSON.stringify(migrated, jsonPath.endsWith("pancha-pakshi.json") ? 2 : undefined));
  console.log("Migrated", jsonPath);
}
