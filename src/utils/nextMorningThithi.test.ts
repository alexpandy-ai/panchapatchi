import assert from "node:assert/strict";
import { test } from "node:test";

import { displayActivity } from "./activityLabel";
import {
  ALTERNATE_NIGHT_ACTIVITY_TA,
  getAlternateJamamActivitySlots,
  getAlternateJamamActivitySlotsForThithi,
  getAntharaClickActivitySlots,
} from "./alternateCalculation";
import {
  antharaActivitiesFrom,
  buildJamamAntharaClick,
  getPatchiAntharaMatrix,
  resolveNaalAppendForAntharaClick,
  yamasRotatedFrom,
  type JamamAntharaClickInput,
  type JamamAntharaClickModel,
} from "./anthara";
import {
  buildDaySchedulerJamamColumns,
  daySchedulerJamamSlots,
} from "./daySchedulerJamam";
import type { JamamSlot } from "./jamam";
import { getJamamState, jamamIndexForYama, yamaFromJamamIndex } from "./jamam";
import {
  getNextMorningDateAfterNight,
  getNextThithiPatchiEntry,
  getNightThithiPatchiEntryForDate,
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

function birdActivity(
  entry: { pakshaId: "valarpirai" | "theipirai"; athikaraWeekday: number },
  yama: number,
  period: "day" | "night",
  bird: string,
): string {
  const slots = getAlternateJamamActivitySlotsForThithi(entry, yama, period);
  return displayActivity(slots.find((slot) => slot.bird === bird)?.activity ?? "—");
}

test("Home Naal from day Anthara 6–10 steps to the next thithi morning; rows 1–5 stay same-day night", () => {
  const afternoon = localDate(2026, 9, 21, 14);
  const context = resolveNextMorningThithiContext(afternoon, null);
  const weekday = context.originalThithi.athikaraWeekday;
  const pakshaId = context.originalThithi.pakshaId;
  assert.notEqual(context.nextMorningThithi.thithiNumber, context.originalThithi.thithiNumber);
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );

  const dayJamamIndex = 4;
  const start = afternoon;
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const daySlot: JamamSlot = {
    index: dayJamamIndex,
    label: "ஜாமம் 4",
    period: "day",
    start,
    end,
    isActive: true,
  };
  const nightSlots: JamamSlot[] = [1, 2, 3, 4, 5].map((yama) => ({
    index: jamamIndexForYama(yama, "night"),
    label: `jamam ${yama + 5}`,
    period: "night" as const,
    start: localDate(2026, 9, 21, 18 + yama),
    end: localDate(2026, 9, 21, 19 + yama),
    isActive: false,
  }));
  const matrix = getPatchiAntharaMatrix(
    daySlot.start,
    daySlot.end,
    (yama, period) =>
      getAntharaClickActivitySlots({ period: "day", pakshaId, weekday }, yama, period),
    daySlot.index,
    10,
    { appendNightJamamRows: true, allJamamSlots: [daySlot, ...nightSlots] },
  );

  assert.equal(matrix.columns[5]?.appendedMorning, undefined);
  assert.equal(matrix.columns[5]?.jamamIndex, 9);

  const vulture = "வல்லூறு";
  for (let segmentIndex = 0; segmentIndex < 5; segmentIndex += 1) {
    const column = matrix.columns[segmentIndex];
    assert.ok(column);
    const naal = resolveNaalAppendForAntharaClick({
      parentJamamIndex: dayJamamIndex,
      column,
      canAppendNextMorning: true,
      canAppendNextDayNight: true,
      canAppendSameDayNight: true,
    });
    assert.equal(naal.appendNextDayMorning, false, `anthara ${segmentIndex + 1} must not advance`);
    assert.equal(naal.appendNightJamam, true);
    assert.ok(naal.appendedJamamSerials?.every((serial) => serial >= 6 && serial <= 10));
    const sameDayNight = naal.nightYamaOrder.map((yama) =>
      birdActivity(context.originalThithi, yama, "night", vulture),
    );
    const nextMorningDay = naal.morningYamaOrder.map((yama) =>
      birdActivity(context.nextMorningThithi, yama, "day", vulture),
    );
    assert.notDeepEqual(sameDayNight, nextMorningDay);
  }

  for (let segmentIndex = 5; segmentIndex < 10; segmentIndex += 1) {
    const column = matrix.columns[segmentIndex];
    assert.ok(column);
    assert.notEqual(column.appendedMorning, true);
    const naal = resolveNaalAppendForAntharaClick({
      parentJamamIndex: dayJamamIndex,
      column,
      canAppendNextMorning: true,
      canAppendNextDayNight: true,
      canAppendSameDayNight: true,
    });
    assert.equal(naal.period, "night");
    assert.equal(naal.appendNextDayMorning, true);
    assert.equal(naal.appendNextDayNight, false);
    assert.equal(naal.appendNightJamam, false);
    assert.ok(naal.appendedJamamSerials?.every((serial) => serial >= 1 && serial <= 5));
    assert.notDeepEqual(naal.appendedJamamSerials, [6, 7, 8, 9, 10]);

    const clicked = matrix.rows.find((row) => row.patchi === vulture)?.activities[segmentIndex];
    assert.ok(clicked);
    const nightCycle = antharaActivitiesFrom(clicked, 10, ALTERNATE_NIGHT_ACTIVITY_TA);
    const naalRows = [
      ...nightCycle.slice(0, 5),
      ...naal.morningYamaOrder.map((yama) =>
        birdActivity(context.nextMorningThithi, yama, "day", vulture),
      ),
    ];
    assert.deepEqual(naal.antharaJamamSerials.length, 5);
    assert.deepEqual(naalRows.slice(0, 5), nightCycle.slice(0, 5));
    assert.notDeepEqual(naalRows.slice(5), nightCycle.slice(5));
    const sameNightMorning = naal.morningYamaOrder.map((yama) =>
      birdActivity(context.originalThithi, yama, "day", vulture),
    );
    assert.notDeepEqual(naalRows.slice(5), sameNightMorning);
  }

  const antharaSix = resolveNaalAppendForAntharaClick({
    parentJamamIndex: dayJamamIndex,
    column: matrix.columns[5]!,
    canAppendNextMorning: true,
    canAppendNextDayNight: true,
    canAppendSameDayNight: true,
  });
  assert.deepEqual(antharaSix.antharaJamamSerials, [9, 10, 6, 7, 8]);
  assert.deepEqual(antharaSix.appendedJamamSerials, [4, 5, 1, 2, 3]);
});

test("day Anthara 6–10 without next-morning slots keeps the Day Scheduler night cycle", () => {
  const column = { segmentIndex: 5, jamamIndex: 9 };
  const naal = resolveNaalAppendForAntharaClick({
    parentJamamIndex: 4,
    column,
    canAppendNextMorning: false,
    canAppendNextDayNight: false,
    canAppendSameDayNight: true,
  });
  assert.equal(naal.appendNextDayMorning, false);
  assert.equal(naal.appendNightJamam, false);
  assert.equal(naal.appendNextDayNight, false);
  assert.equal(naal.period, "night");
  assert.deepEqual(naal.antharaJamamSerials, [9, 10, 6, 7, 8]);
  assert.equal(naal.appendedJamamSerials, undefined);
});

test("night Anthara rows 6–10 do not advance a second thithi for Naal", () => {
  const night = localDate(2026, 9, 21, 20);
  const context = resolveNextMorningThithiContext(night, null);
  const further = getNextThithiPatchiEntry(
    context.nextMorningThithi.pakshaId,
    context.nextMorningThithi.thithiNumber,
  );
  const slot = nightSlot(night, new Date(night.getTime() + 2 * 60 * 60 * 1000));
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    (yama, period) =>
      getAntharaClickActivitySlots(
        {
          period: "night",
          pakshaId: context.originalThithi.pakshaId,
          weekday: context.originalThithi.athikaraWeekday,
        },
        yama,
        period,
      ),
    slot.index,
    10,
    {
      appendNextDayMorningJamamRows: true,
      getMorningJamamActivitySlots: (yama) =>
        getAlternateJamamActivitySlotsForThithi(context.nextMorningThithi, yama, "day"),
    },
  );

  const early = resolveNaalAppendForAntharaClick({
    parentJamamIndex: slot.index,
    column: matrix.columns[0]!,
    canAppendNextMorning: true,
    canAppendNextDayNight: true,
    canAppendSameDayNight: false,
  });
  assert.equal(early.appendNextDayMorning, true);
  assert.equal(early.appendNextDayNight, false);
  assert.equal(early.period, "night");

  const morningRow = resolveNaalAppendForAntharaClick({
    parentJamamIndex: slot.index,
    column: matrix.columns[5]!,
    canAppendNextMorning: true,
    canAppendNextDayNight: true,
    canAppendSameDayNight: false,
  });
  assert.equal(matrix.columns[5]?.appendedMorning, true);
  assert.equal(morningRow.appendNextDayMorning, false);
  assert.equal(morningRow.appendNextDayNight, true);
  assert.equal(morningRow.period, "day");
  const yama = morningRow.nightYamaOrder[0] ?? 1;
  const sameMorningNight = birdActivity(context.nextMorningThithi, yama, "night", "மயில்");
  const steppedAgain = birdActivity(further, yama, "day", "மயில்");
  assert.notEqual(sameMorningNight, steppedAgain);
});

/**
 * Mirrors PatchiStatusView homeAntharaClick:
 * night thithi → pakshaId + athikaraWeekday; getJamamState → slots / jamamInstant.
 */
function homePageClick(
  anchor: Date,
  period: "day" | "night",
  yama: number,
): { input: JamamAntharaClickInput; slot: JamamSlot; model: JamamAntharaClickModel } {
  const jamamIndex = jamamIndexForYama(yama, period);
  const nightThithi = getNightThithiPatchiEntryForDate(anchor, null);
  assert.ok(
    nightThithi.pakshaId === "valarpirai" || nightThithi.pakshaId === "theipirai",
  );
  const jamam = getJamamState(anchor, null);
  const slot = jamam.slots.find((entry) => entry.index === jamamIndex);
  assert.ok(slot, `Home missing jamam ${jamamIndex}`);
  const { period: slotPeriod } = yamaFromJamamIndex(slot.index);
  const input: JamamAntharaClickInput = {
    period: slotPeriod,
    pakshaId: nightThithi.pakshaId,
    weekday: nightThithi.athikaraWeekday,
    jamamInstant: slot.start,
    coords: null,
    allJamamSlots: jamam.slots,
  };
  return { input, slot, model: buildJamamAntharaClick(input) };
}

/**
 * Mirrors DaySchedulerTable antharaClick for the same BracketDay as Home:
 * daySchedulerJamamSlots + sheet paksha + clicked weekday row.
 */
function daySchedulePageClick(
  anchor: Date,
  period: "day" | "night",
  yama: number,
): { input: JamamAntharaClickInput; slot: JamamSlot; model: JamamAntharaClickModel } {
  const jamamIndex = jamamIndexForYama(yama, period);
  const nightThithi = getNightThithiPatchiEntryForDate(anchor, null);
  assert.ok(
    nightThithi.pakshaId === "valarpirai" || nightThithi.pakshaId === "theipirai",
  );
  const columns = buildDaySchedulerJamamColumns(anchor, null);
  const allJamamSlots = daySchedulerJamamSlots(columns);
  const slot = allJamamSlots.find((entry) => entry.index === jamamIndex);
  assert.ok(slot, `Day Schedule missing jamam ${jamamIndex}`);
  const input: JamamAntharaClickInput = {
    period,
    pakshaId: nightThithi.pakshaId,
    weekday: nightThithi.athikaraWeekday,
    jamamInstant: slot.start,
    coords: null,
    allJamamSlots,
  };
  return { input, slot, model: buildJamamAntharaClick(input) };
}

function activityRows(model: JamamAntharaClickModel, slot: JamamSlot) {
  const matrix = getPatchiAntharaMatrix(
    slot.start,
    slot.end,
    model.getActivitySlots,
    slot.index,
    10,
    model.matrixOptions,
  );
  return {
    model,
    matrix,
    rows: matrix.rows.map((row) => ({
      patchi: row.patchi,
      activities: [...row.activities],
    })),
  };
}

function naalFlags(model: JamamAntharaClickModel) {
  const options = model.matrixOptions;
  return {
    canAppendNextMorning: Boolean(options?.getMorningJamamActivitySlots),
    canAppendNextDayNight: Boolean(options?.getNextDayNightJamamActivitySlots),
    canAppendSameDayNight:
      options?.appendNightJamamRows === true && Boolean(options.allJamamSlots?.length),
  };
}

function assertHomeMatchesDaySchedule(anchor: Date, period: "day" | "night", yama: number) {
  const homePath = homePageClick(anchor, period, yama);
  const dayPath = daySchedulePageClick(anchor, period, yama);
  assert.equal(homePath.input.pakshaId, dayPath.input.pakshaId);
  assert.equal(homePath.input.weekday, dayPath.input.weekday);
  assert.equal(homePath.input.period, dayPath.input.period);
  assert.equal(homePath.slot.index, dayPath.slot.index);
  assert.equal(homePath.slot.start.getTime(), dayPath.slot.start.getTime());

  const home = activityRows(homePath.model, homePath.slot);
  const daySchedule = activityRows(dayPath.model, dayPath.slot);
  assert.deepEqual(daySchedule.rows, home.rows);
  assert.equal(daySchedule.rows.length, 5);
  const clickedBird = "மயில்";
  assert.deepEqual(
    home.rows.filter((row) => row.patchi === clickedBird),
    daySchedule.rows.filter((row) => row.patchi === clickedBird),
  );
  return { input: homePath.input, slot: homePath.slot, home, daySchedule };
}

test("Home and Day Schedule slot arrays match for an ordinary night jamam", () => {
  const anchor = localDate(2026, 1, 4, 20);
  const { home } = assertHomeMatchesDaySchedule(anchor, "night", 1);
  const context = resolveNextMorningThithiContext(anchor, null);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.originalThithi.thithiNumber, 2);
  assert.equal(context.nextMorningThithi.thithiNumber, 3);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.notEqual(
    context.nextMorningThithi.athikaraWeekday,
    context.originalThithi.athikaraWeekday,
  );

  const peacock = home.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  const rotated = yamasRotatedFrom(1);
  assert.equal(
    peacock.activities[0],
    birdActivity(context.originalThithi, 1, "night", "மயில்"),
  );
  assert.equal(
    peacock.activities[5],
    birdActivity(context.nextMorningThithi, rotated[0] ?? 1, "day", "மயில்"),
  );
  assert.notEqual(
    peacock.activities[5],
    birdActivity(context.originalThithi, rotated[0] ?? 1, "day", "மயில்"),
  );

  const flags = naalFlags(home.model);
  const early = resolveNaalAppendForAntharaClick({
    parentJamamIndex: home.matrix.columns[0] ? jamamIndexForYama(1, "night") : 6,
    column: home.matrix.columns[0]!,
    ...flags,
  });
  assert.equal(early.appendNextDayMorning, true);
  assert.equal(early.appendNextDayNight, false);
  const morningRow = resolveNaalAppendForAntharaClick({
    parentJamamIndex: jamamIndexForYama(1, "night"),
    column: home.matrix.columns[5]!,
    ...flags,
  });
  assert.equal(home.matrix.columns[5]?.appendedMorning, true);
  assert.equal(morningRow.appendNextDayMorning, false);
  assert.equal(morningRow.appendNextDayNight, true);
  const further = getNextThithiPatchiEntry(
    context.nextMorningThithi.pakshaId,
    context.nextMorningThithi.thithiNumber,
  );
  const yama = morningRow.nightYamaOrder[0] ?? 1;
  assert.notEqual(
    birdActivity(context.nextMorningThithi, yama, "night", "மயில்"),
    birdActivity(further, yama, "day", "மயில்"),
  );
});

test("Home and Day Schedule slot arrays match for Pournami → Theipirai Prathamai", () => {
  const anchor = localDate(2026, 1, 2, 20);
  const { home } = assertHomeMatchesDaySchedule(anchor, "night", 2);
  const context = resolveNextMorningThithiContext(anchor, null);
  assert.equal(context.originalThithi.pakshaId, "valarpirai");
  assert.equal(context.originalThithi.thithiNumber, 15);
  assert.equal(context.nextMorningThithi.pakshaId, "theipirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 1);
  const expected = getNextThithiPatchiEntry("valarpirai", 15);
  assert.equal(context.nextMorningThithi.athikaraWeekday, expected.athikaraWeekday);

  const peacock = home.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  const appendedYama = home.matrix.columns[5]?.jamamIndex ?? 1;
  assert.equal(
    peacock.activities[5],
    birdActivity(context.nextMorningThithi, appendedYama, "day", "மயில்"),
  );
  assert.notEqual(
    peacock.activities[5],
    birdActivity(context.originalThithi, appendedYama, "day", "மயில்"),
  );
  assert.equal(peacock.activities[0], birdActivity(context.originalThithi, 2, "night", "மயில்"));
});

test("Home and Day Schedule slot arrays match for Amavasai → Valarpirai Prathamai", () => {
  const anchor = localDate(2026, 1, 17, 20);
  const { home } = assertHomeMatchesDaySchedule(anchor, "night", 3);
  const context = resolveNextMorningThithiContext(anchor, null);
  assert.equal(context.originalThithi.pakshaId, "theipirai");
  assert.equal(context.originalThithi.thithiNumber, 15);
  assert.equal(context.nextMorningThithi.pakshaId, "valarpirai");
  assert.equal(context.nextMorningThithi.thithiNumber, 1);
  const expected = getNextThithiPatchiEntry("theipirai", 15);
  assert.equal(context.nextMorningThithi.athikaraWeekday, expected.athikaraWeekday);

  const peacock = home.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  const appendedYama = home.matrix.columns[5]?.jamamIndex ?? 1;
  assert.equal(
    peacock.activities[5],
    birdActivity(context.nextMorningThithi, appendedYama, "day", "மயில்"),
  );
  assert.notEqual(
    peacock.activities[5],
    birdActivity(context.originalThithi, appendedYama, "night", "மயில்"),
  );
});

test("Home and Day Schedule day jamam rows 1–5 and 6–10 stay on the clicked day", () => {
  const anchor = localDate(2026, 1, 4, 14);
  const { home } = assertHomeMatchesDaySchedule(anchor, "day", 4);
  const context = resolveNextMorningThithiContext(anchor, null);
  assert.notEqual(
    context.nextMorningThithi.thithiNumber,
    context.originalThithi.thithiNumber,
  );

  assert.equal(home.matrix.columns[0]?.jamamIndex, undefined);
  assert.equal(home.matrix.columns[0]?.appendedMorning, undefined);
  assert.equal(home.matrix.columns[5]?.appendedMorning, undefined);
  assert.notEqual(home.matrix.columns[5]?.jamamIndex, undefined);
  assert.ok((home.matrix.columns[5]?.jamamIndex ?? 0) >= 6);

  const peacock = home.rows.find((row) => row.patchi === "மயில்");
  assert.ok(peacock);
  assert.equal(peacock.activities[0], birdActivity(context.originalThithi, 4, "day", "மயில்"));
  const nightJamam = home.matrix.columns[5]?.jamamIndex ?? 6;
  const nightYama = ((nightJamam - 1) % 5) + 1;
  assert.equal(
    peacock.activities[5],
    birdActivity(context.originalThithi, nightYama, "night", "மயில்"),
  );
  assert.notEqual(
    peacock.activities[5],
    birdActivity(context.nextMorningThithi, nightYama, "day", "மயில்"),
  );

  const flags = naalFlags(home.model);
  const early = resolveNaalAppendForAntharaClick({
    parentJamamIndex: jamamIndexForYama(4, "day"),
    column: home.matrix.columns[0]!,
    ...flags,
  });
  assert.equal(early.appendNightJamam, true);
  assert.equal(early.appendNextDayMorning, false);
  assert.equal(early.appendNextDayNight, false);

  const nightSlice = resolveNaalAppendForAntharaClick({
    parentJamamIndex: jamamIndexForYama(4, "day"),
    column: home.matrix.columns[5]!,
    ...flags,
  });
  assert.equal(nightSlice.period, "night");
  assert.equal(nightSlice.appendNextDayMorning, true);
  assert.equal(nightSlice.appendNextDayNight, false);
  assert.equal(nightSlice.appendNightJamam, false);
  const morningYama = nightSlice.morningYamaOrder[0] ?? 1;
  const morningSlots = home.model.matrixOptions?.getMorningJamamActivitySlots?.(morningYama) ?? [];
  const morningActivity = displayActivity(
    morningSlots.find((entry) => entry.bird === "மயில்")?.activity ?? "—",
  );
  assert.equal(morningActivity, birdActivity(context.nextMorningThithi, morningYama, "day", "மயில்"));
  assert.notEqual(
    morningActivity,
    birdActivity(context.originalThithi, morningYama, "day", "மயில்"),
  );
});

