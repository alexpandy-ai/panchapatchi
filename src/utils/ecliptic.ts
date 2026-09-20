/**
 * Geocentric ecliptic longitudes of the Sun and Moon (Jean Meeus,
 * Astronomical Algorithms, 2nd ed., ch. 25 and 47).
 *
 * Used for Tithi: (Moon − Sun + 360) % 360, with 1 Tithi = 12°.
 */

function normalizeDeg(value: number): number {
  const result = value % 360;
  return result < 0 ? result + 360 : result;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Julian Date from a JavaScript Date (UTC). */
export function julianDateUTC(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/**
 * ΔT = TT − UTC in seconds (Espenak / Meeus polynomial, 2005–2050;
 * still a few-second estimate outside that window).
 */
export function deltaTSeconds(date: Date): number {
  const year =
    date.getUTCFullYear() + (date.getUTCMonth() + date.getUTCDate() / 30) / 12;
  const t = year - 2000;
  return 62.92 + 0.32217 * t + 0.005589 * t * t;
}

/** Julian Ephemeris Day (TT). */
export function julianEphemerisDay(date: Date): number {
  return julianDateUTC(date) + deltaTSeconds(date) / 86_400;
}

export function julianCenturies(jde: number): number {
  return (jde - 2_451_545.0) / 36_525;
}

/** Sun geometric ecliptic longitude in degrees [0, 360). */
export function sunEclipticLongitudeFromT(T: number): number {
  const L0 = normalizeDeg(280.46646 + 36_000.76983 * T + 0.0003032 * T * T);
  const M = normalizeDeg(357.52911 + 35_999.05029 * T - 0.0001537 * T * T);
  const Mr = toRadians(M);
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  return normalizeDeg(L0 + C);
}

/**
 * Moon longitude periodic terms: [Σl × 10⁻⁶ °, D, M, M′, F]
 * Meeus Table 47.A (longitude column).
 */
const MOON_LONGITUDE_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [6_288_774, 0, 0, 1, 0],
  [1_274_027, 2, 0, -1, 0],
  [658_314, 2, 0, 0, 0],
  [213_618, 0, 0, 2, 0],
  [-185_116, 0, 1, 0, 0],
  [-114_332, 0, 0, 0, 2],
  [58_793, 2, 0, -2, 0],
  [57_066, 2, -1, -1, 0],
  [53_322, 2, 0, 1, 0],
  [45_758, 2, -1, 0, 0],
  [-40_923, 0, 1, -1, 0],
  [-34_720, 1, 0, 0, 0],
  [-30_383, 0, 1, 1, 0],
  [15_327, 2, 0, 0, -2],
  [-12_528, 0, 0, 1, 2],
  [10_980, 0, 0, 1, -2],
  [10_675, 4, 0, -1, 0],
  [10_034, 0, 0, 3, 0],
  [8_548, 4, 0, -2, 0],
  [-7_888, 2, 1, -1, 0],
  [-6_766, 2, 1, 0, 0],
  [-5_163, 1, 0, -1, 0],
  [4_987, 1, 1, 0, 0],
  [4_036, 2, -1, 1, 0],
  [3_994, 2, 0, 2, 0],
  [3_861, 4, 0, 0, 0],
  [3_665, 2, 0, -3, 0],
  [-2_689, 0, 1, -2, 0],
  [-2_602, 2, 0, -1, 2],
  [2_390, 2, -1, -2, 0],
  [-2_348, 1, 0, 1, 0],
  [2_236, 2, -2, 0, 0],
  [-2_120, 0, 1, 2, 0],
  [-2_069, 0, 2, 0, 0],
  [2_048, 2, -2, -1, 0],
  [-1_773, 2, 0, 1, -2],
  [-1_595, 2, 0, 0, 2],
  [1_215, 4, -1, -1, 0],
  [-1_110, 0, 0, 2, 2],
  [-892, 3, 0, -1, 0],
  [-810, 2, 1, 1, 0],
  [759, 4, -1, -2, 0],
  [-713, 0, 2, -1, 0],
  [-700, 2, 2, -1, 0],
  [691, 2, 1, -2, 0],
  [596, 2, -1, 0, -2],
  [549, 4, 0, 1, 0],
  [537, 0, 0, 4, 0],
  [520, 4, -1, 0, 0],
  [-487, 1, 0, -2, 0],
  [-399, 2, 1, 0, -2],
  [-381, 0, 0, 2, -2],
  [351, 1, 1, 1, 0],
  [-340, 3, 0, -2, 0],
  [330, 4, 0, -3, 0],
  [327, 2, -1, 2, 0],
  [-323, 0, 2, 1, 0],
  [299, 1, 1, -1, 0],
  [294, 2, 0, 3, 0],
];

/** Moon geometric ecliptic longitude in degrees [0, 360). */
export function moonEclipticLongitudeFromT(T: number): number {
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  const Lp = normalizeDeg(
    218.3164477 + 481_267.88123421 * T - 0.0015786 * T2 + T3 / 538_841 - T4 / 65_194_000,
  );
  const D = normalizeDeg(
    297.8501921 + 445_267.1114034 * T - 0.0018819 * T2 + T3 / 545_868 - T4 / 113_065_000,
  );
  const M = normalizeDeg(
    357.5291092 + 35_999.0502909 * T - 0.0001536 * T2 + T3 / 24_490_000,
  );
  const Mp = normalizeDeg(
    134.9633964 + 477_198.8675055 * T + 0.0087414 * T2 + T3 / 69_699 - T4 / 14_712_000,
  );
  const F = normalizeDeg(
    93.272095 + 483_202.0175233 * T - 0.0036539 * T2 - T3 / 3_526_000 + T4 / 863_310_000,
  );

  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  let sigmaL = 0;
  for (const [coeff, d, m, mp, f] of MOON_LONGITUDE_TERMS) {
    const arg = toRadians(d * D + m * M + mp * Mp + f * F);
    let term = coeff;
    const absM = Math.abs(m);
    if (absM === 1) term *= E;
    else if (absM === 2) term *= E2;
    sigmaL += term * Math.sin(arg);
  }

  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479_264.29 * T;
  sigmaL += 3958 * Math.sin(toRadians(A1));
  sigmaL += 1962 * Math.sin(toRadians(Lp - F));
  sigmaL += 318 * Math.sin(toRadians(A2));

  return normalizeDeg(Lp + sigmaL / 1_000_000);
}

export function sunEclipticLongitude(date: Date): number {
  return sunEclipticLongitudeFromT(julianCenturies(julianEphemerisDay(date)));
}

export function moonEclipticLongitude(date: Date): number {
  return moonEclipticLongitudeFromT(julianCenturies(julianEphemerisDay(date)));
}

/**
 * Tithi angle: geocentric Moon − Sun elongation in degrees [0, 360).
 * 0° / 360° = Amavasai, 180° = Pournami. Each Tithi spans 12°.
 */
export function tithiAngle(date: Date): number {
  return normalizeDeg(moonEclipticLongitude(date) - sunEclipticLongitude(date));
}

/** Tithi number 1–30 from elongation. 1 = Shukla Pratipada, 30 = Krishna Amavasai. */
export function tithiNumberFromAngle(angle: number): number {
  const n = Math.floor(normalizeDeg(angle) / 12) + 1;
  return n > 30 ? 30 : n;
}

export function tithiNumberAt(date: Date): number {
  return tithiNumberFromAngle(tithiAngle(date));
}
