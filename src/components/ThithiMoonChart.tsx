import { useEffect, useMemo, useState } from "react";
import earthMoonUrl from "../assets/thithi-calendar/earth-moon-art.png";
import { useLanguage } from "../context/LanguageContext";
import { pickBilingual, type Bilingual } from "../utils/bilingual";
import {
  formatPlaceTime,
  moonSamples,
  sectorIndex,
  type MoonSample,
  type ThithiPlace,
} from "../thithiCalendar/calendar";
import { TD, thithiNameBi } from "../thithiCalendar/labels";
import { thithiIndexToSelection } from "../thithiCalendar/thithiIds";

interface ThithiMoonChartProps {
  year: number;
  month: number;
  place: ThithiPlace;
}

function point(angle: number, radius: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [368 - radius * Math.cos(radians), 320 - radius * Math.sin(radians)];
}

function trackPath(samples: MoonSample[], key: "phase" | "longitude"): string {
  const track: [number, number][] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const start = samples[index][key];
    const delta = (samples[index + 1][key] - start + 360) % 360;
    for (let step = 0; step < 12; step += 1) {
      const fraction = step / 12;
      const distance = samples[index].distance + (samples[index + 1].distance - samples[index].distance) * fraction;
      track.push(point(start + delta * fraction, distance / 3000));
    }
  }
  const last = samples[samples.length - 1];
  track.push(point(last[key], last.distance / 3000));
  return track
    .map((position, index) => `${index ? "L" : "M"}${position.map((value) => value.toFixed(2)).join(" ")}`)
    .join(" ");
}

const SECTORS = Array.from({ length: 32 }, (_, sector) => sector);

/** 32 × 11.25° thithi circle; names follow the active language. */
function SectorCircle({ label }: { label: (sector: number) => string }) {
  return (
    <g style={{ fill: "var(--chart-ink)" }} fontSize="13" fontFamily="Arial, sans-serif">
      <circle cx="368" cy="320" r="255" fill="none" style={{ stroke: "var(--chart-ink)" }} strokeWidth="2" />
      {SECTORS.map((sector) => {
        const start = sector * 11.25;
        const mid = start + 5.625;
        const [x2, y2] = point(start, 255);
        const [degreeX, degreeY] = point(start, 280);
        const [nameX, nameY] = point(mid, 183);
        const rotation = mid < 90 || mid > 270 ? mid : mid - 180;
        const name = label(sector);
        return (
          <g key={sector}>
            <line x1="368" y1="320" x2={x2} y2={y2} style={{ stroke: "var(--chart-ink)" }} strokeWidth="1" />
            <text x={degreeX} y={degreeY} textAnchor="middle" dominantBaseline="middle" fontSize="14">
              {start}°
            </text>
            {name ? (
              <text
                transform={`translate(${nameX.toFixed(3)} ${nameY.toFixed(3)}) rotate(${rotation})`}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {name}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export function ThithiMoonChart({ year, month, place }: ThithiMoonChartProps) {
  const { language } = useLanguage();
  const pick = (text: Bilingual) => pickBilingual(text, language);
  const samples = useMemo(() => moonSamples(year, month, place), [year, month, place]);
  const [basis, setBasis] = useState<"phase" | "longitude">("phase");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const sectorLabel = (sector: number) => {
    const thithiIndex = sectorIndex(sector);
    return thithiIndex === null ? "" : pick(thithiNameBi(thithiIndexToSelection(thithiIndex)));
  };

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [year, month, basis, place]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= samples.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [playing, samples.length]);

  if (samples.length === 0) {
    return <p className="thithi-calendar__hint">{pick(TD.chartEmpty)}</p>;
  }

  const sample = samples[Math.min(index, samples.length - 1)];
  const angle = sample[basis];
  const moon = point(angle, sample.distance / 3000);
  const trail = trackPath(samples, basis);
  let travelled = 0;
  for (let cursor = 1; cursor <= Math.min(index, samples.length - 1); cursor += 1) {
    travelled += (samples[cursor][basis] - samples[cursor - 1][basis] + 360) % 360;
  }

  return (
    <section className="thithi-calendar__chart">
      <div className="thithi-calendar__chart-controls">
        <label>
          {pick(TD.chartBasis)}
          <select value={basis} onChange={(event) => setBasis(event.target.value as "phase" | "longitude")}>
            <option value="phase">{pick(TD.chartBasisPhase)}</option>
            <option value="longitude">{pick(TD.chartBasisLongitude)}</option>
          </select>
        </label>
        <label>
          {pick(TD.date)}
          <input
            type="range"
            min={0}
            max={samples.length - 1}
            step={1}
            value={Math.min(index, samples.length - 1)}
            onChange={(event) => {
              setPlaying(false);
              setIndex(Number(event.target.value));
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPlaying(false);
              return;
            }
            if (index >= samples.length - 1) setIndex(0);
            setPlaying(true);
          }}
        >
          {pick(playing ? TD.chartPause : TD.chartPlay)}
        </button>
      </div>
      <div className="thithi-calendar__drawing">
        <svg viewBox="0 -45 736 730" role="img" aria-label={pick(TD.chartAria)}>
          <defs>
            <marker
              id="thithiMoonArrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: "var(--chart-accent)" }} />
            </marker>
          </defs>
          {basis === "phase" ? (
            <g role="img" aria-label={pick(TD.sectorChartAria)}>
              <SectorCircle label={sectorLabel} />
            </g>
          ) : (
            <>
              <circle cx="368" cy="320" r="255" fill="none" style={{ stroke: "var(--chart-ring)" }} />
              {[0, 90, 180, 270].map((tick) => {
                const label = point(tick, 280);
                return (
                  <text key={tick} x={label[0]} y={label[1]} textAnchor="middle" style={{ fill: "var(--chart-ink)" }}>
                    {tick}°
                  </text>
                );
              })}
            </>
          )}
          {[100000, 200000, 300000, 400000].map((km) => (
            <g key={km}>
              <circle
                cx="368"
                cy="320"
                r={km / 3000}
                fill="none"
                style={{ stroke: "var(--chart-guide)" }}
                strokeWidth="0.7"
                strokeDasharray="3 4"
              />
              <text x="373" y={320 - km / 3000 + 10} style={{ fill: "var(--chart-muted)" }} fontSize="10">
                {km / 1000},000 km
              </text>
            </g>
          ))}
          <path d={trail} fill="none" style={{ stroke: "var(--chart-trail)" }} strokeWidth="2" markerEnd="url(#thithiMoonArrow)" />
          {samples.map((item, itemIndex) => {
            const position = point(item[basis], item.distance / 3000);
            const label = point(item[basis], item.distance / 3000 + 15);
            const selected = itemIndex === Math.min(index, samples.length - 1);
            return (
              <g key={item.date}>
                <circle cx={position[0]} cy={position[1]} r={selected ? 6 : 3} style={{ fill: selected ? "var(--chart-accent)" : "var(--chart-trail)" }} />
                {itemIndex % 3 === 0 || itemIndex === samples.length - 1 ? (
                  <text x={label[0]} y={label[1]} textAnchor="middle" dominantBaseline="middle" style={{ fill: "var(--chart-ink)" }} fontSize="12">
                    {Number(item.date.slice(8))}
                  </text>
                ) : null}
              </g>
            );
          })}
          <line x1="368" y1="320" x2="218" y2="320" style={{ stroke: "var(--chart-muted)" }} strokeDasharray="4 4" />
          <line x1="368" y1="320" x2={moon[0]} y2={moon[1]} style={{ stroke: "var(--chart-accent)" }} strokeWidth="2.5" markerEnd="url(#thithiMoonArrow)" />
          <circle cx={moon[0]} cy={moon[1]} r="10" style={{ fill: "var(--chart-accent)" }} />
          <svg x={moon[0] - 11} y={moon[1] - 11} width="22" height="22" viewBox="887 0 887 887" overflow="hidden">
            <image href={earthMoonUrl} width="1774" height="887" />
          </svg>
          <svg x="352" y="304" width="32" height="32" viewBox="0 0 887 887" overflow="hidden">
            <image href={earthMoonUrl} width="1774" height="887" />
          </svg>
          <text x="368" y="348" textAnchor="middle" style={{ fill: "var(--chart-ink)" }} fontSize="12">
            {pick(TD.chartEarth)}
          </text>
          <line x1="218" y1="625" x2="251.333" y2="625" style={{ stroke: "var(--chart-accent)" }} strokeWidth="3" />
          <line x1="218" y1="620" x2="218" y2="630" style={{ stroke: "var(--chart-accent)" }} />
          <line x1="251.333" y1="620" x2="251.333" y2="630" style={{ stroke: "var(--chart-accent)" }} />
          <text x="262" y="629" style={{ fill: "var(--chart-ink)" }} fontSize="12">
            {pick(TD.chartScale)}
          </text>
        </svg>
      </div>
      <div className="thithi-calendar__anchors">
        <button
          type="button"
          className="thithi-calendar__anchors-toggle"
          aria-expanded={showDetails}
          aria-controls="thithi-chart-details"
          onClick={() => setShowDetails((open) => !open)}
        >
          {showDetails ? "▾" : "▸"} {pick(TD.chartDetails)} · {sample.date}
        </button>
        {showDetails ? (
          <p id="thithi-chart-details" className="thithi-calendar__chart-status" aria-live="polite">
            {sample.date} · {pick(TD.chartSunset)}: {formatPlaceTime(sample.time.toISOString(), place, language)} ·{" "}
            {pick(basis === "phase" ? TD.chartPhase : TD.chartLongitude)}: {angle.toFixed(2)}° · {pick(TD.chartDistance)}:{" "}
            {Math.round(sample.distance).toLocaleString("en-IN")} km · {pick(TD.chartTravelled)}: {travelled.toFixed(2)}°
          </p>
        ) : null}
      </div>
      <div className="thithi-calendar__anchors">
        <button
          type="button"
          className="thithi-calendar__anchors-toggle"
          aria-expanded={showAbout}
          aria-controls="thithi-chart-about"
          onClick={() => setShowAbout((open) => !open)}
        >
          {showAbout ? "▾" : "▸"} {pick(TD.chartAbout)}
        </button>
        {showAbout ? (
          <p id="thithi-chart-about" className="thithi-calendar__hint">
            {pick(TD.chartHint)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
