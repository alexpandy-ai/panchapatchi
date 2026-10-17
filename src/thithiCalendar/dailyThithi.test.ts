import assert from "node:assert/strict";
import test from "node:test";
import { getThithiPatchiEntryForThithiNumber } from "../utils/thithi.ts";
import {
  calendarYear,
  lastCalendarYear,
  placeSunrise,
  placeWallClock,
  sectorIndex,
  type ThithiPlace,
} from "./calendar.ts";
import { calculateDailyThithi, peekDailyThithi, placeForCoords } from "./dailyThithi.ts";
import { PIRAI_NAMES, thithiIndexLabel, thithiNameBi } from "./labels.ts";
import {
  AMAVASAI_INDEX,
  POURNAMI_INDEX,
  piraiForSector,
  selectionToThithiIndex,
  thithiIndexToSelection,
} from "./thithiIds.ts";

const CHENNAI: ThithiPlace = { coords: { lat: 13.0827, lng: 80.2707 }, timeZone: "Asia/Kolkata" };

/** The date card holds device-local parts; they are read as the place's wall clock. */
function cardTime(dateKey: string, hour: number, minute = 0, second = 0): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, second);
}

test("calendar index ↔ Home Pirai/Thithi id mapping", () => {
  assert.deepEqual(thithiIndexToSelection(0), { pakshaId: "theipirai", thithiNumber: 1 });
  assert.deepEqual(thithiIndexToSelection(13), { pakshaId: "theipirai", thithiNumber: 14 });
  assert.deepEqual(thithiIndexToSelection(AMAVASAI_INDEX), { pakshaId: "theipirai", thithiNumber: 15 });
  assert.deepEqual(thithiIndexToSelection(15), { pakshaId: "valarpirai", thithiNumber: 1 });
  assert.deepEqual(thithiIndexToSelection(20), { pakshaId: "valarpirai", thithiNumber: 6 });
  assert.deepEqual(thithiIndexToSelection(POURNAMI_INDEX), { pakshaId: "valarpirai", thithiNumber: 15 });
  for (let index = 0; index < 30; index += 1) {
    assert.equal(selectionToThithiIndex(thithiIndexToSelection(index)), index);
  }
  assert.throws(() => thithiIndexToSelection(30));
  assert.throws(() => selectionToThithiIndex({ pakshaId: "valarpirai", thithiNumber: 0 }));
  assert.equal(piraiForSector(15), "valarpirai");
  assert.equal(piraiForSector(31), "theipirai");
  assert.equal(sectorIndex(15), null);
  assert.equal(sectorIndex(31), null);
});

test("Thithi Details labels use the same names as Home's Thithi Patchi table", () => {
  for (let index = 0; index < 30; index += 1) {
    const selection = thithiIndexToSelection(index);
    const home = getThithiPatchiEntryForThithiNumber(selection.pakshaId, selection.thithiNumber).thithi;
    assert.deepEqual(thithiNameBi(selection), home);
    const expected = (language: "ta" | "en") =>
      selection.thithiNumber === 15
        ? home[language]
        : `${PIRAI_NAMES[selection.pakshaId][language]} ${home[language]}`;
    assert.equal(thithiIndexLabel(index, "ta"), expected("ta"));
    assert.equal(thithiIndexLabel(index, "en"), expected("en"));
  }
  assert.equal(thithiIndexLabel(20, "ta"), "வளர்பிறை சஷ்டி");
  assert.equal(thithiIndexLabel(20, "en"), "Valarpirai Sashti");
  assert.equal(thithiIndexLabel(AMAVASAI_INDEX, "en"), "Amavasya");
  assert.equal(thithiIndexLabel(POURNAMI_INDEX, "ta"), "பௌர்ணமி");
  assert.equal(thithiIndexLabel(null, "en"), "Unnamed sector");
});

test("Chennai 2026-10-18: daily thithi switches at the place's sunrise", () => {
  const rows = calendarYear(2026, CHENNAI);
  const rise = placeWallClock(CHENNAI, placeSunrise(CHENNAI, "2026-10-18"));

  const before = calculateDailyThithi(CHENNAI, cardTime("2026-10-18", rise.hour, rise.minute - 1));
  const after = calculateDailyThithi(CHENNAI, cardTime("2026-10-18", rise.hour, rise.minute + 1));
  assert.ok(before.status !== "error" && before.effective);
  assert.ok(after.status !== "error" && after.effective);
  assert.equal(before.effective.effectiveDateKey, "2026-10-17");
  assert.equal(before.effective.beforeSunrise, true);
  assert.equal(after.effective.effectiveDateKey, "2026-10-18");
  assert.equal(after.effective.beforeSunrise, false);

  for (const [result, dateKey] of [
    [before, "2026-10-17"],
    [after, "2026-10-18"],
  ] as const) {
    const row = rows.find((item) => item.date === dateKey);
    assert.ok(row);
    if (row.assumed === null) {
      assert.equal(result.status, "unnamed");
    } else {
      assert.equal(result.status, "ready");
      assert.ok(result.status === "ready");
      assert.equal(result.thithiIndex, row.assumed);
      assert.deepEqual(result.selection, thithiIndexToSelection(row.assumed));
      assert.equal(result.day, row);
    }
  }

  // Late evening still belongs to the same sunrise-to-sunrise cycle.
  const evening = calculateDailyThithi(CHENNAI, cardTime("2026-10-18", 23, 30));
  assert.ok(evening.status === "ready" || evening.status === "unnamed");
  assert.equal(evening.effective.effectiveDateKey, "2026-10-18");
});

test("unnamed sector gives a review state instead of a thithi", () => {
  const rows = calendarYear(2026, CHENNAI);
  const unnamed = rows.find((row) => row.assumed === null);
  assert.ok(unnamed, "2026 should contain a day in an unnamed sector");
  const result = calculateDailyThithi(CHENNAI, cardTime(unnamed.date, 12));
  assert.equal(result.status, "unnamed");
  assert.ok(result.status === "unnamed");
  assert.equal(result.day.date, unnamed.date);
  assert.equal(result.adjacentPirai, unnamed.angle === 168.75 ? "valarpirai" : "theipirai");
  assert.ok(result.day.critical);
  assert.ok(result.day.reasons.some((reason) => reason.code === "unnamedSector"));
});

test("peek never computes; calculate fills the shared per-place cache", () => {
  const place: ThithiPlace = { coords: null, timeZone: "Asia/Tokyo" };
  const selected = cardTime("1990-06-15", 12);
  assert.equal(peekDailyThithi(place, selected).status, "pending");
  const computed = calculateDailyThithi(place, selected);
  assert.ok(computed.status === "ready" || computed.status === "unnamed");
  const peeked = peekDailyThithi(place, selected);
  assert.equal(peeked.status, computed.status);
  assert.ok(peeked.status === "ready" || peeked.status === "unnamed");
  assert.equal(peeked.day, computed.day);
});

test("dates outside 1950 … end of the current year are out of range", () => {
  assert.equal(calculateDailyThithi(CHENNAI, cardTime("1949-06-01", 12)).status, "outOfRange");
  // Before sunrise on 1 January 1950 the effective date is 31 December 1949.
  assert.equal(calculateDailyThithi(CHENNAI, cardTime("1950-01-01", 3)).status, "outOfRange");
  const nextYear = lastCalendarYear(CHENNAI) + 1;
  assert.equal(calculateDailyThithi(CHENNAI, cardTime(`${nextYear}-03-01`, 12)).status, "outOfRange");
});

test("placeForCoords resolves the IANA zone used by both pages", () => {
  const place = placeForCoords({ lat: 13.0827, lng: 80.2707 });
  assert.equal(place.timeZone, "Asia/Kolkata");
  assert.equal(place.offsetMinutes, 330);
  assert.equal(placeForCoords(null).coords, null);
});
