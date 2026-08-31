export interface ActivitySlot {
  activity: string;
  bird: string;
}

export interface YamaRow {
  yama: number;
  yamaLabel: string;
  fraction: number;
  day: ActivitySlot[];
  night: ActivitySlot[];
}

export interface DayGroup {
  key: string;
  yamas: YamaRow[];
}

export interface PakshaData {
  sheetName: string;
  daySectionLabel: string;
  nightSectionLabel: string;
  dayActivities: string[];
  nightActivities: string[];
  groups: DayGroup[];
}

export interface PanchaPakshiData {
  meta: { source: string; sheets: string[] };
  valarpirai: PakshaData;
  theipirai: PakshaData;
}
