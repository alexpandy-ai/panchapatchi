import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysInMonth,
  kolkataDateKey,
  kolkataQuarterEventsInMonth,
  monthDates,
  utcCivilToKolkata,
} from "./kolkataCivil.ts";
import { formatUsnoTz, resolvePlaceZone, utcOffsetHoursAtLocalNoon } from "./placeTimeZone.ts";

test("UTC at 18:30 and later is the next Asia/Kolkata calendar date", () => {
  const justAfter = utcCivilToKolkata({ year: 2026, month: 6, day: 15, hour: 18, minute: 31 });
  assert.equal(justAfter.day, 16);
  assert.equal(justAfter.month, 6);
  assert.equal(justAfter.hour, 0);
  assert.equal(justAfter.minute, 1);

  const atBoundary = utcCivilToKolkata({ year: 2026, month: 6, day: 15, hour: 18, minute: 30 });
  assert.equal(kolkataDateKey(atBoundary), "2026-06-16");
  assert.equal(atBoundary.hour, 0);
  assert.equal(atBoundary.minute, 0);
});

test("UTC before 18:30 stays on the same Asia/Kolkata calendar date", () => {
  const before = utcCivilToKolkata({ year: 2026, month: 6, day: 15, hour: 18, minute: 29 });
  assert.equal(kolkataDateKey(before), "2026-06-15");
  assert.equal(before.hour, 23);
  assert.equal(before.minute, 59);
});

test("2026-01-31 19:00 UTC belongs on 2026-02-01 in Kolkata, not January 31", () => {
  const event = {
    year: 2026,
    month: 1,
    day: 31,
    hour: 19,
    minute: 0,
    phase: "Full Moon",
  };
  const kolkata = utcCivilToKolkata(event);
  assert.equal(kolkata.year, 2026);
  assert.equal(kolkata.month, 2);
  assert.equal(kolkata.day, 1);
  assert.equal(kolkata.hour, 0);
  assert.equal(kolkata.minute, 30);

  const january = kolkataQuarterEventsInMonth([event], 2026, 1);
  const february = kolkataQuarterEventsInMonth([event], 2026, 2);
  assert.equal(january.size, 0);
  assert.deepEqual(february.get("2026-02-01"), [{ phase: "Full Moon", hour: 0, minute: 30 }]);
});

test("an event at 2026-02-01 00:10 IST (previous UTC evening) is listed on February 1", () => {
  const event = {
    year: 2026,
    month: 1,
    day: 31,
    hour: 18,
    minute: 40,
    phase: "New Moon",
  };
  const kolkata = utcCivilToKolkata(event);
  assert.equal(kolkata.hour, 0);
  assert.equal(kolkata.minute, 10);
  const february = kolkataQuarterEventsInMonth([event], 2026, 2);
  assert.deepEqual(february.get("2026-02-01"), [{ phase: "New Moon", hour: 0, minute: 10 }]);
  assert.equal(kolkataQuarterEventsInMonth([event], 2026, 1).size, 0);
});

test("month length is generated locally, including February leap and non-leap years", () => {
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(monthDates(2026, 2).length, 28);
  assert.equal(monthDates(2026, 2).at(-1)?.day, 28);
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(monthDates(2024, 2).length, 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.deepEqual(monthDates(2026, 9)[0], { year: 2026, month: 9, day: 1 });
});

test("USNO timezone offset keeps India's 5.5 and encodes daylight saving in the number", () => {
  assert.equal(formatUsnoTz(5.5), "5.5");
  assert.equal(formatUsnoTz(-4), "-4");
  assert.equal(formatUsnoTz(5.75), "5.75");
  assert.equal(utcOffsetHoursAtLocalNoon("Asia/Kolkata", 2026, 1, 31), 5.5);
  assert.equal(utcOffsetHoursAtLocalNoon("Asia/Kolkata", 2026, 9, 28), 5.5);
  assert.equal(utcOffsetHoursAtLocalNoon("Europe/London", 2026, 1, 15), 0);
  assert.equal(utcOffsetHoursAtLocalNoon("Europe/London", 2026, 7, 15), 1);
  assert.equal(utcOffsetHoursAtLocalNoon("America/New_York", 2026, 1, 15), -5);
  assert.equal(utcOffsetHoursAtLocalNoon("America/New_York", 2026, 7, 15), -4);
  assert.equal(resolvePlaceZone(13.0827, 80.2707).timeZone, "Asia/Kolkata");
  assert.equal(resolvePlaceZone(40.7128, -74.006).timeZone, "America/New_York");
  assert.equal(resolvePlaceZone(25.2048, 55.2708).timeZone, "Asia/Dubai");
});
