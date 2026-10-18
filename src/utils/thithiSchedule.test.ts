import assert from "node:assert/strict";
import test from "node:test";
import {
  ALTERNATE_ANTHARA_SEGMENT_COUNT,
  ALTERNATE_WEEKDAY_ORDER,
  getAlternateDayActivity,
  getAlternateNightActivity,
} from "./alternateCalculation.ts";
import { buildJamamAntharaClick, getPatchiAntharaMatrix } from "./anthara.ts";
import { PATCHI_ORDER } from "./bilingual.ts";
import { buildDaySchedulerJamamColumns, daySchedulerJamamSlots } from "./daySchedulerJamam.ts";
import type { GeoCoords } from "./location.ts";
import type { PakshaId } from "./paksha.ts";
import {
  getThithiHeadingsForScheduleWeekday,
  getThithiPatchiEntryForThithiNumber,
  getThithiScheduleActivityWeekday,
  type ThithiPatchiEntry,
} from "./thithi.ts";
import {
  thithiScheduleBirdNow,
  thithiScheduleDayFacts,
  thithiScheduleRowWeekday,
  type ThithiScheduleBird,
} from "./thithiSchedule.ts";
import { getThithiPlanetDay, THITHI_PATCHI_BY_PAKSHA } from "./thithiPatchi.ts";

const PIRAIS: PakshaId[] = ["valarpirai", "theipirai"];
const CHENNAI: GeoCoords = { lat: 13.0827, lng: 80.2707 };

function at(day: number, hour: number, minute = 0, second = 0, ms = 0): Date {
  return new Date(2026, 9, day, hour, minute, second, ms);
}

/** What Thithi Schedule → Schedule shows: the table cell plus the antharam dialog row at `moment`. */
function schedulePage(
  pakshaId: PakshaId,
  thithiNumber: number,
  bird: ThithiScheduleBird,
  moment: Date,
  coords: GeoCoords | null,
  nightThithi?: ThithiPatchiEntry,
) {
  const thithi = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber).thithi;
  const rowWeekday = ALTERNATE_WEEKDAY_ORDER.find((weekday) =>
    getThithiHeadingsForScheduleWeekday(pakshaId, weekday)?.some((heading) => heading.en === thithi.en),
  );
  assert.notEqual(rowWeekday, undefined, `${pakshaId} ${thithi.en} has a schedule row`);
  const activityWeekday = getThithiScheduleActivityWeekday(pakshaId, rowWeekday!) ?? rowWeekday!;

  const columns = buildDaySchedulerJamamColumns(moment, coords);
  const allJamamSlots = daySchedulerJamamSlots(columns);
  const slot = allJamamSlots.find((entry) => moment >= entry.start && moment < entry.end)!;
  const period = slot.period;
  const yama = period === "day" ? slot.index : slot.index - 5;
  const cell =
    period === "day"
      ? getAlternateDayActivity(pakshaId, activityWeekday, yama, bird)
      : getAlternateNightActivity(pakshaId, activityWeekday, yama, bird);

  const click = buildJamamAntharaClick({
    period,
    pakshaId,
    weekday: activityWeekday,
    jamamInstant: slot.start,
    coords,
    allJamamSlots,
    nightThithi,
  });
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    click.getActivitySlots,
    slot.index,
    ALTERNATE_ANTHARA_SEGMENT_COUNT,
    click.matrixOptions,
  );
  const rowIndex = matrix.columns.findLastIndex((column) => column.startTime <= moment);
  const next = matrix.columns[rowIndex + 1];
  return {
    jamamIndex: slot.index,
    jamamStart: slot.start.getTime(),
    jamamEnd: slot.end.getTime(),
    jamamActivity: cell,
    antharamIndex: rowIndex + 1,
    antharamStart: matrix.columns[rowIndex].startTime.getTime(),
    antharamEnd: (next ? next.startTime : slot.end).getTime(),
    antharamActivity: matrix.rows.find((row) => row.patchi === bird)?.activities[rowIndex] ?? null,
  };
}

function home(
  pakshaId: PakshaId,
  thithiNumber: number,
  bird: ThithiScheduleBird,
  moment: Date,
  coords: GeoCoords | null,
  nightThithi?: ThithiPatchiEntry,
) {
  const result = thithiScheduleBirdNow({ pakshaId, thithiNumber, bird, moment, coords, nightThithi });
  assert.equal(result.status, "ok");
  if (result.status !== "ok") throw new Error("unreachable");
  return {
    jamamIndex: result.jamamSlot.index,
    jamamStart: result.jamamSlot.start.getTime(),
    jamamEnd: result.jamamSlot.end.getTime(),
    jamamActivity: result.jamamActivity,
    antharamIndex: result.antharam.index,
    antharamStart: result.antharam.start.getTime(),
    antharamEnd: result.antharam.end.getTime(),
    antharamActivity: result.antharam.activity,
  };
}

test("every Pirai / thithi maps to the Schedule row that lists it", () => {
  for (const pakshaId of PIRAIS) {
    for (let thithiNumber = 1; thithiNumber <= 15; thithiNumber++) {
      const weekday = thithiScheduleRowWeekday(pakshaId, thithiNumber);
      assert.notEqual(weekday, null);
      const thithi = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber).thithi;
      const headings = getThithiHeadingsForScheduleWeekday(pakshaId, weekday!) ?? [];
      assert.ok(headings.some((heading) => heading.en === thithi.en), `${pakshaId} ${thithi.en}`);
    }
  }
  assert.equal(thithiScheduleRowWeekday("valarpirai", 0), null);
  assert.equal(thithiScheduleRowWeekday("theipirai", 16), null);
  assert.deepEqual(
    thithiScheduleBirdNow({
      pakshaId: "valarpirai",
      thithiNumber: 16,
      bird: PATCHI_ORDER[0],
      moment: at(18, 9),
      coords: null,
    }),
    { status: "noScheduleRow" },
  );
});

test("Home matches the Schedule page for all birds, both Pirai, every thithi, day and night", () => {
  const cases: [GeoCoords | null, Date[]][] = [
    [null, [at(18, 6, 0), at(18, 17, 59, 59, 999), at(18, 18, 0), at(19, 5, 59)]],
    [CHENNAI, [at(18, 9, 47), at(18, 17, 52), at(18, 21, 30), at(19, 5, 30)]],
  ];
  for (const [coords, moments] of cases) {
    for (const pakshaId of PIRAIS) {
      for (let thithiNumber = 1; thithiNumber <= 15; thithiNumber++) {
        const nightThithi = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber);
        for (const bird of PATCHI_ORDER) {
          for (const moment of moments) {
            const expected = schedulePage(pakshaId, thithiNumber, bird, moment, coords, nightThithi);
            assert.deepEqual(
              home(pakshaId, thithiNumber, bird, moment, coords, nightThithi),
              expected,
              `${pakshaId} ${thithiNumber} ${bird} ${moment.toString()} ${coords ? "Chennai" : "06:00"}`,
            );
            assert.ok(expected.jamamActivity, "every cell has an activity");
            assert.ok(expected.antharamActivity, "every antharam row has an activity");
          }
        }
      }
    }
  }
});

test("jamam and antharam intervals are start-inclusive and end-exclusive around sunset", () => {
  const bird = PATCHI_ORDER[2];
  const sunsetStart = home("valarpirai", 7, bird, at(18, 18, 0), null);
  assert.equal(sunsetStart.jamamIndex, 6);
  assert.equal(sunsetStart.antharamIndex, 1);
  assert.equal(sunsetStart.jamamStart, at(18, 18, 0).getTime());

  const lastDayMs = home("valarpirai", 7, bird, at(18, 17, 59, 59, 999), null);
  assert.equal(lastDayMs.jamamIndex, 5);
  assert.equal(lastDayMs.antharamIndex, 10);
  assert.equal(lastDayMs.jamamEnd, at(18, 18, 0).getTime());
  assert.equal(lastDayMs.antharamEnd, at(18, 18, 0).getTime());

  const segmentBoundary = new Date(sunsetStart.antharamEnd);
  assert.equal(home("valarpirai", 7, bird, segmentBoundary, null).antharamIndex, 2);
  assert.equal(
    home("valarpirai", 7, bird, new Date(sunsetStart.antharamEnd - 1), null).antharamIndex,
    1,
  );
});

test("before sunrise uses the previous sunrise-to-sunrise cycle", () => {
  const bird = PATCHI_ORDER[0];
  const beforeSunrise = home("theipirai", 3, bird, at(19, 5, 59), null);
  assert.equal(beforeSunrise.jamamIndex, 10);
  assert.equal(beforeSunrise.jamamEnd, at(19, 6, 0).getTime());
  assert.ok(beforeSunrise.jamamStart < at(19, 6, 0).getTime());

  const atSunrise = home("theipirai", 3, bird, at(19, 6, 0), null);
  assert.equal(atSunrise.jamamIndex, 1);
  assert.equal(atSunrise.jamamStart, at(19, 6, 0).getTime());
});

test("manual thithi changes the row; thithis sharing a row share the jamam activity", () => {
  const bird = PATCHI_ORDER[3];
  const moment = at(18, 10);
  const prathamai = home("valarpirai", 1, bird, moment, null);
  const sashti = home("valarpirai", 6, bird, moment, null);
  assert.equal(prathamai.jamamActivity, sashti.jamamActivity);

  const rows = new Set(
    Array.from({ length: 5 }, (_, i) => thithiScheduleRowWeekday("valarpirai", i + 1)),
  );
  assert.equal(rows.size, 5, "the first five thithis fill five different rows");
});

test("night antharam 6–10 steps from the given thithi, across the Pirai change", () => {
  const result = (pakshaId: PakshaId, thithiNumber: number) => {
    const r = thithiScheduleBirdNow({
      pakshaId,
      thithiNumber,
      bird: PATCHI_ORDER[1],
      moment: at(18, 22),
      coords: null,
      nightThithi: getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber),
    });
    assert.equal(r.status, "ok");
    if (r.status !== "ok") throw new Error("unreachable");
    return r.antharaClick.matrixOptions?.nextMorningThithiContext?.nextMorningThithi;
  };
  assert.deepEqual(
    [result("valarpirai", 15)?.pakshaId, result("valarpirai", 15)?.thithiNumber],
    ["theipirai", 1],
  );
  assert.deepEqual(
    [result("theipirai", 15)?.pakshaId, result("theipirai", 15)?.thithiNumber],
    ["valarpirai", 1],
  );
  assert.deepEqual(
    [result("valarpirai", 7)?.pakshaId, result("valarpirai", 7)?.thithiNumber],
    ["valarpirai", 8],
  );
});

test("Schedule activity day is not Home's old Day Scheduler bracket day", () => {
  for (const pakshaId of PIRAIS) {
    for (let thithiNumber = 1; thithiNumber <= 5; thithiNumber++) {
      const r = thithiScheduleBirdNow({
        pakshaId,
        thithiNumber,
        bird: PATCHI_ORDER[0],
        moment: at(18, 9),
        coords: null,
      });
      assert.equal(r.status, "ok");
      if (r.status !== "ok") continue;
      const bracketDay = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber).athikaraWeekday;
      assert.notEqual(r.activityWeekday, bracketDay, `${pakshaId} ${thithiNumber}`);
    }
  }
});

test("Home Athikara Eats and Padu Dies in Jamam 1 morning on the chip's Schedule row; Naal is the Thithi Patchi planet day", () => {
  const jamam1 = at(18, 7);
  for (const pakshaId of PIRAIS) {
    for (let thithiNumber = 1; thithiNumber <= 15; thithiNumber++) {
      const label = `${pakshaId} ${thithiNumber}`;
      const facts = thithiScheduleDayFacts(pakshaId, thithiNumber);
      assert.ok(facts, label);
      assert.ok(facts.padu, label);
      assert.notEqual(facts.athikara, facts.padu, label);

      const athikara = home(pakshaId, thithiNumber, facts.athikara, jamam1, null);
      const padu = home(pakshaId, thithiNumber, facts.padu, jamam1, null);
      assert.equal(athikara.jamamIndex, 1, label);
      assert.equal(athikara.jamamActivity, "ஊண்", label);
      assert.equal(padu.jamamActivity, "சாவு", label);
      for (const bird of PATCHI_ORDER) {
        const activity = home(pakshaId, thithiNumber, bird, jamam1, null).jamamActivity;
        assert.equal(activity === "ஊண்", bird === facts.athikara, `${label} ${bird}`);
        assert.equal(activity === "சாவு", bird === facts.padu, `${label} ${bird}`);
      }

      const entry = getThithiPatchiEntryForThithiNumber(pakshaId, thithiNumber);
      const group = THITHI_PATCHI_BY_PAKSHA[pakshaId][entry.groupIndex];
      assert.ok(group.thithis.some((thithi) => thithi.en === entry.thithi.en), label);
      assert.deepEqual(entry.day, getThithiPlanetDay(group.planet), label);
    }
  }
});
