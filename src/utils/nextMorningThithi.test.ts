import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getAlternateJamamActivitySlots,
  getAlternateJamamActivitySlotsForThithi,
  getAntharaClickActivitySlots,
} from "./alternateCalculation";
import { getPatchiAntharaMatrix, yamasRotatedFrom } from "./anthara";
import type { JamamSlot } from "./jamam";
import { jamamIndexForYama } from "./jamam";
import {
  getNextMorningDateAfterNight,
  getNextThithiPatchiEntry,
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

test("thithi continuing through sunrise still steps to the next thithi for rows 6–10", () => {
  const night = localDate(2026, 1, 4, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.selectedJamamType, "night");
  assert.equal(context.originalThithi.thithiNumber, 2);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningDate.getDate(), 5);
  assert.equal(thithiEntryAt(context.nextMorningDate).thithiNumber, 2);
  assert.equal(context.nextMorningThithi.thithiNumber, 3);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.notEqual(
    context.nextMorningThithi.thithiNumber,
    context.originalThithi.thithiNumber,
  );
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );
});

test("ordinary overnight step uses the next Thithi Patchi row, not the night thithi", () => {
  const night = localDate(2026, 1, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getDate(), 2);
  assert.equal(context.originalThithi.pakshaId, "valarpirai");
  assert.equal(context.originalThithi.thithiNumber, 14);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 15);
  assert.notEqual(
    context.nextMorningThithi.thithiNumber,
    context.originalThithi.thithiNumber,
  );
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );
});

test("Amavasai night is already the next pirai; rows 6–10 step one thithi past it", () => {
  const night = localDate(2026, 1, 18, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const sunsetThithi = thithiEntryAt(localDate(2026, 1, 18, 18));
  const amavasaiBoundary = getNextThithiPatchiEntry("theipirai", 15);
  assert.equal(sunsetThithi.pakshaId, "theipirai");
  assert.equal(sunsetThithi.thithiNumber, 15);
  assert.equal(amavasaiBoundary.pakshaId, "valarpirai");
  assert.equal(amavasaiBoundary.thithiNumber, 1);
  assert.equal(context.originalThithi.pakshaId, "valarpirai");
  assert.equal(context.originalThithi.thithiNumber, 1);
  assert.equal(context.nextMorningDate.getDate(), 19);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 2);
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );
});

test("Pournami night is already the next pirai; rows 6–10 step one thithi past it", () => {
  const night = localDate(2026, 2, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const sunsetThithi = thithiEntryAt(localDate(2026, 2, 1, 18));
  const pournamiBoundary = getNextThithiPatchiEntry("valarpirai", 15);
  assert.equal(sunsetThithi.pakshaId, "valarpirai");
  assert.equal(sunsetThithi.thithiNumber, 15);
  assert.equal(pournamiBoundary.pakshaId, "theipirai");
  assert.equal(pournamiBoundary.thithiNumber, 1);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.originalThithi.thithiNumber, 1);
  assert.equal(context.nextMorningDate.getMonth(), 1);
  assert.equal(context.nextMorningDate.getDate(), 2);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 2);
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );
});

test("month boundary: 31 Jan night resolves 1 Feb morning", () => {
  const night = localDate(2026, 1, 31, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getFullYear(), 2026);
  assert.equal(context.nextMorningDate.getMonth(), 1);
  assert.equal(context.nextMorningDate.getDate(), 1);
  assert.equal(context.originalThithi.thithiNumber, 14);
  assert.equal(context.originalThithi.pakshaId, "valarpirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 15);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.notEqual(
    context.nextMorningThithi.thithiNumber,
    context.originalThithi.thithiNumber,
  );
});

test("year boundary: 31 Dec night resolves 1 Jan morning", () => {
  const night = localDate(2026, 12, 31, 20);
  const context = resolveNextMorningThithiContext(night, null);
  assert.equal(context.nextMorningDate.getFullYear(), 2027);
  assert.equal(context.nextMorningDate.getMonth(), 0);
  assert.equal(context.nextMorningDate.getDate(), 1);
  assert.equal(context.originalThithi.thithiNumber, 9);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 10);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );
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

test("night jamam click keeps rows 1–5 on the selected night and rows 6–10 on the next thithi morning", () => {
  const night = localDate(2026, 1, 1, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const clickedWeekday = context.originalThithi.athikaraWeekday;
  assert.notEqual(context.nextMorningThithi.athikaraWeekday, clickedWeekday);
  assert.notEqual(
    context.nextMorningThithi.thithiNumber,
    context.originalThithi.thithiNumber,
  );

  const fromClick = getAntharaClickActivitySlots(
    { period: "night", pakshaId: "valarpirai", weekday: clickedWeekday },
    1,
    "night",
  );
  const selectedNight = getAlternateJamamActivitySlots("valarpirai", clickedWeekday, 1, "night");
  const nextMorningNight = getAlternateJamamActivitySlotsForThithi(
    context.nextMorningThithi,
    1,
    "night",
  );
  assert.deepEqual(fromClick, selectedNight);
  assert.notDeepEqual(fromClick, nextMorningNight);

  const slot = nightSlot(night, new Date(night.getTime() + 2 * 60 * 60 * 1000));
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) =>
      getAntharaClickActivitySlots(
        { period: "night", pakshaId: "valarpirai", weekday: clickedWeekday },
        yama,
        period,
      ),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlotsForThithi(context.nextMorningThithi, yama, "day"),
      nextMorningThithiContext: context,
    },
  );

  const peacock = matrix.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  assert.equal(matrix.columns[0]?.jamamIndex, undefined);
  assert.equal(
    peacock.activities[0],
    selectedNight.find((entry) => entry.bird === "மயில்")?.activity,
  );
  assert.notEqual(
    peacock.activities[0],
    nextMorningNight.find((entry) => entry.bird === "மயில்")?.activity,
  );
  const appendedYama = matrix.columns[5]?.jamamIndex ?? 1;
  const nextMorningDay = getAlternateJamamActivitySlotsForThithi(
    context.nextMorningThithi,
    appendedYama,
    "day",
  );
  const sameNightMorning = getAlternateJamamActivitySlots(
    "valarpirai",
    clickedWeekday,
    appendedYama,
    "day",
  );
  assert.equal(
    peacock.activities[5],
    nextMorningDay.find((entry) => entry.bird === "மயில்")?.activity,
  );
  assert.notEqual(
    peacock.activities[5],
    sameNightMorning.find((entry) => entry.bird === "மயில்")?.activity,
  );
});

test("Pournami night click keeps rows 1–5 on Pournami and rows 6–10 on the next pirai morning", () => {
  const pournami = getThithiPatchiEntryForThithiNumber("valarpirai", 15);
  const nextPirai = nextMorningThithiForAnthara(pournami, pournami);
  const clickedWeekday = pournami.athikaraWeekday;
  const fromClick = getAntharaClickActivitySlots(
    { period: "night", pakshaId: "valarpirai", weekday: clickedWeekday },
    1,
    "night",
  );
  const pournamiNight = getAlternateJamamActivitySlots("valarpirai", clickedWeekday, 1, "night");
  const nextPiraiNight = getAlternateJamamActivitySlots(
    "theipirai",
    nextPirai.athikaraWeekday,
    1,
    "night",
  );
  assert.equal(nextPirai.pakshaId, "theipirai");
  assert.equal(nextPirai.thithiNumber, 1);
  assert.equal(nextPirai.athikaraWeekday, 4);
  assert.deepEqual(fromClick, pournamiNight);
  assert.notDeepEqual(fromClick, nextPiraiNight);

  const start = localDate(2026, 2, 1, 20);
  const slot = nightSlot(start, new Date(start.getTime() + 2 * 60 * 60 * 1000));
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) =>
      getAntharaClickActivitySlots(
        { period: "night", pakshaId: "valarpirai", weekday: clickedWeekday },
        yama,
        period,
      ),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlotsForThithi(nextPirai, yama, "day"),
    },
  );
  const peacock = matrix.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  const appendedYama = matrix.columns[5]?.jamamIndex ?? 1;
  const nextMorning = getAlternateJamamActivitySlots(
    "theipirai",
    nextPirai.athikaraWeekday,
    appendedYama,
    "day",
  );
  const sameBracketMorning = getAlternateJamamActivitySlots(
    "valarpirai",
    clickedWeekday,
    appendedYama,
    "day",
  );
  assert.equal(
    peacock.activities[0],
    pournamiNight.find((entry) => entry.bird === "மயில்")?.activity,
  );
  assert.equal(
    peacock.activities[5],
    nextMorning.find((entry) => entry.bird === "மயில்")?.activity,
  );
  if (
    sameBracketMorning.find((entry) => entry.bird === "மயில்")?.activity !==
    nextMorning.find((entry) => entry.bird === "மயில்")?.activity
  ) {
    assert.notEqual(
      peacock.activities[5],
      sameBracketMorning.find((entry) => entry.bird === "மயில்")?.activity,
    );
  }
});

test("each night jamam rotates rows 1–5 on that night and rows 6–10 on the next thithi morning", () => {
  const night = localDate(2026, 1, 4, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const weekday = context.originalThithi.athikaraWeekday;
  const pakshaId = context.originalThithi.pakshaId;
  assert.equal(pakshaId, "theipirai");

  for (const yama of [1, 2, 3, 4, 5]) {
    const start = localDate(2026, 1, 4, 18 + yama);
    const slot = {
      index: jamamIndexForYama(yama, "night"),
      label: `jamam ${yama + 5}`,
      period: "night" as const,
      start,
      end: new Date(start.getTime() + 2 * 60 * 60 * 1000),
      isActive: yama === 1,
    };
    const matrix = getPatchiAntharaMatrix(
      slot.start,
      slot.end,
      (columnYama, period) =>
        getAntharaClickActivitySlots(
          { period: "night", pakshaId, weekday },
          columnYama,
          period,
        ),
      slot.index,
      10,
      {
        appendNextDayMorningJamamRows: true,
        getMorningJamamActivitySlots: (morningYama) =>
          getAlternateJamamActivitySlotsForThithi(
            context.nextMorningThithi,
            morningYama,
            "day",
          ),
      },
    );
    const rotated = yamasRotatedFrom(yama);
    assert.deepEqual(
      matrix.columns.slice(5).map((column) => column.jamamIndex),
      rotated,
    );
    const peacock = matrix.rows.find((row) => row.patchi === "மயில்");
    assert.ok(peacock);
    const nightActivity = getAlternateJamamActivitySlots(pakshaId, weekday, yama, "night").find(
      (entry) => entry.bird === "மயில்",
    )?.activity;
    const morningActivity = getAlternateJamamActivitySlotsForThithi(
      context.nextMorningThithi,
      rotated[0] ?? 1,
      "day",
    ).find((entry) => entry.bird === "மயில்")?.activity;
    assert.equal(peacock.activities[0], nightActivity);
    assert.equal(peacock.activities[5], morningActivity);
  }
});

test("day jamam click keeps the clicked weekday even when a next-morning thithi is available", () => {
  const night = localDate(2026, 1, 4, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const clickedWeekday = 3;
  const fromClick = getAntharaClickActivitySlots(
    { period: "day", pakshaId: "theipirai", weekday: clickedWeekday },
    1,
    "day",
  );
  assert.deepEqual(
    fromClick,
    getAlternateJamamActivitySlots("theipirai", clickedWeekday, 1, "day"),
  );
  assert.notDeepEqual(
    fromClick,
    getAlternateJamamActivitySlotsForThithi(context.nextMorningThithi, 1, "day"),
  );
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

