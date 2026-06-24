"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calculateRevenuePlan } from "@/lib/calculations.ts";
import { calculateDerivedActuals } from "@/lib/derivedActuals.ts";
import {
  formatCurrencyShort,
  formatNumber,
  formatPercent,
} from "@/lib/formatters.ts";
import { sampleRevenuePlanInput } from "@/lib/sampleData.ts";
import type { RevenuePlanInput, RevenuePlanResult, ScenarioResult } from "@/lib/types.ts";

interface LeverState {
  newLogoBudgetIncreasePct: number;
  newLogoWinRateChangePts: number;
  newLogoAvgDealSizeChangePct: number;
  expansionBudgetIncreasePct: number;
  expansionWinRateChangePts: number;
  expansionAvgDealSizeChangePct: number;
}

type TargetMode = "annual" | "quarterly";
type InputFormat = "currency" | "percent" | "integer" | "number";

interface LeverImpact {
  newLogoBudget: number;
  newLogoWinRate: number;
  newLogoDealSize: number;
  expansionBudget: number;
  expansionWinRate: number;
  expansionDealSize: number;
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  "On Track": { bg: "#c4ff00", text: "#0a0a0a" },
  "Slightly Short": { bg: "#faf8f3", text: "#0a0a0a" },
  "At Risk": { bg: "#ff6b5b", text: "#faf8f3" },
  "Material Gap": { bg: "#ff6b5b", text: "#faf8f3" },
  "Not Feasible Under Current Assumptions": { bg: "#0a0a0a", text: "#faf8f3" },
};

const DEFAULT_LEVERS: LeverState = {
  newLogoBudgetIncreasePct: 0,
  newLogoWinRateChangePts: 0,
  newLogoAvgDealSizeChangePct: 0,
  expansionBudgetIncreasePct: 0,
  expansionWinRateChangePts: 0,
  expansionAvgDealSizeChangePct: 0,
};

function createInitialInput(): RevenuePlanInput {
  const next = structuredClone(sampleRevenuePlanInput) as RevenuePlanInput;
  const inputWithExtras = next as RevenuePlanInput & {
    lastYearActuals: RevenuePlanInput["lastYearActuals"] & {
      newLogo: RevenuePlanInput["lastYearActuals"]["newLogo"] & {
        averageDealSize?: number;
      };
      expansion: RevenuePlanInput["lastYearActuals"]["expansion"] & {
        averageDealSize?: number;
        existingCustomers?: number;
      };
    };
  };

  inputWithExtras.lastYearActuals.newLogo.averageDealSize =
    next.scenarios[0].newLogo.averageDealSize.absoluteValue;
  inputWithExtras.lastYearActuals.expansion.averageDealSize =
    next.scenarios[0].expansion.averageDealSize.absoluteValue;
  inputWithExtras.lastYearActuals.expansion.existingCustomers =
    next.scenarios[0].expansion.existingCustomers;

  return inputWithExtras;
}

function formatSignedCurrency(value: number): string {
  if (value === 0) return "$0";
  return value > 0
    ? `${formatCurrencyShort(value)} surplus`
    : `${formatCurrencyShort(Math.abs(value))} gap`;
}

function readable(value: string): string {
  return value.replaceAll("_", " ");
}

function formatInputValue(value: number, format: InputFormat): string | number {
  if (Number.isNaN(value)) return "";
  if (format === "integer") return Math.round(value);
  return value;
}

function formatInputDisplay(val: number, fmt: InputFormat): string {
  if (fmt === "currency") return val.toLocaleString("en-US");
  if (fmt === "integer" || fmt === "number") return val.toLocaleString("en-US");
  return String(val);
}

function parseInputDisplay(value: string): number {
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDisplayValue(value: number, format: InputFormat): string {
  if (format === "currency") return formatCurrencyShort(value);
  if (format === "percent") return formatPercent(value);
  if (format === "integer") return formatNumber(Math.round(value));
  return formatNumber(value);
}

function formatDeltaPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${Math.round(value)}%`;
}

function getRelativePctChange(baseValue: number, adjustedValue: number): number {
  return baseValue === 0
    ? 0
    : Math.round(((adjustedValue - baseValue) / baseValue) * 100);
}

function Section({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line bg-cream py-10">
      <div className="mb-5">
        {eyebrow ? (
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink/50">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-black tracking-tight text-ink">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="border border-line bg-white p-4 shadow-sm">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/50">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-2 text-base leading-7 text-ink/70">{detail}</p> : null}
    </div>
  );
}

function ResultGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function PlanInput({
  label,
  value,
  onChange,
  format,
  hint,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  format: InputFormat;
  hint?: string;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(
    formatInputDisplay(value, format),
  );

  useEffect(() => {
    setDisplayValue(formatInputDisplay(value, format));
  }, [format, value]);

  const shouldFormatWithCommas =
    format === "currency" || format === "integer" || format === "number";

  return (
    <label className="block">
      <span className="font-mono text-xs uppercase tracking-widest text-ink/50">{label}</span>
      <input
        className={`w-full border-0 border-b border-ink bg-transparent py-1 text-lg font-semibold text-ink outline-none tabular-nums focus:border-coral focus:ring-0 ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        }`}
        inputMode={format === "integer" ? "numeric" : "decimal"}
        type="text"
        disabled={disabled}
        value={shouldFormatWithCommas ? displayValue : formatInputValue(value, format)}
        onBlur={() => {
          if (!shouldFormatWithCommas) return;
          const parsed = parseInputDisplay(displayValue);
          onChange(parsed);
          setDisplayValue(formatInputDisplay(parsed, format));
        }}
        onChange={(event) => {
          if (shouldFormatWithCommas) {
            setDisplayValue(event.target.value);
            return;
          }

          onChange(Number(event.target.value));
        }}
        onFocus={() => {
          if (shouldFormatWithCommas) setDisplayValue(String(value));
        }}
      />
      {hint ? <span className="mt-1 block font-mono text-xs text-ink/40">{hint}</span> : null}
    </label>
  );
}

function updateNestedInput(
  input: RevenuePlanInput,
  path: string[],
  value: number,
): RevenuePlanInput {
  const next = structuredClone(input);
  if (path[0] !== "lastYearActuals") {
    next.lastYearActuals = input.lastYearActuals;
  }
  let cursor: Record<string, unknown> = next as unknown as Record<string, unknown>;
  for (let index = 0; index < path.length - 1; index += 1) {
    cursor = cursor[path[index]] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
  return next;
}

function calculateLeverImpact(
  activeScenarioResult: ScenarioResult,
  derivedActuals: RevenuePlanResult["derivedActuals"],
  levers: LeverState,
): LeverImpact {
  const newLogo = activeScenarioResult.newLogo;
  const expansion = activeScenarioResult.expansion;
  const newLogoAssumptions = activeScenarioResult.assumptionsSummary.newLogo;
  const expansionAssumptions = activeScenarioResult.assumptionsSummary.expansion;
  const newLogoClosedWonDeals =
    newLogo.averageDealSize === 0
      ? 0
      : newLogo.pipeline.combinedPipelineBookings / newLogo.averageDealSize;
  const expansionClosedWonDeals =
    expansion.averageDealSize === 0
      ? 0
      : expansion.pipeline.combinedPipelineBookings / expansion.averageDealSize;
  const adjustedNewLogoBudget = Math.max(
    0,
    newLogoAssumptions.demandBudget *
      (1 + levers.newLogoBudgetIncreasePct / 100),
  );
  const adjustedNewLogoWinRate = Math.min(
    0.8,
    Math.max(0.01, newLogo.winRate + levers.newLogoWinRateChangePts / 100),
  );
  const adjustedNewLogoDealSize = Math.max(
    1,
    newLogo.averageDealSize *
      (1 + levers.newLogoAvgDealSizeChangePct / 100),
  );
  const adjustedExpansionBudget = Math.max(
    0,
    expansionAssumptions.demandBudget *
      (1 + levers.expansionBudgetIncreasePct / 100),
  );
  const adjustedExpansionWinRate = Math.min(
    0.8,
    Math.max(0.01, expansion.winRate + levers.expansionWinRateChangePts / 100),
  );
  const adjustedExpansionDealSize = Math.max(
    1,
    expansion.averageDealSize *
      (1 + levers.expansionAvgDealSizeChangePct / 100),
  );
  return {
    newLogoBudget:
      (adjustedNewLogoBudget - newLogoAssumptions.demandBudget) *
      derivedActuals.newLogo.pipelineRoi *
      newLogo.winRate,
    newLogoWinRate:
      newLogo.pipeline.combinedPipeline *
      (adjustedNewLogoWinRate - newLogo.winRate),
    newLogoDealSize:
      newLogoClosedWonDeals *
      (adjustedNewLogoDealSize - newLogo.averageDealSize),
    expansionBudget:
      (adjustedExpansionBudget - expansionAssumptions.demandBudget) *
      derivedActuals.expansion.pipelineRoi *
      expansion.winRate,
    expansionWinRate:
      expansion.pipeline.combinedPipeline *
      (adjustedExpansionWinRate - expansion.winRate),
    expansionDealSize:
      expansionClosedWonDeals *
      (adjustedExpansionDealSize - expansion.averageDealSize),
  };
}

function getAdjustedFeasibility(pct: number): string {
  if (pct >= 100) return "On Track";
  if (pct >= 90) return "Slightly Short";
  if (pct >= 70) return "At Risk";
  if (pct >= 50) return "Material Gap";
  return "Not Feasible Under Current Assumptions";
}

function InputsSection({
  activeInput,
  result,
  targetMode,
  quarterlyTargets,
  setTargetMode,
  setQuarterlyTargets,
  updateInput,
  newLogoOnly,
  toggleNewLogoOnly,
}: {
  activeInput: RevenuePlanInput;
  result: RevenuePlanResult;
  targetMode: TargetMode;
  quarterlyTargets: [number, number, number, number];
  setTargetMode: (mode: TargetMode) => void;
  setQuarterlyTargets: (targets: [number, number, number, number]) => void;
  updateInput: (path: string[], value: number) => void;
  newLogoOnly: boolean;
  toggleNewLogoOnly: () => void;
}) {
  const newLogoActuals = activeInput.lastYearActuals.newLogo as RevenuePlanInput["lastYearActuals"]["newLogo"] & {
    averageDealSize?: number;
  };
  const expansionActuals = activeInput.lastYearActuals.expansion as RevenuePlanInput["lastYearActuals"]["expansion"] & {
    averageDealSize?: number;
    existingCustomers?: number;
  };
  const annualTarget = activeInput.planTarget.totalBookingsTarget;
  const quarterlyTotal = quarterlyTargets.reduce((sum, target) => sum + target, 0);
  const quarterlyValid = Math.abs(quarterlyTotal - annualTarget) < 1;

  function updateQuarter(index: number, value: number) {
    const next = [...quarterlyTargets] as [number, number, number, number];
    next[index] = value;
    setQuarterlyTargets(next);
  }

  return (
    <Section eyebrow="Inputs" title="Planning Assumptions">
      <div className="grid grid-cols-2 items-start gap-8">
        <div>
          <span className="text-2xl font-black text-coral">
            Last Year's Results
          </span>
          <div className="border border-line bg-white p-6">
            <div className="grid grid-cols-2 items-start gap-8">
            <div className="grid gap-4">
              <h3 className="mb-6 text-lg font-bold text-ink">New Logo</h3>
              <PlanInput label="Pipeline created" value={newLogoActuals.pipelineCreated} onChange={(value) => updateInput(["lastYearActuals", "newLogo", "pipelineCreated"], value)} format="currency" />
              <PlanInput label="Bookings closed" value={newLogoActuals.bookings} onChange={(value) => updateInput(["lastYearActuals", "newLogo", "bookings"], value)} format="currency" hint={`Implied close rate: ${(result.derivedActuals.newLogo.winRate * 100).toFixed(1)}%`} />
              <PlanInput label="Program spend" value={newLogoActuals.demandBudget} onChange={(value) => updateInput(["lastYearActuals", "newLogo", "demandBudget"], value)} format="currency" hint={`Implied pipeline ROI: ${result.derivedActuals.newLogo.pipelineRoi.toFixed(1)}x`} />
              <PlanInput label="Avg deal size" value={newLogoActuals.averageDealSize ?? 0} onChange={(value) => updateInput(["lastYearActuals", "newLogo", "averageDealSize"], value)} format="currency" />
            </div>
            <div className={`grid gap-4 ${newLogoOnly ? "pointer-events-none opacity-30" : ""}`}>
              <h3 className="mb-6 text-lg font-bold text-ink">Expansion</h3>
              <PlanInput label="Pipeline created" value={expansionActuals.pipelineCreated} onChange={(value) => updateInput(["lastYearActuals", "expansion", "pipelineCreated"], value)} format="currency" disabled={newLogoOnly} />
              <PlanInput label="Bookings closed" value={expansionActuals.bookings} onChange={(value) => updateInput(["lastYearActuals", "expansion", "bookings"], value)} format="currency" hint={`Implied close rate: ${(result.derivedActuals.expansion.winRate * 100).toFixed(1)}%`} disabled={newLogoOnly} />
              <PlanInput label="Program spend" value={expansionActuals.demandBudget} onChange={(value) => updateInput(["lastYearActuals", "expansion", "demandBudget"], value)} format="currency" hint={`Implied pipeline ROI: ${result.derivedActuals.expansion.pipelineRoi.toFixed(1)}x`} disabled={newLogoOnly} />
              <PlanInput label="Avg deal size" value={expansionActuals.averageDealSize ?? 0} onChange={(value) => updateInput(["lastYearActuals", "expansion", "averageDealSize"], value)} format="currency" disabled={newLogoOnly} />
              <PlanInput label="Existing customers" value={expansionActuals.existingCustomers ?? 0} onChange={(value) => updateInput(["lastYearActuals", "expansion", "existingCustomers"], value)} format="integer" disabled={newLogoOnly} />
            </div>
          </div>
          </div>
        </div>

        <div>
          <span className="text-2xl font-black text-coral">
            This Year's Target
          </span>
          <div className="mt-4 border border-line bg-white p-6">
            <div className="grid gap-5">
              <PlanInput
                label="Next year revenue target"
                value={annualTarget}
                onChange={(value) => updateInput(["planTarget", "totalBookingsTarget"], value)}
                format="currency"
              />
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink/50">
                  Target cadence
                </p>
                <div className="inline-flex border border-line bg-cream p-1">
                  {(["annual", "quarterly"] as TargetMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTargetMode(mode)}
                      className={`border px-4 py-2 text-sm font-bold capitalize ${
                        targetMode === mode
                          ? "border-coral bg-coral text-cream"
                          : "border-transparent bg-transparent text-ink"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              {targetMode === "quarterly" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {quarterlyTargets.map((target, index) => (
                    <PlanInput
                      key={index}
                      label={`Q${index + 1} target`}
                      value={target}
                      onChange={(value) => updateQuarter(index, value)}
                      format="currency"
                    />
                  ))}
                  {!quarterlyValid ? (
                    <p className="sm:col-span-2 font-mono text-xs uppercase tracking-widest text-coral">
                      Q1-Q4 must sum to {formatCurrencyShort(annualTarget)}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <PlanInput
                label="New logo % of target"
                value={newLogoOnly ? 100 : activeInput.planTarget.newLogoTargetPct}
                onChange={(value) => updateInput(["planTarget", "newLogoTargetPct"], value)}
                format="percent"
                hint={`Expansion derives to ${formatPercent(newLogoOnly ? 0 : 100 - activeInput.planTarget.newLogoTargetPct)}`}
                disabled={newLogoOnly}
              />
            </div>
          </div>
          <div
            style={{
              marginTop: "1rem",
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 6,
              backgroundColor: "rgba(10,10,10,0.04)",
              border: "0.5px solid rgba(10,10,10,0.12)",
              padding: "10px 14px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "rgba(10,10,10,0.4)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Toggle off expansion to model new business only
            </p>
            <button
              onClick={toggleNewLogoOnly}
              className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-widest transition ${
                newLogoOnly
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-transparent text-ink"
              }`}
              type="button"
            >
              {newLogoOnly ? "New Logo Only ✕" : "New Logo Only"}
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}

function PlanFeasibilitySection({
  scenario,
  result,
  newLogoOnly,
  adjustedNewLogoCapacity,
  adjustedExpansionCapacity,
  adjustedTotal,
  adjustedFeasibilityStatus,
}: {
  scenario: ScenarioResult;
  result: RevenuePlanResult;
  newLogoOnly: boolean;
  adjustedNewLogoCapacity: number;
  adjustedExpansionCapacity: number;
  adjustedTotal: number;
  adjustedFeasibilityStatus: string;
}) {
  const planYear = new Date().getFullYear() + 1;
  const target = newLogoOnly
    ? result.newLogoTarget
    : result.planTarget.totalBookingsTarget;
  const gap = Math.max(target - adjustedTotal, 0);
  const adjustedCoveragePct = target === 0 ? 0 : (adjustedTotal / target) * 100;
  const statusStyle = statusStyles[adjustedFeasibilityStatus] ?? { bg: "#faf8f3", text: "#0a0a0a" };
  const newLogoPct = target === 0 ? 0 : Math.min((adjustedNewLogoCapacity / target) * 100, 100);
  const expansionPct = target === 0 || newLogoOnly ? 0 : Math.min((adjustedExpansionCapacity / target) * 100, Math.max(100 - newLogoPct, 0));
  const gapPct = Math.max(100 - newLogoPct - expansionPct, 0);
  const adjustedGap = adjustedTotal - target;
  const summary = newLogoOnly
    ? `Projecting to close ${Math.round(adjustedCoveragePct)}% of the ${formatCurrencyShort(target)} new logo target — ${formatCurrencyShort(adjustedTotal)} supported, ${formatCurrencyShort(gap)} gap remaining.`
    : adjustedGap >= 0
      ? `Projecting to close 100% of the ${formatCurrencyShort(target)} target — ${formatCurrencyShort(adjustedGap)} surplus.`
      : `Projecting to close ${Math.round(adjustedCoveragePct)}% of the ${formatCurrencyShort(target)} target — ${formatCurrencyShort(adjustedTotal)} supported, ${formatCurrencyShort(gap)} gap remaining.`;

  return (
    <section className="border-t border-line bg-cream py-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink/50">
        Plan Feasibility
      </p>
      <h2 className="mb-5 text-3xl font-black tracking-tight text-ink">
        {planYear} Revenue Plan
      </h2>
      <div className="border border-line bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="max-w-xl text-base leading-7 text-ink/70">{summary}</p>
          <span
            className="shrink-0 px-3 py-1.5 text-sm font-bold"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
          >
            {adjustedFeasibilityStatus}
          </span>
        </div>
        <div className="mt-8 h-8 w-full overflow-hidden border border-ink bg-cream">
          <div className="flex h-full w-full">
            <div className="h-full" style={{ width: `${newLogoPct}%`, backgroundColor: "#4a90e2" }} />
            {newLogoOnly ? null : (
              <div className="h-full" style={{ width: `${expansionPct}%`, backgroundColor: "#c4ff00" }} />
            )}
            <div
              className="h-full"
              style={{
                width: `${gapPct}%`,
                background:
                  "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(10,10,10,0.08) 4px, rgba(10,10,10,0.08) 8px)",
              }}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-base leading-7 text-ink/70 md:grid-cols-3">
          <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#4a90e2", marginRight: 6 }} />New Logo: {formatCurrencyShort(adjustedNewLogoCapacity)}</span>
          {newLogoOnly ? null : (
            <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#c4ff00", marginRight: 6 }} />Expansion: {formatCurrencyShort(adjustedExpansionCapacity)}</span>
          )}
          <span><span className="mr-2 inline-block h-3 w-3 border border-line bg-cream" />Gap: {formatCurrencyShort(gap)}</span>
        </div>
      </div>
    </section>
  );
}

function LeverRow({
  label,
  currentValue,
  adjustedValue,
  incrementalBookings,
  min,
  max,
  step,
  value,
  pctChange,
  onChange,
  formatValue,
  motion,
}: {
  label: string;
  currentValue: number;
  adjustedValue: number;
  incrementalBookings: number;
  min: number;
  max: number;
  step: number;
  value: number;
  pctChange?: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  motion: "newLogo" | "expansion";
}) {
  const isNonZero = value !== 0;

  return (
    <div className="border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-ink">{label}</p>
          <p className="mt-1 text-base leading-7 text-ink/70">
            {formatValue(currentValue)} → {formatValue(adjustedValue)}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            minWidth: 60,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              color:
                incrementalBookings >= 0
                  ? "var(--color-text-success, #0a0a0a)"
                  : "var(--color-text-danger, #ff6b5b)",
            }}
          >
            {incrementalBookings >= 0 ? "+" : ""}
            {formatCurrencyShort(incrementalBookings)}
          </span>
          {isNonZero && pctChange !== undefined ? (
            <span
              style={{
                fontSize: 11,
                color:
                  pctChange >= 0
                    ? "var(--color-text-success, #0a0a0a)"
                    : "var(--color-text-danger, #ff6b5b)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {pctChange >= 0 ? "+" : ""}
              {pctChange}%
            </span>
          ) : null}
        </div>
      </div>
      <input
        className={`mt-4 w-full ${
          motion === "newLogo" ? "slider-newlogo" : "slider-expansion"
        }`}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
    </div>
  );
}

function GapClosurePanel({
  activeScenarioResult,
  levers,
  setLevers,
  leverImpact,
  newLogoOnly,
}: {
  activeScenarioResult: ScenarioResult;
  levers: LeverState;
  setLevers: React.Dispatch<React.SetStateAction<LeverState>>;
  leverImpact: LeverImpact;
  newLogoOnly: boolean;
}) {
  const newLogo = activeScenarioResult.newLogo;
  const expansion = activeScenarioResult.expansion;
  const newLogoAssumptions = activeScenarioResult.assumptionsSummary.newLogo;
  const expansionAssumptions = activeScenarioResult.assumptionsSummary.expansion;
  const baselineGap = newLogoOnly
    ? newLogo.selectedBottomUpCapacity - newLogo.target
    : activeScenarioResult.totalPlanGap;

  const totalLeverImpact = useMemo(() => {
    const newLogoImpact =
      leverImpact.newLogoBudget +
      leverImpact.newLogoWinRate +
      leverImpact.newLogoDealSize;

    if (newLogoOnly) return newLogoImpact;

    return (
      newLogoImpact +
      leverImpact.expansionBudget +
      leverImpact.expansionWinRate +
      leverImpact.expansionDealSize
    );
  }, [leverImpact, newLogoOnly]);
  const remainingGap = useMemo(() => baselineGap + totalLeverImpact, [baselineGap, totalLeverImpact]);
  const progress = baselineGap >= 0 ? 100 : Math.min((totalLeverImpact / Math.abs(baselineGap)) * 100, 100);
  const updateLever = (key: keyof LeverState) => (value: number) => setLevers((current) => ({ ...current, [key]: value }));
  const handleReset = () => setLevers(DEFAULT_LEVERS);

  return (
    <Section eyebrow="What If Analysis" title="What If Analysis">
      <div className="grid gap-6">
        <div className="border border-line bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-ink/40">
                Gap to close
              </p>
              <p className={`text-2xl font-black ${remainingGap >= 0 ? "text-ink" : "text-coral"}`}>
                {remainingGap >= 0
                  ? "Gap Closed"
                  : formatCurrencyShort(Math.abs(remainingGap))}
              </p>
            </div>
            {remainingGap >= 0 ? (
              <span
                className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-widest"
                style={{ backgroundColor: "#c4ff00", color: "#0a0a0a" }}
              >
                Plan Covered
              </span>
            ) : null}
          </div>
          <div className="mt-4 h-3 overflow-hidden bg-ink/10">
            <div className="h-full bg-coral" style={{ width: `${Math.max(0, progress)}%` }} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-bold" style={{ color: "#4a90e2" }}>New Logo</h3>
            <div className="grid gap-3">
              <LeverRow label="Program spend" currentValue={newLogoAssumptions.demandBudget} adjustedValue={Math.max(0, newLogoAssumptions.demandBudget * (1 + levers.newLogoBudgetIncreasePct / 100))} incrementalBookings={leverImpact.newLogoBudget} pctChange={levers.newLogoBudgetIncreasePct} min={-100} max={100} step={1} value={levers.newLogoBudgetIncreasePct} onChange={updateLever("newLogoBudgetIncreasePct")} formatValue={formatCurrencyShort} motion="newLogo" />
              <LeverRow label="Close rate" currentValue={newLogo.winRate * 100} adjustedValue={Math.min(80, Math.max(1, newLogo.winRate * 100 + levers.newLogoWinRateChangePts))} incrementalBookings={leverImpact.newLogoWinRate} pctChange={getRelativePctChange(newLogo.winRate * 100, Math.min(80, Math.max(1, newLogo.winRate * 100 + levers.newLogoWinRateChangePts)))} min={-20} max={20} step={0.5} value={levers.newLogoWinRateChangePts} onChange={updateLever("newLogoWinRateChangePts")} formatValue={formatPercent} motion="newLogo" />
              <LeverRow label="Avg deal size" currentValue={newLogo.averageDealSize} adjustedValue={Math.max(1, newLogo.averageDealSize * (1 + levers.newLogoAvgDealSizeChangePct / 100))} incrementalBookings={leverImpact.newLogoDealSize} pctChange={levers.newLogoAvgDealSizeChangePct} min={-50} max={50} step={1} value={levers.newLogoAvgDealSizeChangePct} onChange={updateLever("newLogoAvgDealSizeChangePct")} formatValue={formatCurrencyShort} motion="newLogo" />
            </div>
          </div>

          {newLogoOnly ? null : (
          <div>
            <h3 className="mb-4 text-lg font-bold" style={{ color: "#8fb300" }}>Expansion</h3>
            <div className="grid gap-3">
              <LeverRow label="Program spend" currentValue={expansionAssumptions.demandBudget} adjustedValue={Math.max(0, expansionAssumptions.demandBudget * (1 + levers.expansionBudgetIncreasePct / 100))} incrementalBookings={leverImpact.expansionBudget} pctChange={levers.expansionBudgetIncreasePct} min={-100} max={100} step={1} value={levers.expansionBudgetIncreasePct} onChange={updateLever("expansionBudgetIncreasePct")} formatValue={formatCurrencyShort} motion="expansion" />
              <LeverRow label="Close rate" currentValue={expansion.winRate * 100} adjustedValue={Math.min(80, Math.max(1, expansion.winRate * 100 + levers.expansionWinRateChangePts))} incrementalBookings={leverImpact.expansionWinRate} pctChange={getRelativePctChange(expansion.winRate * 100, Math.min(80, Math.max(1, expansion.winRate * 100 + levers.expansionWinRateChangePts)))} min={-20} max={20} step={0.5} value={levers.expansionWinRateChangePts} onChange={updateLever("expansionWinRateChangePts")} formatValue={formatPercent} motion="expansion" />
              <LeverRow label="Avg deal size" currentValue={expansion.averageDealSize} adjustedValue={Math.max(1, expansion.averageDealSize * (1 + levers.expansionAvgDealSizeChangePct / 100))} incrementalBookings={leverImpact.expansionDealSize} pctChange={levers.expansionAvgDealSizeChangePct} min={-50} max={50} step={1} value={levers.expansionAvgDealSizeChangePct} onChange={updateLever("expansionAvgDealSizeChangePct")} formatValue={formatCurrencyShort} motion="expansion" />
            </div>
          </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleReset}
            className="border border-line bg-transparent px-4 py-2 font-mono text-xs uppercase tracking-widest text-ink"
            type="button"
          >
            Reset to zero
          </button>
        </div>
      </div>
    </Section>
  );
}

interface ExecSummaryTile {
  key: string;
  motionColor: string;
  motionLabel: string;
  leverLabel: string;
  displayDelta: string;
  formatFrom: string;
  formatTo: string;
  dollarImpact: number;
}

function ExecSummaryTileCard({ tile }: { tile: ExecSummaryTile }) {
  return (
    <div
      style={{
        background: "var(--color-background-secondary, #ffffff)",
        borderRadius: "var(--border-radius-md, 0)",
        padding: "1rem",
        borderLeft: `3px solid ${tile.motionColor}`,
        borderTop: "1px solid #e8e4dc",
        borderRight: "1px solid #e8e4dc",
        borderBottom: "1px solid #e8e4dc",
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: tile.motionColor,
          marginBottom: "0.5rem",
        }}
      >
        {tile.motionLabel} · {tile.leverLabel}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: "var(--color-text-primary, #0a0a0a)",
          lineHeight: 1,
        }}
      >
        {tile.displayDelta}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--color-text-secondary, rgba(10,10,10,0.7))",
          marginTop: "0.4rem",
        }}
      >
        {tile.formatFrom} → {tile.formatTo}
      </div>
      <div
        style={{
          fontSize: 12,
          color:
            tile.dollarImpact >= 0
              ? "var(--color-text-success, #0a0a0a)"
              : "var(--color-text-danger, #ff6b5b)",
          marginTop: "0.25rem",
        }}
      >
        {tile.dollarImpact >= 0 ? "+" : ""}
        {formatCurrencyShort(tile.dollarImpact)} impact
      </div>
    </div>
  );
}

function ExecSummarySection({
  result,
  activeScenario,
  levers,
  newLogoOnly,
  adjustedTotal,
  adjustedFeasibilityStatus,
}: {
  result: RevenuePlanResult;
  activeScenario: ScenarioResult;
  levers: LeverState;
  newLogoOnly: boolean;
  adjustedTotal: number;
  adjustedFeasibilityStatus: string;
}) {
  const newLogoActuals = result.lastYearActuals.newLogo as RevenuePlanInput["lastYearActuals"]["newLogo"] & {
    averageDealSize?: number;
  };
  const expansionActuals = result.lastYearActuals.expansion as RevenuePlanInput["lastYearActuals"]["expansion"] & {
    averageDealSize?: number;
  };
  const activeTiles: ExecSummaryTile[] = [];
  const newLogoColor = "#4a90e2";
  const expansionColor = "#8fb300";
  const newLogoCloseRateBase = result.derivedActuals.newLogo.winRate * 100;
  const newLogoCloseRateAdjusted =
    activeScenario.newLogo.winRate * 100 + levers.newLogoWinRateChangePts;
  const newLogoBudgetBase = result.lastYearActuals.newLogo.demandBudget;
  const newLogoBudgetAdjusted =
    activeScenario.assumptionsSummary.newLogo.demandBudget *
    (1 + levers.newLogoBudgetIncreasePct / 100);
  const newLogoDealSizeBase =
    newLogoActuals.averageDealSize ?? activeScenario.newLogo.averageDealSize;
  const newLogoDealSizeAdjusted =
    activeScenario.newLogo.averageDealSize *
    (1 + levers.newLogoAvgDealSizeChangePct / 100);

  if (Math.abs(newLogoCloseRateAdjusted - newLogoCloseRateBase) > 0.5) {
    const relativeChangePct =
      newLogoCloseRateBase === 0
        ? 0
        : ((newLogoCloseRateAdjusted - newLogoCloseRateBase) /
            newLogoCloseRateBase) *
          100;
    activeTiles.push({
      key: "new-logo-close-rate",
      motionColor: newLogoColor,
      motionLabel: "New logo",
      leverLabel: "close rate",
      displayDelta: formatDeltaPercent(relativeChangePct),
      formatFrom: formatPercent(newLogoCloseRateBase),
      formatTo: formatPercent(newLogoCloseRateAdjusted),
      dollarImpact:
        activeScenario.newLogo.pipeline.combinedPipeline *
        (levers.newLogoWinRateChangePts / 100),
    });
  }

  if (
    newLogoBudgetBase !== 0 &&
    Math.abs((newLogoBudgetAdjusted - newLogoBudgetBase) / newLogoBudgetBase) >
      0.05
  ) {
    const deltaPct =
      ((newLogoBudgetAdjusted - newLogoBudgetBase) / newLogoBudgetBase) * 100;
    activeTiles.push({
      key: "new-logo-program-spend",
      motionColor: newLogoColor,
      motionLabel: "New logo",
      leverLabel: "program spend",
      displayDelta: formatDeltaPercent(deltaPct),
      formatFrom: formatCurrencyShort(newLogoBudgetBase),
      formatTo: formatCurrencyShort(newLogoBudgetAdjusted),
      dollarImpact:
        (newLogoBudgetAdjusted - newLogoBudgetBase) *
        result.derivedActuals.newLogo.pipelineRoi *
        activeScenario.newLogo.winRate,
    });
  }

  if (
    newLogoDealSizeBase !== 0 &&
    Math.abs((newLogoDealSizeAdjusted - newLogoDealSizeBase) / newLogoDealSizeBase) >
      0.05
  ) {
    const deltaPct =
      ((newLogoDealSizeAdjusted - newLogoDealSizeBase) / newLogoDealSizeBase) *
      100;
    activeTiles.push({
      key: "new-logo-avg-deal-size",
      motionColor: newLogoColor,
      motionLabel: "New logo",
      leverLabel: "avg deal size",
      displayDelta: formatDeltaPercent(deltaPct),
      formatFrom: formatCurrencyShort(newLogoDealSizeBase),
      formatTo: formatCurrencyShort(newLogoDealSizeAdjusted),
      dollarImpact:
        (newLogoDealSizeAdjusted - newLogoDealSizeBase) *
        (activeScenario.newLogo.pipeline.combinedPipelineBookings /
          activeScenario.newLogo.averageDealSize),
    });
  }

  if (!newLogoOnly) {
    const expansionCloseRateBase = result.derivedActuals.expansion.winRate * 100;
    const expansionCloseRateAdjusted =
      activeScenario.expansion.winRate * 100 + levers.expansionWinRateChangePts;
    const expansionBudgetBase = result.lastYearActuals.expansion.demandBudget;
    const expansionBudgetAdjusted =
      activeScenario.assumptionsSummary.expansion.demandBudget *
      (1 + levers.expansionBudgetIncreasePct / 100);
    const expansionDealSizeBase =
      expansionActuals.averageDealSize ??
      activeScenario.expansion.averageDealSize;
    const expansionDealSizeAdjusted =
      activeScenario.expansion.averageDealSize *
      (1 + levers.expansionAvgDealSizeChangePct / 100);

    if (Math.abs(expansionCloseRateAdjusted - expansionCloseRateBase) > 0.5) {
      const relativeChangePct =
        expansionCloseRateBase === 0
          ? 0
          : ((expansionCloseRateAdjusted - expansionCloseRateBase) /
              expansionCloseRateBase) *
            100;
      activeTiles.push({
        key: "expansion-close-rate",
        motionColor: expansionColor,
        motionLabel: "Expansion",
        leverLabel: "close rate",
        displayDelta: formatDeltaPercent(relativeChangePct),
        formatFrom: formatPercent(expansionCloseRateBase),
        formatTo: formatPercent(expansionCloseRateAdjusted),
        dollarImpact:
          activeScenario.expansion.pipeline.combinedPipeline *
          (levers.expansionWinRateChangePts / 100),
      });
    }

    if (
      expansionBudgetBase !== 0 &&
      Math.abs(
        (expansionBudgetAdjusted - expansionBudgetBase) / expansionBudgetBase,
      ) > 0.05
    ) {
      const deltaPct =
        ((expansionBudgetAdjusted - expansionBudgetBase) /
          expansionBudgetBase) *
        100;
      activeTiles.push({
        key: "expansion-program-spend",
        motionColor: expansionColor,
        motionLabel: "Expansion",
        leverLabel: "program spend",
        displayDelta: formatDeltaPercent(deltaPct),
        formatFrom: formatCurrencyShort(expansionBudgetBase),
        formatTo: formatCurrencyShort(expansionBudgetAdjusted),
        dollarImpact:
          (expansionBudgetAdjusted - expansionBudgetBase) *
          result.derivedActuals.expansion.pipelineRoi *
          activeScenario.expansion.winRate,
      });
    }

    if (
      expansionDealSizeBase !== 0 &&
      Math.abs(
        (expansionDealSizeAdjusted - expansionDealSizeBase) /
          expansionDealSizeBase,
      ) > 0.05
    ) {
      const deltaPct =
        ((expansionDealSizeAdjusted - expansionDealSizeBase) /
          expansionDealSizeBase) *
        100;
      activeTiles.push({
        key: "expansion-avg-deal-size",
        motionColor: expansionColor,
        motionLabel: "Expansion",
        leverLabel: "avg deal size",
        displayDelta: formatDeltaPercent(deltaPct),
        formatFrom: formatCurrencyShort(expansionDealSizeBase),
        formatTo: formatCurrencyShort(expansionDealSizeAdjusted),
        dollarImpact:
          (expansionDealSizeAdjusted - expansionDealSizeBase) *
          (activeScenario.expansion.pipeline.combinedPipelineBookings /
            activeScenario.expansion.averageDealSize),
      });
    }
  }

  const lastYearTotal =
    result.lastYearActuals.newLogo.bookings +
    (newLogoOnly ? 0 : result.lastYearActuals.expansion.bookings);
  const target = newLogoOnly
    ? result.newLogoTarget
    : result.planTarget.totalBookingsTarget;
  const growthPct =
    lastYearTotal === 0
      ? 0
      : Math.round(((target - lastYearTotal) / lastYearTotal) * 100);
  const statusStyle = statusStyles[adjustedFeasibilityStatus] ?? {
    bg: "#faf8f3",
    text: "#0a0a0a",
  };

  return (
    <Section eyebrow="EXEC SUMMARY" title="How We Get There">
      {activeTiles.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--color-text-tertiary, rgba(10,10,10,0.5))",
            fontFamily: "var(--font-mono, IBM Plex Mono, Fira Mono, monospace)",
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            border: "0.5px solid var(--color-border-tertiary, #e8e4dc)",
          }}
        >
          No changes from last year — adjust the What If Analysis sliders to model your plan
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: "1.5rem",
          }}
        >
          {activeTiles.map((tile) => (
            <ExecSummaryTileCard key={tile.key} tile={tile} />
          ))}
        </div>
      )}
      <div
        style={{
          borderTop: "0.5px solid var(--color-border-tertiary, #e8e4dc)",
          paddingTop: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: "var(--color-text-secondary, rgba(10,10,10,0.7))",
          }}
        >
          Last year:{" "}
          <strong style={{ color: "var(--color-text-primary, #0a0a0a)" }}>
            {formatCurrencyShort(lastYearTotal)}
          </strong>
          &nbsp;→&nbsp; Projected:{" "}
          <strong style={{ color: "var(--color-text-primary, #0a0a0a)" }}>
            {formatCurrencyShort(adjustedTotal)}
          </strong>
          &nbsp;→&nbsp; Target:{" "}
          <strong style={{ color: "var(--color-text-primary, #0a0a0a)" }}>
            {formatCurrencyShort(target)} (+{growthPct}%)
          </strong>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            padding: "4px 12px",
          }}
        >
          {adjustedFeasibilityStatus}
          {adjustedTotal < target
            ? ` · ${formatCurrencyShort(target - adjustedTotal)} short`
            : ` · ${formatCurrencyShort(adjustedTotal - target)} surplus`}
        </div>
      </div>
    </Section>
  );
}

function SegmentBreakdown({ title, segment }: { title: string; segment: ScenarioResult["newLogo"] | ScenarioResult["expansion"] }) {
  return (
    <div className="mt-5 border border-line bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-ink">{title}</h3>
      <ResultGrid>
        <MetricCard label="Combined pipeline" value={formatCurrencyShort(segment.pipeline.combinedPipeline)} />
        <MetricCard label="Combined pipeline bookings" value={formatCurrencyShort(segment.pipeline.combinedPipelineBookings)} />
        <MetricCard label="Selected capacity" value={formatCurrencyShort(segment.selectedBottomUpCapacity)} />
        <MetricCard label="Limiting factor" value={readable(segment.limitingFactor)} />
      </ResultGrid>
      <div className="mt-4 bg-coral/10 px-3 py-3 text-base leading-7 text-ink/70">
        {segment.limitingFactorExplanation}
      </div>
    </div>
  );
}

function ScenarioAssumptionCards({ scenario }: { scenario: ScenarioResult }) {
  return (
    <ResultGrid>
      <MetricCard label="New logo program spend" value={formatCurrencyShort(scenario.assumptionsSummary.newLogo.demandBudget)} />
      <MetricCard label="Expansion program spend" value={formatCurrencyShort(scenario.assumptionsSummary.expansion.demandBudget)} />
    </ResultGrid>
  );
}

function ModelDetails({ result, activeScenario }: { result: RevenuePlanResult; activeScenario: ScenarioResult }) {
  const [modelDetailsOpen, setModelDetailsOpen] = useState(false);
  const winRatePipelineRows = [15, 20, 25, 30, 35, 40].map((winRate) => ({
    winRate,
    bookings: activeScenario.newLogo.pipeline.combinedPipeline * (winRate / 100),
  }));
  const winRateAcvRows = [20, 25, 30, 35].map((winRate) => ({
    winRate,
    values: [80_000, 100_000, 125_000, 150_000].map((acv) => ({
      acv,
      deals: activeScenario.newLogo.winRate === 0
        ? 0
        : (activeScenario.newLogo.pipeline.combinedPipelineBookings / activeScenario.newLogo.averageDealSize) *
          (winRate / activeScenario.newLogo.winRate / 100),
    })),
  }));

  return (
    <section className="border-t border-line py-6">
      <button onClick={() => setModelDetailsOpen((prev) => !prev)} className="flex w-full items-center justify-between py-4" type="button">
        <span className="font-mono text-sm font-bold uppercase tracking-widest text-ink">Model Details</span>
        <span className="font-mono text-sm font-bold text-ink">{modelDetailsOpen ? "Hide ↑" : "Show ↓"}</span>
      </button>
      {modelDetailsOpen && (
        <div className="mt-8 grid gap-10">
          <Section title="Target & Mix">
            <ResultGrid>
              <MetricCard label="Annual target" value={formatCurrencyShort(result.planTarget.totalBookingsTarget)} />
              <MetricCard label="New logo target" value={formatCurrencyShort(result.newLogoTarget)} detail={`${formatPercent(result.planTarget.newLogoTargetPct)} of plan`} />
              <MetricCard label="Expansion target" value={formatCurrencyShort(result.expansionTarget)} detail={`${formatPercent(result.planTarget.expansionTargetPct)} of plan`} />
            </ResultGrid>
          </Section>

          <Section title="New Logo Assumptions">
            <ScenarioAssumptionCards scenario={activeScenario} />
            <div className="mt-5">
              <ResultGrid>
                <MetricCard label="Target" value={formatCurrencyShort(activeScenario.newLogo.target)} />
                <MetricCard label="Required pipeline" value={formatCurrencyShort(activeScenario.newLogo.pipeline.requiredPipeline)} />
                <MetricCard label="Segment gap" value={formatSignedCurrency(activeScenario.newLogo.segmentGap)} />
                <MetricCard label="Closed-won deals needed" value={formatNumber(activeScenario.newLogo.closedWonDealsNeeded)} />
                <MetricCard label="Current pipeline" value={formatCurrencyShort(activeScenario.newLogo.pipeline.currentPipeline)} />
                <MetricCard label="Incremental budget pipeline" value={formatCurrencyShort(activeScenario.newLogo.pipeline.budgetSupportedPipeline)} />
              </ResultGrid>
            </div>
            <SegmentBreakdown segment={activeScenario.newLogo} title="New logo capacity breakdown" />
          </Section>

          <Section title="Expansion Assumptions">
            <ResultGrid>
              <MetricCard label="Program spend" value={formatCurrencyShort(activeScenario.assumptionsSummary.expansion.demandBudget)} />
              <MetricCard label="Existing customers" value={formatNumber(activeScenario.expansion.existingCustomers)} />
              <MetricCard label="Eligible expansion" value={formatPercent(activeScenario.expansion.eligibleExpansionPct)} />
              <MetricCard label="Eligible customer count" value={formatNumber(activeScenario.expansion.eligibleCustomerCount)} />
              <MetricCard label="Average deal size" value={formatCurrencyShort(activeScenario.expansion.averageDealSize)} />
              <MetricCard label="Expansion revenue per eligible customer" value={formatCurrencyShort(activeScenario.expansion.revenuePerEligibleCustomer)} />
            </ResultGrid>
            <div className="mt-5">
              <ResultGrid>
                <MetricCard label="Expansion target" value={formatCurrencyShort(activeScenario.expansion.target)} />
                <MetricCard label="Required expansion pipeline" value={formatCurrencyShort(activeScenario.expansion.pipeline.requiredPipeline)} />
                <MetricCard label="Segment gap" value={formatSignedCurrency(activeScenario.expansion.segmentGap)} />
                <MetricCard label="Expansion deals needed" value={formatNumber(activeScenario.expansion.closedWonDealsNeeded)} />
                <MetricCard label="Incremental budget expansion pipeline" value={formatCurrencyShort(activeScenario.expansion.pipeline.budgetSupportedPipeline)} />
              </ResultGrid>
            </div>
            <SegmentBreakdown segment={activeScenario.expansion} title="Expansion capacity breakdown" />
          </Section>

          <Section title="Sensitivity Analysis">
            <div className="grid gap-5 xl:grid-cols-3">
              <div className="border border-line bg-white p-5 shadow-sm xl:col-span-2">
                <h3 className="text-lg font-bold text-ink">Close Rate x Pipeline</h3>
                <div className="mt-4 h-72">
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={winRatePipelineRows}>
                      <CartesianGrid stroke="#e8e4dc" vertical={false} />
                      <XAxis dataKey="winRate" tickFormatter={(value) => `${value}%`} />
                      <YAxis tickFormatter={(value) => formatCurrencyShort(Number(value))} tickLine={false} />
                      <Tooltip formatter={(value) => formatCurrencyShort(Number(value))} />
                      <Bar dataKey="bookings" fill="#4a90e2" radius={[0, 0, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="border border-line bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-ink">Close Rate x ACV deal volume</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-ink/50">
                        <th className="pb-2">Close rate</th>
                        {[80_000, 100_000, 125_000, 150_000].map((acv) => <th className="pb-2" key={acv}>{formatCurrencyShort(acv)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {winRateAcvRows.map((row) => (
                        <tr className="border-t border-line" key={row.winRate}>
                          <td className="py-2 font-bold">{formatPercent(row.winRate)}</td>
                          {row.values.map((value) => <td className="py-2" key={value.acv}>{formatNumber(value.deals)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Assumptions & Limitations">
            <div className="border border-line bg-white p-5 text-base leading-7 text-ink/70 shadow-sm">
              This v2 model compares a working scenario against one plan target using last-year actuals, implied efficiency metrics, scenario pipeline, program-spend-supported demand, and install base capacity. It does not model MQLs, SQLs, meetings, custom funnel stages, CAC, payback, or revenue recognition.
            </div>
          </Section>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const [activeInput, setActiveInput] = useState<RevenuePlanInput>(() => createInitialInput());
  const [targetMode, setTargetMode] = useState<TargetMode>("annual");
  const [levers, setLevers] = useState<LeverState>(DEFAULT_LEVERS);
  const [newLogoOnly, setNewLogoOnly] = useState(false);
  const previousMix = useRef({
    newLogoTargetPct: sampleRevenuePlanInput.planTarget.newLogoTargetPct,
    expansionTargetPct: sampleRevenuePlanInput.planTarget.expansionTargetPct,
  });
  const [quarterlyTargets, setQuarterlyTargets] = useState<[number, number, number, number]>(() => {
    const annualTarget = sampleRevenuePlanInput.planTarget.totalBookingsTarget;
    return [annualTarget / 4, annualTarget / 4, annualTarget / 4, annualTarget / 4];
  });
  const result = useMemo(() => calculateRevenuePlan(activeInput), [activeInput]);
  const activeScenario = result.scenarios[0];
  const leverImpact = useMemo(
    () => calculateLeverImpact(activeScenario, result.derivedActuals, levers),
    [activeScenario, levers, result.derivedActuals],
  );
  const newLogoLeverImpact =
    leverImpact.newLogoBudget +
    leverImpact.newLogoWinRate +
    leverImpact.newLogoDealSize;
  const expansionLeverImpact =
    leverImpact.expansionBudget +
    leverImpact.expansionWinRate +
    leverImpact.expansionDealSize;
  const adjustedNewLogoCapacity = useMemo(
    () => activeScenario.newLogo.selectedBottomUpCapacity + newLogoLeverImpact,
    [activeScenario.newLogo.selectedBottomUpCapacity, newLogoLeverImpact],
  );
  const adjustedExpansionCapacity = useMemo(
    () =>
      newLogoOnly
        ? 0
        : activeScenario.expansion.selectedBottomUpCapacity +
          expansionLeverImpact,
    [
      activeScenario.expansion.selectedBottomUpCapacity,
      expansionLeverImpact,
      newLogoOnly,
    ],
  );
  const adjustedTotal = useMemo(
    () => adjustedNewLogoCapacity + adjustedExpansionCapacity,
    [adjustedNewLogoCapacity, adjustedExpansionCapacity],
  );
  const adjustedFeasibilityStatus = useMemo(
    () =>
      getAdjustedFeasibility(
        (newLogoOnly ? result.newLogoTarget : result.planTarget.totalBookingsTarget) === 0
          ? 0
          : (adjustedTotal /
              (newLogoOnly
                ? result.newLogoTarget
                : result.planTarget.totalBookingsTarget)) *
              100,
      ),
    [
      adjustedTotal,
      newLogoOnly,
      result.newLogoTarget,
      result.planTarget.totalBookingsTarget,
    ],
  );

  useEffect(() => {
    const actuals = activeInput.lastYearActuals as RevenuePlanInput["lastYearActuals"] & {
      newLogo: RevenuePlanInput["lastYearActuals"]["newLogo"] & {
        averageDealSize?: number;
      };
      expansion: RevenuePlanInput["lastYearActuals"]["expansion"] & {
        averageDealSize?: number;
        existingCustomers?: number;
      };
    };
    const derived = calculateDerivedActuals(actuals);

    setActiveInput((prev) => {
      const next = structuredClone(prev);
      next.lastYearActuals = prev.lastYearActuals;
      const scenario = next.scenarios[0];

      scenario.newLogo.demandBudget = actuals.newLogo.demandBudget;
      scenario.newLogo.winRate.absoluteValue =
        Math.round(derived.newLogo.winRate * 1000) / 10;
      scenario.newLogo.averageDealSize.absoluteValue =
        actuals.newLogo.averageDealSize ?? scenario.newLogo.averageDealSize.absoluteValue;

      scenario.expansion.demandBudget = actuals.expansion.demandBudget;
      scenario.expansion.winRate.absoluteValue =
        Math.round(derived.expansion.winRate * 1000) / 10;
      scenario.expansion.averageDealSize.absoluteValue =
        actuals.expansion.averageDealSize ?? scenario.expansion.averageDealSize.absoluteValue;
      scenario.expansion.existingCustomers =
        actuals.expansion.existingCustomers ?? scenario.expansion.existingCustomers;

      return next;
    });
  }, [activeInput.lastYearActuals]);

  function updateInput(path: string[], value: number) {
    setActiveInput((prev) => updateNestedInput(prev, path, value));
  }

  function toggleNewLogoOnly() {
    const nextNewLogoOnly = !newLogoOnly;

    setActiveInput((prev) => {
      const next = structuredClone(prev);
      next.lastYearActuals = prev.lastYearActuals;

      if (nextNewLogoOnly) {
        previousMix.current = {
          newLogoTargetPct: prev.planTarget.newLogoTargetPct,
          expansionTargetPct: prev.planTarget.expansionTargetPct,
        };
        next.planTarget.newLogoTargetPct = 100;
        next.planTarget.expansionTargetPct = 0;
      } else {
        next.planTarget.newLogoTargetPct =
          previousMix.current.newLogoTargetPct;
        next.planTarget.expansionTargetPct =
          previousMix.current.expansionTargetPct;
      }

      return next;
    });
    setNewLogoOnly(nextNewLogoOnly);
  }

  return (
    <main className="mx-auto w-full max-w-7xl bg-cream px-4 py-8 md:px-8">
      <header className="pb-8">
        <p className="font-mono text-sm font-black uppercase tracking-widest text-ink">
          Revenue Plan Sensitivity Model
        </p>
        <p className="mt-3 max-w-2xl text-base leading-7 text-ink/70">
          A revenue planning tool for B2B SaaS teams. Enter last year's actuals
          and this year's target to pressure-test whether your plan is
          achievable. The model derives implied efficiency metrics from your
          actuals — close rate, pipeline ROI — and projects forward based on your
          assumptions. It does not model churn, NRR, CAC, MQL/SQL funnel stages,
          sales headcount capacity, or revenue recognition timing. Use it to
          identify your binding constraint and stress-test the levers that
          actually move the number.
        </p>
      </header>

      <InputsSection
        activeInput={activeInput}
        result={result}
        targetMode={targetMode}
        quarterlyTargets={quarterlyTargets}
        setTargetMode={setTargetMode}
        setQuarterlyTargets={setQuarterlyTargets}
        updateInput={updateInput}
        newLogoOnly={newLogoOnly}
        toggleNewLogoOnly={toggleNewLogoOnly}
      />

      <PlanFeasibilitySection
        scenario={activeScenario}
        result={result}
        newLogoOnly={newLogoOnly}
        adjustedNewLogoCapacity={adjustedNewLogoCapacity}
        adjustedExpansionCapacity={adjustedExpansionCapacity}
        adjustedTotal={adjustedTotal}
        adjustedFeasibilityStatus={adjustedFeasibilityStatus}
      />

      <GapClosurePanel
        activeScenarioResult={activeScenario}
        leverImpact={leverImpact}
        levers={levers}
        newLogoOnly={newLogoOnly}
        setLevers={setLevers}
      />

      <ExecSummarySection
        activeScenario={activeScenario}
        adjustedTotal={adjustedTotal}
        adjustedFeasibilityStatus={adjustedFeasibilityStatus}
        levers={levers}
        newLogoOnly={newLogoOnly}
        result={result}
      />

      <ModelDetails result={result} activeScenario={activeScenario} />
    </main>
  );
}
