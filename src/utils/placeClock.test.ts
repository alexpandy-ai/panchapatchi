import assert from "node:assert/strict";
import test from "node:test";
import { dateCardSunrise, formatTime, formatTimeRange, getFullDayJamamSchedule, getJamamState } from "./jamam.ts";
import {
  formatClock,
  placeDateKey,
  placeInputInstant,
  placeInputValues,
  placeWeekday,
  placeZoneLabel,
  withPlaceDate,
} from "./placeClock.ts";
import { getSunrise } from "./sunrise.ts";

const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const LONDON = { lat: 51.5074, lng: -0.1278 };
const NEW_YORK = { lat: 40.7128, lng: -74.006 };

const HOUR = 3_600_000;
const iso = (time: Date) => time.toISOString().slice(0, 16);

function minutesOf(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

test("formatter shows the place's wall clock (London BST and GMT, New York, Chennai)", () => {
  const summer = new Date("2026-06-21T03:50:00Z");
  assert.equal(formatClock(summer, LONDON), "04:50");
  assert.equal(formatClock(summer, NEW_YORK), "23:50");
  assert.equal(formatClock(summer, CHENNAI), "09:20");
  const winter = new Date("2026-12-15T08:06:30Z");
  assert.equal(formatClock(winter, LONDON), "08:06");
  assert.equal(formatClock(winter, LONDON, true), "08:06:30");
  assert.equal(formatClock(winter, NEW_YORK), "03:06");
  assert.equal(formatClock(winter, CHENNAI), "13:36");
  // Midnight is 00, never 24.
  assert.equal(formatClock(new Date("2026-10-26T18:30:00Z"), CHENNAI), "00:00");
  assert.equal(formatTimeRange(summer, new Date(summer.getTime() + HOUR), LONDON), "04:50 – 05:50");
});

test("date and time inputs are the place's local time", () => {
  assert.equal(iso(placeInputInstant("2026-06-21", "06:00", LONDON)), "2026-06-21T05:00");
  assert.equal(iso(placeInputInstant("2026-12-15", "06:00", LONDON)), "2026-12-15T06:00");
  assert.equal(iso(placeInputInstant("2026-06-21", "06:00", NEW_YORK)), "2026-06-21T10:00");
  assert.equal(iso(placeInputInstant("2026-12-15", "06:00", NEW_YORK)), "2026-12-15T11:00");
  assert.equal(iso(placeInputInstant("2026-10-26", "22:00", CHENNAI)), "2026-10-26T16:30");
  // Round trip: the card shows back exactly what was typed.
  for (const [coords, date, time] of [
    [LONDON, "2026-06-21", "06:00"],
    [LONDON, "2026-12-15", "23:59"],
    [NEW_YORK, "2026-11-01", "00:30"],
    [CHENNAI, "2026-10-26", "22:00"],
  ] as const) {
    assert.deepEqual(placeInputValues(placeInputInstant(date, time, coords), coords), { date, time });
  }
});

test("'now' is the real moment, shown on each place's clock", () => {
  const now = new Date("2026-10-26T16:30:00Z");
  assert.deepEqual(placeInputValues(now, CHENNAI), { date: "2026-10-26", time: "22:00" });
  assert.deepEqual(placeInputValues(now, LONDON), { date: "2026-10-26", time: "16:30" });
  assert.deepEqual(placeInputValues(now, NEW_YORK), { date: "2026-10-26", time: "12:30" });
  // Late evening in New York is already the next day in Chennai.
  const late = new Date("2026-10-27T03:30:00Z");
  assert.equal(placeDateKey(late, NEW_YORK), "2026-10-26");
  assert.equal(placeDateKey(late, CHENNAI), "2026-10-27");
  assert.equal(placeWeekday(late, NEW_YORK), 1);
  assert.equal(placeWeekday(late, CHENNAI), 2);
  // The active jamam is the one containing the real moment.
  for (const coords of [CHENNAI, LONDON, NEW_YORK]) {
    const active = getJamamState(now, coords).slots.find((slot) => slot.isActive)!;
    assert.ok(active.start.getTime() <= now.getTime() && now.getTime() < active.end.getTime());
  }
});

test("DST: skipped times move forward, repeated times take the first occurrence", () => {
  // London 2026-03-29: 01:00 GMT → 02:00 BST.
  assert.equal(iso(placeInputInstant("2026-03-29", "00:30", LONDON)), "2026-03-29T00:30");
  assert.equal(iso(placeInputInstant("2026-03-29", "01:30", LONDON)), "2026-03-29T01:30");
  assert.equal(formatClock(placeInputInstant("2026-03-29", "01:30", LONDON), LONDON), "02:30");
  assert.equal(iso(placeInputInstant("2026-03-29", "06:00", LONDON)), "2026-03-29T05:00");
  // London 2026-10-25: 02:00 BST → 01:00 GMT; 01:30 happens twice.
  assert.equal(iso(placeInputInstant("2026-10-25", "00:30", LONDON)), "2026-10-24T23:30");
  assert.equal(iso(placeInputInstant("2026-10-25", "01:30", LONDON)), "2026-10-25T00:30");
  assert.equal(iso(placeInputInstant("2026-10-25", "02:30", LONDON)), "2026-10-25T02:30");
  assert.equal(iso(placeInputInstant("2026-10-25", "06:00", LONDON)), "2026-10-25T06:00");
  // New York 2026-03-08 (02:00 EST → 03:00 EDT) and 2026-11-01 (02:00 EDT → 01:00 EST).
  assert.equal(formatClock(placeInputInstant("2026-03-08", "02:30", NEW_YORK), NEW_YORK), "03:30");
  assert.equal(iso(placeInputInstant("2026-03-08", "06:00", NEW_YORK)), "2026-03-08T10:00");
  assert.equal(iso(placeInputInstant("2026-11-01", "01:30", NEW_YORK)), "2026-11-01T05:30");
  assert.equal(iso(placeInputInstant("2026-11-01", "06:00", NEW_YORK)), "2026-11-01T11:00");
});

test("DST days: sunrise and jamams stay on the place's clock with no hour jump", () => {
  const cases = [
    [LONDON, "2026-03-28", "2026-03-29", "2026-03-30"],
    [LONDON, "2026-10-24", "2026-10-25", "2026-10-26"],
    [NEW_YORK, "2026-03-07", "2026-03-08", "2026-03-09"],
    [NEW_YORK, "2026-10-31", "2026-11-01", "2026-11-02"],
  ] as const;
  for (const [coords, ...dates] of cases) {
    const rises = dates.map((date) => dateCardSunrise(placeInputInstant(date, "12:00", coords), coords));
    // Clock-time sunrise moves by minutes, never by an hour, across the change.
    const steps = [minutesOf(rises[1]) - minutesOf(rises[0]), minutesOf(rises[2]) - minutesOf(rises[1])];
    const spring = dates[1].includes("-03-");
    for (const step of steps) assert.ok(Math.abs(step) <= 4 || Math.abs(step - (spring ? 60 : -60)) <= 4, `${dates} ${rises}`);
    assert.ok(Math.abs(steps[0]) > 30 && Math.abs(steps[1]) <= 4, `${dates} ${rises}`);

    // The cycle that spans the change: 10 contiguous jamams from sunrise to the next sunrise.
    const selected = placeInputInstant(dates[0], "12:00", coords);
    const { all } = getFullDayJamamSchedule(selected, coords);
    assert.equal(all.length, 10);
    assert.equal(formatTime(all[0].start, coords), rises[0]);
    assert.equal(formatTime(all[9].end, coords), rises[1]);
    for (let index = 1; index < all.length; index += 1) {
      assert.equal(all[index].start.getTime(), all[index - 1].end.getTime());
    }
    assert.equal(all[9].end.getTime(), getSunrise(selected, coords, 1).getTime());
  }
});

test("date card sunrise is the first jamam start on the place's clock", () => {
  for (const [coords, date, sunrise] of [
    [LONDON, "2026-06-21", "04:50"],
    [LONDON, "2026-12-15", "08:06"],
    [NEW_YORK, "2026-06-21", "05:30"],
    [CHENNAI, "2026-10-26", "06:04"],
  ] as const) {
    // Before sunrise the card still shows that date's sunrise; jamam 1 of the selected date starts there.
    for (const time of ["00:30", "12:00", "23:30"]) {
      const selected = placeInputInstant(date, time, coords);
      assert.equal(dateCardSunrise(selected, coords), sunrise);
    }
    const noon = placeInputInstant(date, "12:00", coords);
    assert.equal(formatTime(getFullDayJamamSchedule(noon, coords).all[0].start, coords), sunrise);
  }
});

test("zone label only for places off the device's clock", () => {
  const summer = new Date("2026-06-21T12:00:00Z");
  const winter = new Date("2026-12-15T12:00:00Z");
  const device = -summer.getTimezoneOffset();
  assert.equal(placeZoneLabel(null, summer), null);
  if (device === 330) assert.equal(placeZoneLabel(CHENNAI, summer), null);
  if (device !== 60) assert.equal(placeZoneLabel(LONDON, summer), "Europe/London · GMT+1");
  if (-winter.getTimezoneOffset() !== 0) assert.equal(placeZoneLabel(LONDON, winter), "Europe/London · GMT");
  if (device !== -240) assert.equal(placeZoneLabel(NEW_YORK, summer), "America/New_York · GMT−4");
});

test("moving to another date keeps the place's wall-clock time, across DST", () => {
  const summer = placeInputInstant("2026-06-21", "06:00", LONDON);
  const winter = withPlaceDate(summer, "2026-12-15", LONDON);
  assert.deepEqual(placeInputValues(winter, LONDON), { date: "2026-12-15", time: "06:00" });
  assert.equal(iso(winter), "2026-12-15T06:00");
  const chennai = withPlaceDate(placeInputInstant("2026-10-26", "22:00", CHENNAI), "2026-01-01", CHENNAI);
  assert.deepEqual(placeInputValues(chennai, CHENNAI), { date: "2026-01-01", time: "22:00" });
});
