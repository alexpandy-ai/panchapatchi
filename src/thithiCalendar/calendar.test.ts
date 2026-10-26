import assert from "node:assert/strict";
import test from "node:test";
import * as Astronomy from "astronomy-engine";
import {
  calendarYear,
  degreeRange,
  effectiveCalculationDate,
  formatPlaceInstant,
  formatPlaceTime,
  localDateKey,
  localMidnight,
  moonSamples,
  peekCalendarYear,
  placeKey,
  placeSunrise,
  placeToday,
  placeWallClock,
  placeWallClockInstant,
  sectorIndex,
  thithiLabel,
  type ThithiPlace,
} from "./calendar.ts";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

const CHENNAI: ThithiPlace = { coords: { lat: 13.0827, lng: 80.2707 }, timeZone: "Asia/Kolkata" };
const NEW_YORK: ThithiPlace = { coords: { lat: 40.7128, lng: -74.006 }, timeZone: "America/New_York" };
const FIXED_DEFAULT: ThithiPlace = { coords: null, timeZone: "Asia/Kolkata" };

test("32 sector mapping keeps two sectors unnamed", () => {
  assert.equal(sectorIndex(0), 14);
  assert.equal(sectorIndex(15), null);
  assert.equal(sectorIndex(16), 29);
  assert.equal(sectorIndex(31), null);
  assert.equal(degreeRange(14), "0°–11.25°");
  assert.equal(degreeRange(29), "180°–191.25°");
  assert.equal(thithiLabel(null), "பெயரிடப்படாத பகுதி");
  assert.equal(thithiLabel(14), "அமாவாசை");
  assert.equal(thithiLabel(29), "பௌர்ணமி");
  assert.equal(thithiLabel(15), "வளர்பிறை பிரதமை");
  assert.equal(thithiLabel(0), "தேய்பிறை பிரதமை");
});

test("current year has every civil day and flags repeated sectors (Chennai)", () => {
  const year = Number(placeToday(CHENNAI).slice(0, 4));
  const rows = calendarYear(year, CHENNAI);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  assert.equal(rows.length, leap ? 366 : 365);
  assert.equal(rows[0].date, `${year}-01-01`);
  assert.equal(rows.at(-1)?.date, `${year}-12-31`);
  assert.ok(rows.some((row) => row.critical && row.reasons.length > 0));
  assert.ok(rows.some((row) => row.assumed === null || row.events.some((event) => event.index === null)));
  assert.ok(rows.every((row) => row.endAngle - row.angle === 11.25));
});

test("local dates and midnights follow the place time zone, including DST", () => {
  const instant = new Date("2024-03-15T02:00:00Z");
  assert.equal(localDateKey(CHENNAI, instant), "2024-03-15");
  assert.equal(localDateKey(NEW_YORK, instant), "2024-03-14");

  assert.equal(localMidnight(CHENNAI, "2024-07-01").toISOString(), "2024-06-30T18:30:00.000Z");
  assert.equal(localMidnight(NEW_YORK, "2024-01-15").toISOString(), "2024-01-15T05:00:00.000Z");
  assert.equal(localMidnight(NEW_YORK, "2024-07-01").toISOString(), "2024-07-01T04:00:00.000Z");

  const fixed: ThithiPlace = { coords: null, timeZone: null, offsetMinutes: 330 };
  assert.equal(localMidnight(fixed, "2024-07-01").toISOString(), "2024-06-30T18:30:00.000Z");
  assert.match(formatPlaceTime("2024-07-01T12:00:00Z", NEW_YORK), /8:00/);
});

test("New York calendar uses its own sunsets, sunrises and DST-aware days", () => {
  const ny = calendarYear(2024, NEW_YORK);
  const chennai = calendarYear(2024, CHENNAI);
  assert.equal(ny.length, 366);
  assert.equal(ny[0].date, "2024-01-01");
  assert.equal(ny.at(-1)?.date, "2024-12-31");
  assert.ok(ny.every((row) => row.endAngle - row.angle === 11.25));

  const nyJuly = ny.find((row) => row.date === "2024-07-01");
  const nyJan = ny.find((row) => row.date === "2024-01-15");
  assert.ok(nyJuly && nyJan);
  // Sunrise falls on the same local date in New York (EDT in July, EST in January).
  assert.equal(localDateKey(NEW_YORK, new Date(nyJuly.rise)), "2024-07-01");
  assert.equal(localDateKey(NEW_YORK, new Date(nyJan.rise)), "2024-01-15");
  const julyHourUtc = new Date(nyJuly.rise).getUTCHours();
  assert.ok(julyHourUtc >= 9 && julyHourUtc <= 10, `NY July sunrise UTC hour ${julyHourUtc}`);

  for (const row of ny.filter((item) => item.events.length > 0)) {
    for (const event of row.events) {
      assert.equal(event.date, row.date);
      assert.equal(localDateKey(NEW_YORK, new Date(event.intervalEnd)), row.date);
    }
  }

  const differing = ny.filter((row, index) => row.rise !== chennai[index].rise);
  assert.equal(differing.length, 366);
  assert.ok(
    ny.some((row, index) => row.assumed !== chennai[index].assumed),
    "some sunset-assigned thithis should differ between New York and Chennai",
  );
});

test("caches are keyed by place", () => {
  assert.notEqual(placeKey(CHENNAI), placeKey(NEW_YORK));
  assert.notEqual(placeKey(CHENNAI), placeKey(FIXED_DEFAULT));
  calendarYear(2024, CHENNAI);
  assert.ok(peekCalendarYear(2024, CHENNAI));
  assert.equal(peekCalendarYear(2023, NEW_YORK), undefined);
});

test("no-location default uses fixed 06:00 sunrise and 18:00 sunset", () => {
  const rows = calendarYear(2024, FIXED_DEFAULT);
  const row = rows.find((item) => item.date === "2024-05-10");
  assert.ok(row);
  assert.equal(row.rise, "2024-05-10T00:30:00.000Z");
  const samples = moonSamples(2024, 5, FIXED_DEFAULT);
  assert.equal(samples[0].time.toISOString(), "2024-05-01T12:30:00.000Z");
});

/** Sun's centre rising through 0° geometric altitude (the app-wide sunrise). */
function independentSunrise(place: ThithiPlace, dateKey: string): Date {
  assert.ok(place.coords);
  const observer = new Astronomy.Observer(place.coords.lat, place.coords.lng, 0);
  const start = localMidnight(place, dateKey);
  const found = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, 1, start, 1, 0);
  assert.ok(found);
  return found.date;
}

function at(place: ThithiPlace, dateKey: string, hours: number, minutes = 0): Date {
  return placeWallClockInstant(place, dateKey, hours * HOUR_MS + minutes * MINUTE_MS);
}

function assertBoundaries(place: ThithiPlace, dateKey: string, previousKey: string, nextKey: string) {
  const rise = placeSunrise(place, dateKey);
  assert.equal(rise.getTime(), independentSunrise(place, dateKey).getTime());
  const previousRise = independentSunrise(place, previousKey);
  const nextRise = independentSunrise(place, nextKey);

  for (const instant of [localMidnight(place, dateKey), new Date(rise.getTime() - MINUTE_MS), new Date(rise.getTime() - 1)]) {
    const result = effectiveCalculationDate(place, instant);
    assert.equal(result.selectedDateKey, dateKey);
    assert.equal(result.effectiveDateKey, previousKey);
    assert.equal(result.beforeSunrise, true);
    assert.equal(result.cycleStart.getTime(), previousRise.getTime());
    assert.equal(result.cycleEnd.getTime(), rise.getTime());
  }

  for (const instant of [rise, new Date(rise.getTime() + MINUTE_MS)]) {
    const result = effectiveCalculationDate(place, instant);
    assert.equal(result.selectedDateKey, dateKey);
    assert.equal(result.effectiveDateKey, dateKey);
    assert.equal(result.beforeSunrise, false);
    assert.equal(result.cycleStart.getTime(), rise.getTime());
    assert.equal(result.cycleEnd.getTime(), nextRise.getTime());
    assert.notEqual(result.cycleEnd.getTime() - result.cycleStart.getTime(), 24 * HOUR_MS);
  }
}

test("effective date switches exactly at the selected place's sunrise (Chennai)", () => {
  assertBoundaries(CHENNAI, "2026-10-18", "2026-10-17", "2026-10-19");
  const rise = placeSunrise(CHENNAI, "2026-10-18");
  assert.equal(localDateKey(CHENNAI, rise), "2026-10-18");
  const { hour } = placeWallClock(CHENNAI, rise);
  assert.ok(hour >= 5 && hour <= 6, `Chennai sunrise hour ${hour}`);
  assert.match(formatPlaceInstant(rise, CHENNAI), /^2026-10-18 0[56]:\d\d:\d\d$/);
});

test("effective date switches exactly at sunrise in a DST zone (New York)", () => {
  assertBoundaries(NEW_YORK, "2026-10-18", "2026-10-17", "2026-10-19");
  // DST starts 2026-03-08 and ends 2026-11-01.
  assertBoundaries(NEW_YORK, "2026-03-08", "2026-03-07", "2026-03-09");
  assertBoundaries(NEW_YORK, "2026-11-01", "2026-10-31", "2026-11-02");

  const springForward = effectiveCalculationDate(NEW_YORK, at(NEW_YORK, "2026-03-08", 7, 0));
  assert.equal(springForward.effectiveDateKey, "2026-03-07");
  assert.equal(placeWallClock(NEW_YORK, springForward.cycleStart).hour, 6);
  assert.equal(placeWallClock(NEW_YORK, springForward.cycleEnd).hour, 7);

  const fallBack = effectiveCalculationDate(NEW_YORK, at(NEW_YORK, "2026-11-01", 6, 40));
  assert.equal(fallBack.effectiveDateKey, "2026-11-01");
  assert.equal(placeWallClock(NEW_YORK, fallBack.cycleStart).hour, 6);
  const beforeFallBackRise = effectiveCalculationDate(NEW_YORK, at(NEW_YORK, "2026-11-01", 6, 0));
  assert.equal(beforeFallBackRise.effectiveDateKey, "2026-10-31");
  assert.equal(placeWallClock(NEW_YORK, beforeFallBackRise.cycleStart).hour, 7);
  // Elapsed sunrise-to-sunrise time stays near 24 h even when the wall clock shifts by an hour.
  const elapsed = beforeFallBackRise.cycleEnd.getTime() - beforeFallBackRise.cycleStart.getTime();
  assert.ok(Math.abs(elapsed - 24 * HOUR_MS) < 5 * MINUTE_MS, `elapsed ${elapsed}`);
});

test("before sunrise on 1 January rolls back to 31 December of the previous year", () => {
  for (const place of [CHENNAI, NEW_YORK]) {
    const result = effectiveCalculationDate(place, at(place, "2026-01-01", 5, 0));
    assert.equal(result.selectedDateKey, "2026-01-01");
    assert.equal(result.effectiveDateKey, "2025-12-31");
    assert.equal(localDateKey(place, result.cycleStart), "2025-12-31");
    assert.equal(localDateKey(place, result.cycleEnd), "2026-01-01");
    assert.ok(calendarYear(2025, place).some((row) => row.date === "2025-12-31"));
  }
});

test("before sunrise on 1 March of a leap year rolls back to 29 February", () => {
  for (const place of [CHENNAI, NEW_YORK]) {
    const result = effectiveCalculationDate(place, localMidnight(place, "2024-03-01"));
    assert.equal(result.effectiveDateKey, "2024-02-29");
    assert.equal(effectiveCalculationDate(place, at(place, "2023-03-01", 5, 0)).effectiveDateKey, "2023-02-28");
  }
});

test("no-location default switches at fixed 06:00", () => {
  const before = effectiveCalculationDate(FIXED_DEFAULT, at(FIXED_DEFAULT, "2024-05-10", 5, 59));
  assert.equal(before.selectedDateKey, "2024-05-10");
  assert.equal(before.effectiveDateKey, "2024-05-09");
  assert.equal(before.cycleStart.toISOString(), "2024-05-09T00:30:00.000Z");
  assert.equal(before.cycleEnd.toISOString(), "2024-05-10T00:30:00.000Z");

  const atSix = effectiveCalculationDate(FIXED_DEFAULT, at(FIXED_DEFAULT, "2024-05-10", 6, 0));
  assert.equal(atSix.effectiveDateKey, "2024-05-10");
  assert.equal(atSix.beforeSunrise, false);
  assert.equal(atSix.cycleStart.toISOString(), "2024-05-10T00:30:00.000Z");
  assert.equal(atSix.cycleEnd.toISOString(), "2024-05-11T00:30:00.000Z");
});
