import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAlternateDayActivity,
  getAlternateJamamActivitySlots,
  getAlternateJamamActivitySlotsForThithi,
} from "./alternateCalculation";
import { getPatchiAntharaMatrix } from "./anthara";
import { nextMorningScheduleWeekday } from "./dayGroup";
import type { JamamSlot } from "./jamam";
import { jamamIndexForYama } from "./jamam";
import {
  getNextMorningDateAfterNight,
  getThithiPatchiEntryForThithiNumber,
  nextMorningThithiForAnthara,
  resolveNextMorningThithiContext,
  thithiEntryAt,
} from "./thithi";

function localDate(year: number, month: number, day: number, hour: number): Date {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function nightSlot(start: Date, end: Date): JamamSlot {
  return {
    index: jamamIndexForYama(1, "night"),
    label: "ஜாமம் 6",
    period: "night",
    start,
    end,
    isActive: true,
  };
}

test("normal next-day flow: morning is the sunrise that closes the night, not calendar+1 at the same clock", () => {
  const night = localDate(2026, 1, 4, 20);
  const morning = getNextMorningDateAfterNight(night, null);
  assert.equal(morning.getFullYear(), 2026);
  assert.equal(morning.getMonth(), 0);
  assert.equal(morning.getDate(), 5);
  assert.equal(morning.getHours(), 6);
  assert.notEqual(morning.getTime(), localDate(2026, 1, 5, 20).getTime());
});

test("thithi continuing into the next morning keeps that thithi (does not blindly +1)", () => {
  const night = localDate(2026, 1, 4, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.selectedJamamType, "night");
  assert.equal(context.originalThithi.thithiNumber, 2);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningDate.getDate(), 5);
  assert.equal(context.nextMorningThithi.thithiNumber, 2);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningThithi.thithiNumber, thithiEntryAt(context.nextMorningDate).thithiNumber);
});

test("overnight thithi transition uses the thithi in force at next sunrise", () => {
  const night = localDate(2026, 1, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getDate(), 2);
  assert.equal(context.nextMorningThithi.thithiNumber, 14);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.notEqual(
    thithiEntryAt(night).thithiNumber,
    context.nextMorningThithi.thithiNumber,
  );
});

test("Amavasai overnight resolves next morning as Valarpirai Prathamai", () => {
  const night = localDate(2026, 1, 18, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const sunsetThithi = thithiEntryAt(localDate(2026, 1, 18, 18));
  assert.equal(sunsetThithi.pakshaId, "theipirai");
  assert.equal(sunsetThithi.thithiNumber, 15);
  assert.equal(context.nextMorningDate.getDate(), 19);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 1);
  assert.notEqual(sunsetThithi.pakshaId, context.nextMorningThithi.pakshaId);
});

test("Pournami overnight resolves next morning as Theipirai Prathamai", () => {
  const night = localDate(2026, 2, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const sunsetThithi = thithiEntryAt(localDate(2026, 2, 1, 18));
  assert.equal(sunsetThithi.pakshaId, "valarpirai");
  assert.equal(sunsetThithi.thithiNumber, 15);
  assert.equal(context.nextMorningDate.getMonth(), 1);
  assert.equal(context.nextMorningDate.getDate(), 2);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 1);
  assert.notEqual(sunsetThithi.pakshaId, context.nextMorningThithi.pakshaId);
});

test("month boundary: 31 Jan night resolves 1 Feb morning", () => {
  const night = localDate(2026, 1, 31, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getFullYear(), 2026);
  assert.equal(context.nextMorningDate.getMonth(), 1);
  assert.equal(context.nextMorningDate.getDate(), 1);
  assert.equal(context.nextMorningThithi.thithiNumber, 14);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
});

test("year boundary: 31 Dec night resolves 1 Jan morning", () => {
  const night = localDate(2026, 12, 31, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getFullYear(), 2027);
  assert.equal(context.nextMorningDate.getMonth(), 0);
  assert.equal(context.nextMorningDate.getDate(), 1);
  assert.equal(context.nextMorningThithi.thithiNumber, 9);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
});

test("same pirai next morning uses that pirai’s Athikara Patchi bracket day", () => {
  const original = getThithiPatchiEntryForThithiNumber("valarpirai", 11);
  const sunrise = getThithiPatchiEntryForThithiNumber("valarpirai", 12);
  const next = nextMorningThithiForAnthara(original, sunrise);
  const expected = getThithiPatchiEntryForThithiNumber("valarpirai", 12);
  assert.equal(next.pakshaId, "valarpirai");
  assert.equal(next.thithiNumber, 12);
  assert.equal(next.patchi, expected.patchi);
  assert.equal(next.athikaraWeekday, expected.athikaraWeekday);
  assert.equal(next.athikaraDay.en, expected.athikaraDay.en);
  assert.notEqual(next.athikaraWeekday, next.weekday);
});

test("Pournami → next pirai uses Theipirai Prathamai Athikara bracket day, not planet Tuesday", () => {
  const pournami = getThithiPatchiEntryForThithiNumber("valarpirai", 15);
  const sunriseStillPournami = getThithiPatchiEntryForThithiNumber("valarpirai", 15);
  const next = nextMorningThithiForAnthara(pournami, sunriseStillPournami);
  const expected = getThithiPatchiEntryForThithiNumber("theipirai", 1);
  assert.equal(pournami.pakshaId, "valarpirai");
  assert.equal(next.pakshaId, "theipirai");
  assert.equal(next.thithiNumber, 1);
  assert.equal(next.patchi, expected.patchi);
  assert.equal(next.athikaraWeekday, expected.athikaraWeekday);
  assert.equal(next.athikaraDay.en, "Thursday");
  assert.equal(next.weekday, 2, "planet day stays Tuesday");
  assert.equal(next.athikaraWeekday, 4, "Athikara bracket day is Thursday");
  assert.notEqual(next.patchi, pournami.patchi);
});

test("Amavasai → next pirai uses Valarpirai Prathamai Athikara bracket day, not planet Tuesday", () => {
  const amavasai = getThithiPatchiEntryForThithiNumber("theipirai", 15);
  const sunriseStillAmavasai = getThithiPatchiEntryForThithiNumber("theipirai", 15);
  const next = nextMorningThithiForAnthara(amavasai, sunriseStillAmavasai);
  const expected = getThithiPatchiEntryForThithiNumber("valarpirai", 1);
  assert.equal(next.pakshaId, "valarpirai");
  assert.equal(next.thithiNumber, 1);
  assert.equal(next.patchi, expected.patchi);
  assert.equal(next.athikaraWeekday, expected.athikaraWeekday);
  assert.equal(next.athikaraDay.en, "Wednesday");
  assert.equal(next.athikaraWeekday, 3);
  assert.notEqual(next.patchi, amavasai.patchi);
});

test("sunrise already in the next pirai keeps that pirai’s Athikara bracket day", () => {
  const pournami = getThithiPatchiEntryForThithiNumber("valarpirai", 15);
  const sunrise = getThithiPatchiEntryForThithiNumber("theipirai", 1);
  const next = nextMorningThithiForAnthara(pournami, sunrise);
  assert.equal(next.pakshaId, "theipirai");
  assert.equal(next.thithiNumber, 1);
  assert.equal(next.patchi, sunrise.patchi);
  assert.equal(next.athikaraWeekday, sunrise.athikaraWeekday);
  assert.equal(next.athikaraDay.en, sunrise.athikaraDay.en);
});

test("night Antharam rows 6–10 use next-morning day activities, not the night jamam’s same-day weekday", () => {
  const night = localDate(2026, 1, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const clickedWeekday = 2;
  const start = night;
  const end = new Date(night.getTime() + 2 * 60 * 60 * 1000);
  const slot = nightSlot(start, end);

  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) => getAlternateJamamActivitySlots("valarpirai", clickedWeekday, yama, period),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlotsForThithi(context.nextMorningThithi, yama, "day"),
      nextMorningThithiContext: context,
    },
  );

  assert.equal(matrix.columns.length, 10);
  assert.equal(matrix.columns[5]?.appendedMorning, true);

  const sameDayMorning = getAlternateJamamActivitySlots("valarpirai", clickedWeekday, 1, "day");
  const nextMorning = getAlternateJamamActivitySlotsForThithi(context.nextMorningThithi, 1, "day");
  const appendedYama = matrix.columns[5]?.jamamIndex ?? 1;
  const expectedNext = getAlternateJamamActivitySlotsForThithi(
    context.nextMorningThithi,
    appendedYama,
    "day",
  );
  const planetDaySlots = getAlternateJamamActivitySlots(
    context.nextMorningThithi.pakshaId,
    context.nextMorningThithi.weekday,
    appendedYama,
    "day",
  );

  const peacock = matrix.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  const peacockActivities = peacock.activities;
  const sameDayPeacock = sameDayMorning.find((slot) => slot.bird === "மயில்")?.activity;
  const nextPeacock = expectedNext.find((slot) => slot.bird === "மயில்")?.activity;
  assert.equal(peacockActivities[5], nextPeacock);
  if (sameDayPeacock !== nextPeacock) {
    assert.notEqual(peacockActivities[5], sameDayPeacock);
  }
  const planetPeacock = planetDaySlots.find((slot) => slot.bird === "மயில்")?.activity;
  if (planetPeacock !== nextPeacock) {
    assert.notEqual(peacockActivities[5], planetPeacock);
  }
  assert.ok(nextMorning.length > 0);
});

test("pirai change: night Antharam / Naal next-morning rows use the next pirai’s day table", () => {
  const pournami = getThithiPatchiEntryForThithiNumber("valarpirai", 15);
  const nextPirai = nextMorningThithiForAnthara(pournami, pournami);
  const start = localDate(2026, 2, 1, 20);
  const slot = nightSlot(start, new Date(start.getTime() + 2 * 60 * 60 * 1000));

  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) =>
      getAlternateJamamActivitySlots(pournami.pakshaId, pournami.weekday, yama, period),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlotsForThithi(nextPirai, yama, "day"),
    },
  );

  const appendedYama = matrix.columns[5]?.jamamIndex ?? 1;
  const oldPiraiMorning = getAlternateJamamActivitySlots(
    pournami.pakshaId,
    pournami.weekday,
    appendedYama,
    "day",
  );
  const newPiraiMorning = getAlternateJamamActivitySlotsForThithi(
    nextPirai,
    appendedYama,
    "day",
  );
  const peacock = matrix.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  assert.equal(nextPirai.pakshaId, "theipirai");
  assert.equal(nextPirai.athikaraWeekday, 4);
  assert.equal(nextPirai.athikaraDay.en, "Thursday");
  assert.notEqual(nextPirai.athikaraWeekday, nextPirai.weekday);
  assert.equal(
    peacock.activities[5],
    newPiraiMorning.find((entry) => entry.bird === "மயில்")?.activity,
  );
  const planetDayMorning = getAlternateJamamActivitySlots(
    nextPirai.pakshaId,
    nextPirai.weekday,
    appendedYama,
    "day",
  );
  const oldActivity = oldPiraiMorning.find((entry) => entry.bird === "மயில்")?.activity;
  const newActivity = newPiraiMorning.find((entry) => entry.bird === "மயில்")?.activity;
  const planetActivity = planetDayMorning.find((entry) => entry.bird === "மயில்")?.activity;
  if (oldActivity !== newActivity) {
    assert.notEqual(peacock.activities[5], oldActivity);
  }
  if (planetActivity !== newActivity) {
    assert.notEqual(peacock.activities[5], planetActivity);
  }
});

test("jamam night click rows 6–10 match the next day’s morning columns", () => {
  assert.equal(nextMorningScheduleWeekday(2), 3);
  assert.equal(nextMorningScheduleWeekday(3), 4);
  assert.equal(nextMorningScheduleWeekday(4), 5);
  assert.equal(nextMorningScheduleWeekday(5), 6);
  assert.equal(nextMorningScheduleWeekday(6), 6);

  const clickedWeekday = 3;
  const nextWeekday = nextMorningScheduleWeekday(clickedWeekday);
  const start = localDate(2026, 1, 4, 20);
  const slot = nightSlot(start, new Date(start.getTime() + 2 * 60 * 60 * 1000));
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) => getAlternateJamamActivitySlots("valarpirai", clickedWeekday, yama, period),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlots("valarpirai", nextWeekday, yama, "day"),
    },
  );

  assert.equal(matrix.columns.length, 10);
  for (const row of matrix.rows) {
    for (let offset = 0; offset < 5; offset += 1) {
      const yama = matrix.columns[5 + offset]?.jamamIndex ?? 1;
      const expected = getAlternateDayActivity("valarpirai", nextWeekday, yama, row.patchi);
      const sameDay = getAlternateDayActivity("valarpirai", clickedWeekday, yama, row.patchi);
      assert.equal(row.activities[5 + offset], expected);
      if (sameDay !== expected) {
        assert.notEqual(row.activities[5 + offset], sameDay);
      }
    }
  }
});

test("day Antharam still appends same-day night jamams, not next-morning day jamams", () => {
  const morning = localDate(2026, 1, 4, 8);
  const end = new Date(morning.getTime() + 2 * 60 * 60 * 1000);
  const daySlot: JamamSlot = {
    index: 1,
    label: "ஜாமம் 1",
    period: "day",
    start: morning,
    end,
    isActive: true,
  };
  const nightSlots: JamamSlot[] = [1, 2, 3, 4, 5].map((yama) => ({
    index: jamamIndexForYama(yama, "night"),
    label: `jamam ${yama + 5}`,
    period: "night" as const,
    start: localDate(2026, 1, 4, 18 + yama),
    end: localDate(2026, 1, 4, 19 + yama),
    isActive: false,
  }));

  const matrix = getPatchiAntharaMatrix(
    daySlot.start,
    daySlot.end,
    (yama, period) => getAlternateJamamActivitySlots("theipirai", 3, yama, period),
    daySlot.index,
    10,
    {
      appendNightJamamRows: true,
      allJamamSlots: [daySlot, ...nightSlots],
    },
  );

  assert.equal(matrix.columns.length, 10);
  assert.equal(matrix.columns[5]?.appendedMorning, undefined);
  assert.equal(matrix.columns[5]?.jamamIndex, 6);
});

