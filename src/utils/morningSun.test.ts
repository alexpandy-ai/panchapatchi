import assert from "node:assert/strict";
import test from "node:test";
import { placeSunrise, placeSunset, placeWallClock } from "../thithiCalendar/calendar.ts";
import { placeForCoords } from "../thithiCalendar/dailyThithi.ts";
import { dateCardSunrise, formatTime, getFullDayJamamSchedule } from "./jamam.ts";
import { formatPlaceClock, morningSunAltitudeTime, morningSunTimes, type SunPlace } from "./morningSun.ts";
import { placeInputInstant } from "./placeClock.ts";
import { getSunrise, getSunset } from "./sunrise.ts";

const CHENNAI: SunPlace = { coords: { lat: 13.0827, lng: 80.2707 }, timeZone: "Asia/Kolkata" };
const LONDON: SunPlace = { coords: { lat: 51.5074, lng: -0.1278 }, timeZone: "Europe/London" };
const NEW_YORK: SunPlace = { coords: { lat: 40.7128, lng: -74.006 }, timeZone: "America/New_York" };
const TROMSO: SunPlace = { coords: { lat: 69.6492, lng: 18.9553 }, timeZone: "Europe/Oslo" };

/** Minutes after local midnight, with seconds. */
function localMinutes(place: SunPlace, time: Date | null): number {
  assert.ok(time, "expected a time");
  const { hour, minute, second } = placeWallClock(place, time);
  return hour * 60 + minute + second / 60;
}

/** Within `tolerance` minutes of a reference `HH:MM` minute (the reference covers the whole minute). */
function assertNear(place: SunPlace, time: Date | null, reference: string, tolerance = 1) {
  const [hour, minute] = reference.split(":").map(Number);
  const actual = localMinutes(place, time);
  const centre = hour * 60 + minute + 0.5;
  assert.ok(
    Math.abs(actual - centre) <= tolerance + 0.5,
    `${formatPlaceClock(place, time!)} is not within ${tolerance} min of ${reference}`,
  );
}

test("Chennai 2026-10-26 twilight starts match timeanddate.com (4:49, 5:14, 5:39)", () => {
  const [astronomical, nautical, civil, sunrise] = morningSunTimes(CHENNAI, "2026-10-26");
  assertNear(CHENNAI, astronomical.time, "04:49");
  assertNear(CHENNAI, nautical.time, "05:14");
  assertNear(CHENNAI, civil.time, "05:39");
  assert.deepEqual(
    [astronomical, nautical, civil, sunrise].map((entry) => entry.altitude),
    [-18, -12, -6, 0],
  );
  // timeanddate's 6:01 is the upper limb with refraction (−0.833°); the Sun's centre reaches 0° ~3.5 min later.
  assertNear(CHENNAI, morningSunAltitudeTime(CHENNAI, "2026-10-26", -0.833), "06:01");
  const gap = localMinutes(CHENNAI, sunrise.time) - localMinutes(CHENNAI, morningSunAltitudeTime(CHENNAI, "2026-10-26", -0.833));
  assert.ok(gap > 3 && gap < 4, `0° is ${gap.toFixed(2)} min after −0.833°`);
  assert.equal(formatPlaceClock(CHENNAI, sunrise.time!), "06:04");
});

test("London 2026-06-21: astronomical dawn is not reached; nautical 2:40 and civil 3:55 (BST)", () => {
  const [astronomical, nautical, civil, sunrise] = morningSunTimes(LONDON, "2026-06-21");
  assert.equal(astronomical.time, null);
  assertNear(LONDON, nautical.time, "02:40");
  assertNear(LONDON, civil.time, "03:55");
  assert.ok(sunrise.time);
});

test("Tromsø midnight sun: no angle is reached on 2026-06-21", () => {
  assert.deepEqual(
    morningSunTimes(TROMSO, "2026-06-21").map((entry) => entry.time),
    [null, null, null, null],
  );
});

test("astronomical < nautical < civil < sunrise, all on the selected local date (incl. DST change)", () => {
  const cases: [SunPlace, string][] = [
    [CHENNAI, "2026-01-01"],
    [CHENNAI, "2026-06-21"],
    [NEW_YORK, "2026-03-08"],
    [NEW_YORK, "2026-11-01"],
    [LONDON, "2026-12-21"],
  ];
  for (const [place, dateKey] of cases) {
    const times = morningSunTimes(place, dateKey).map((entry) => entry.time);
    assert.ok(times.every(Boolean), `${dateKey}: every angle is reached`);
    const values = times.map((time) => time!.getTime());
    assert.deepEqual([...values].sort((a, b) => a - b), values, `${dateKey}: ascending order`);
    for (const time of times) {
      const { year, month, day } = placeWallClock(place, time!);
      assert.equal(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        dateKey,
      );
    }
  }
});

test("one sunrise everywhere: Sunrise page 0° row = app sunrise = thithi calendar sunrise", () => {
  const coords = { lat: 13.0827, lng: 80.2707 };
  const place = placeForCoords(coords) as SunPlace;
  const zero = morningSunTimes(place, "2026-10-26").find((entry) => entry.id === "sunrise")!.time!;
  const selected = placeInputInstant("2026-10-26", "16:30", coords);
  assert.equal(getSunrise(selected, coords).getTime(), zero.getTime());
  assert.equal(placeSunrise(place, "2026-10-26").getTime(), zero.getTime());
  assert.equal(formatPlaceClock(place, zero), "06:04");
});

test("date card sunrise equals the first jamam start (Chennai, London, no location)", () => {
  const cases: [{ lat: number; lng: number } | null, string, string][] = [
    [{ lat: 13.0827, lng: 80.2707 }, "2026-10-26", "06:04"],
    [{ lat: 51.5074, lng: -0.1278 }, "2026-06-21", "04:50"],
    [{ lat: 51.5074, lng: -0.1278 }, "2026-12-15", "08:06"],
    [{ lat: 40.7128, lng: -74.006 }, "2026-06-21", "05:30"],
    [null, "2026-10-26", "06:00"],
  ];
  for (const [coords, dateKey, sunrise] of cases) {
    const selected = placeInputInstant(dateKey, "12:00", coords);
    const firstJamam = getFullDayJamamSchedule(selected, coords).all[0];
    assert.equal(firstJamam.index, 1);
    assert.equal(firstJamam.start.getTime(), getSunrise(selected, coords).getTime());
    assert.equal(dateCardSunrise(selected, coords), formatTime(firstJamam.start, coords));
    assert.equal(dateCardSunrise(selected, coords), sunrise, `${dateKey} ${JSON.stringify(coords)}`);
  }
});

test("sunset is the Sun's centre setting through 0°; no location keeps the fixed 18:00", () => {
  const coords = { lat: 13.0827, lng: 80.2707 };
  const place = placeForCoords(coords);
  const selected = placeInputInstant("2026-10-26", "16:30", coords);
  const sunset = getSunset(selected, coords);
  assert.equal(sunset.getTime(), placeSunset(place, "2026-10-26").getTime());
  // timeanddate: 17:44 (−0.833°); setting, the centre crosses 0° a few minutes earlier.
  assertNear(CHENNAI, sunset, "17:41");
  assert.equal(formatTime(getSunset(selected, null), null), "18:00");
});
