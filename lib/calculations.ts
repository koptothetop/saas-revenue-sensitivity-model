import { calculateDerivedActuals } from "./derivedActuals.ts";
import type {
  ConstraintDiagnosis,
  ConstraintScore,
  ExpansionLimitingFactor,
  ExpansionScenarioAssumptions,
  ExpansionScenarioResult,
  FeasibilityStatus,
  GapClosureOption,
  NewLogoLimitingFactor,
  NewLogoScenarioResult,
  PipelineCapacityResult,
  PlanTarget,
  RevenuePlanInput,
  RevenuePlanResult,
  ScenarioAssumptions,
  ScenarioResult,
  SegmentScenarioAssumptions,
} from "./types.ts";

export type {
  AbsoluteValue,
  ConstraintDiagnosis,
  ConstraintKey,
  ConstraintScore,
  DerivedActuals,
  DerivedMotionActuals,
  ExpansionLimitingFactor,
  ExpansionScenarioAssumptions,
  ExpansionScenarioResult,
  FeasibilityStatus,
  GapClosureOption,
  GapClosureOptionType,
  LastYearActuals,
  LastYearMotionActuals,
  NewLogoLimitingFactor,
  NewLogoScenarioResult,
  PipelineCapacityResult,
  PlanTarget,
  RevenuePlanInput,
  RevenuePlanResult,
  ScenarioAssumptions,
  ScenarioAssumptionsSummary,
  ScenarioName,
  ScenarioResult,
  SegmentAssumptionsSummary,
  SegmentScenarioAssumptions,
} from "./types.ts";

export function toDecimal(percentage: number): number {
  return percentage / 100;
}

export function divideSafely(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

export function clampToZero(value: number): number {
  return value < 0 ? 0 : value;
}

function formatCurrency(value: number): string {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absoluteValue >= 1_000_000) {
    return `${sign}$${(absoluteValue / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}$${Math.round(absoluteValue / 1_000)}K`;
  }

  return `${sign}$${Math.round(absoluteValue).toLocaleString("en-US")}`;
}

function formatPercent(decimalValue: number): string {
  return `${(decimalValue * 100).toFixed(0)}%`;
}

function calculatePipelineCapacity(
  assumptions: SegmentScenarioAssumptions,
  target: number,
  impliedPipelineRoi: number,
  currentPipeline: number,
  lastYearDemandBudget: number,
): PipelineCapacityResult {
  const winRate = toDecimal(assumptions.winRate.absoluteValue);
  const budgetSupportedPipeline =
    (assumptions.demandBudget - lastYearDemandBudget) * impliedPipelineRoi;
  const combinedPipeline = currentPipeline + budgetSupportedPipeline;
  const combinedPipelineBookings = combinedPipeline * winRate;

  return {
    currentPipeline,
    budgetSupportedPipeline,
    combinedPipeline,
    impliedPipelineRoi,
    combinedPipelineBookings,
    requiredPipeline: divideSafely(target, winRate),
    coverageRatio: divideSafely(combinedPipelineBookings, target),
  };
}

function explainNewLogoLimitingFactor(
  limitingFactor: NewLogoLimitingFactor,
  pipeline: PipelineCapacityResult,
  winRate: number,
  target: number,
): string {
  if (pipeline.budgetSupportedPipeline === 0) {
    return `Pipeline of ${formatCurrency(
      pipeline.combinedPipeline,
    )} converts to ${formatCurrency(
      pipeline.combinedPipelineBookings,
    )} in bookings at a ${formatPercent(
      winRate,
    )} close rate, which is below the ${formatCurrency(target)} target.`;
  }

  return `Combined pipeline of ${formatCurrency(
    pipeline.combinedPipeline,
  )} (${formatCurrency(
    pipeline.currentPipeline,
  )} from current pipeline + ${formatCurrency(
    pipeline.budgetSupportedPipeline,
  )} from incremental budget) converts to ${formatCurrency(
    pipeline.combinedPipelineBookings,
  )} in bookings at a ${formatPercent(
    winRate,
  )} close rate, which is below the ${formatCurrency(target)} target.`;
}

function explainExpansionLimitingFactor(
  pipeline: PipelineCapacityResult,
  winRate: number,
  target: number,
): string {
  if (pipeline.budgetSupportedPipeline === 0) {
    return `Pipeline of ${formatCurrency(
      pipeline.combinedPipeline,
    )} converts to ${formatCurrency(
      pipeline.combinedPipelineBookings,
    )} in bookings at a ${formatPercent(
      winRate,
    )} close rate, which is below the ${formatCurrency(target)} target.`;
  }

  return `Combined pipeline of ${formatCurrency(
    pipeline.combinedPipeline,
  )} (${formatCurrency(
    pipeline.currentPipeline,
  )} from current pipeline + ${formatCurrency(
    pipeline.budgetSupportedPipeline,
  )} from incremental budget) converts to ${formatCurrency(
    pipeline.combinedPipelineBookings,
  )} in bookings at a ${formatPercent(
    winRate,
  )} close rate, which is below the ${formatCurrency(target)} target.`;
}

function calculateNewLogoSegment(
  assumptions: SegmentScenarioAssumptions,
  target: number,
  impliedPipelineRoi: number,
  currentPipeline: number,
  lastYearDemandBudget: number,
): NewLogoScenarioResult {
  const pipeline = calculatePipelineCapacity(
    assumptions,
    target,
    impliedPipelineRoi,
    currentPipeline,
    lastYearDemandBudget,
  );
  const winRate = toDecimal(assumptions.winRate.absoluteValue);
  const selectedBottomUpCapacity = pipeline.combinedPipelineBookings;
  const limitingFactor: NewLogoLimitingFactor = "pipeline";

  return {
    target,
    pipeline,
    winRate,
    averageDealSize: assumptions.averageDealSize.absoluteValue,
    closedWonDealsNeeded: divideSafely(
      target,
      assumptions.averageDealSize.absoluteValue,
    ),
    selectedBottomUpCapacity,
    limitingFactor,
    limitingFactorExplanation: explainNewLogoLimitingFactor(
      limitingFactor,
      pipeline,
      winRate,
      target,
    ),
    segmentGap: selectedBottomUpCapacity - target,
  };
}

function calculateExpansionSegment(
  assumptions: ExpansionScenarioAssumptions,
  target: number,
  impliedPipelineRoi: number,
  currentPipeline: number,
  lastYearDemandBudget: number,
): ExpansionScenarioResult {
  const pipeline = calculatePipelineCapacity(
    assumptions,
    target,
    impliedPipelineRoi,
    currentPipeline,
    lastYearDemandBudget,
  );
  const winRate = toDecimal(assumptions.winRate.absoluteValue);
  const selectedBottomUpCapacity = pipeline.combinedPipelineBookings;
  const limitingFactor: ExpansionLimitingFactor = "pipeline";
  const eligibleExpansionPct =
    assumptions.eligibleExpansionPct.absoluteValue;
  const eligibleCustomerCount =
    assumptions.existingCustomers * toDecimal(eligibleExpansionPct);
  const revenuePerEligibleCustomer = divideSafely(
    selectedBottomUpCapacity,
    eligibleCustomerCount,
  );

  return {
    target,
    pipeline,
    winRate,
    averageDealSize: assumptions.averageDealSize.absoluteValue,
    closedWonDealsNeeded: divideSafely(
      target,
      assumptions.averageDealSize.absoluteValue,
    ),
    existingCustomers: assumptions.existingCustomers,
    eligibleExpansionPct,
    eligibleCustomerCount,
    revenuePerEligibleCustomer,
    selectedBottomUpCapacity,
    limitingFactor,
    limitingFactorExplanation: explainExpansionLimitingFactor(
      pipeline,
      winRate,
      target,
    ),
    segmentGap: selectedBottomUpCapacity - target,
  };
}

function getFeasibilityStatus(coveragePct: number): FeasibilityStatus {
  if (coveragePct >= 100) return "On Track";
  if (coveragePct >= 90) return "Slightly Short";
  if (coveragePct >= 70) return "At Risk";
  if (coveragePct >= 50) return "Material Gap";
  return "Not Feasible Under Current Assumptions";
}

function diagnoseConstraints(
  newLogo: NewLogoScenarioResult,
  expansion: ExpansionScenarioResult,
): ConstraintDiagnosis {
  const constraintScores: ConstraintScore[] = [
    {
      constraint: "new_logo_pipeline",
      shortfall: clampToZero(
        newLogo.target - newLogo.pipeline.combinedPipelineBookings,
      ),
    },
    {
      constraint: "expansion_pipeline",
      shortfall: clampToZero(
        expansion.target - expansion.pipeline.combinedPipelineBookings,
      ),
    },
  ];
  const scores = constraintScores
    .filter((score) => score.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall);

  return {
    primary: scores[0] ?? null,
    secondary: scores.slice(1, 4),
  };
}

function calculateGapClosureOptions(
  newLogo: NewLogoScenarioResult,
  expansion: ExpansionScenarioResult,
  newLogoAssumptions: SegmentScenarioAssumptions,
  expansionAssumptions: ExpansionScenarioAssumptions,
): GapClosureOption[] {
  const newLogoShortfall = clampToZero(-newLogo.segmentGap);
  const expansionShortfall = clampToZero(-expansion.segmentGap);
  const segment =
    newLogoShortfall >= expansionShortfall
      ? {
          target: newLogo.target,
          shortfall: newLogoShortfall,
          assumptions: newLogoAssumptions,
          pipeline: newLogo.pipeline,
          winRate: newLogo.winRate,
        }
      : {
          target: expansion.target,
          shortfall: expansionShortfall,
          assumptions: expansionAssumptions,
          pipeline: expansion.pipeline,
          winRate: expansion.winRate,
        };
  const bookingsShortfall = segment.shortfall;
  const closedWonDealsExpected = divideSafely(
    segment.pipeline.combinedPipelineBookings,
    segment.assumptions.averageDealSize.absoluteValue,
  );

  return [
    {
      type: "add_demand_budget",
      label: "Add program spend",
      value: divideSafely(
        divideSafely(bookingsShortfall, segment.winRate),
        segment.pipeline.impliedPipelineRoi,
      ),
      unit: "currency",
      explanation:
        "Additional program spend required at the current pipeline ROI and close rate to close the larger segment gap.",
    },
    {
      type: "improve_win_rate",
      label: "Improve close rate",
      value:
        divideSafely(segment.target, segment.pipeline.combinedPipeline) * 100,
      unit: "percent",
      explanation:
        "Close rate required for the larger-gap segment to hit target using current combined pipeline.",
    },
    {
      type: "increase_average_deal_size",
      label: "Increase average deal size",
      value: divideSafely(segment.target, closedWonDealsExpected),
      unit: "currency",
      explanation:
        "Average deal size required for the larger-gap segment using expected closed-won deal count.",
    },
    {
      type: "improve_pipeline_efficiency",
      label: "Improve pipeline efficiency",
      value: divideSafely(
        divideSafely(segment.target, segment.winRate) -
          segment.pipeline.currentPipeline,
        segment.assumptions.demandBudget,
      ),
      unit: "multiple",
      explanation:
        "Pipeline ROI required for the larger-gap segment to hit target without adding program spend.",
    },
  ];
}

function calculateScenario(
  scenario: ScenarioAssumptions,
  newLogoTarget: number,
  expansionTarget: number,
  impliedNewLogoPipelineRoi: number,
  impliedExpansionPipelineRoi: number,
  lastYearNewLogoPipeline: number,
  lastYearExpansionPipeline: number,
  lastYearNewLogoDemandBudget: number,
  lastYearExpansionDemandBudget: number,
  planTarget: PlanTarget,
): ScenarioResult {
  const newLogo = calculateNewLogoSegment(
    scenario.newLogo,
    newLogoTarget,
    impliedNewLogoPipelineRoi,
    lastYearNewLogoPipeline,
    lastYearNewLogoDemandBudget,
  );
  const expansion = calculateExpansionSegment(
    scenario.expansion,
    expansionTarget,
    impliedExpansionPipelineRoi,
    lastYearExpansionPipeline,
    lastYearExpansionDemandBudget,
  );
  const totalBottomUpCapacity =
    newLogo.selectedBottomUpCapacity + expansion.selectedBottomUpCapacity;
  const totalPlanGap = totalBottomUpCapacity - planTarget.totalBookingsTarget;
  const coveragePct = divideSafely(
    totalBottomUpCapacity,
    planTarget.totalBookingsTarget,
  ) * 100;

  return {
    scenarioName: scenario.scenarioName,
    scenarioLabel: scenario.scenarioLabel,
    newLogo,
    expansion,
    totalBottomUpCapacity,
    totalPlanGap,
    coveragePct,
    feasibilityStatus: getFeasibilityStatus(coveragePct),
    constraintDiagnosis: diagnoseConstraints(newLogo, expansion),
    gapClosureOptions: calculateGapClosureOptions(
      newLogo,
      expansion,
      scenario.newLogo,
      scenario.expansion,
    ),
    assumptionsSummary: {
      newLogo: {
        demandBudget: scenario.newLogo.demandBudget,
      },
      expansion: {
        demandBudget: scenario.expansion.demandBudget,
      },
    },
  };
}

export function calculateRevenuePlan(input: RevenuePlanInput): RevenuePlanResult {
  const derivedActuals = calculateDerivedActuals(input.lastYearActuals);
  const newLogoTarget =
    input.planTarget.totalBookingsTarget *
    toDecimal(input.planTarget.newLogoTargetPct);
  const expansionTarget =
    input.planTarget.totalBookingsTarget *
    toDecimal(input.planTarget.expansionTargetPct);
  const scenarios = input.scenarios.map((scenario) =>
    calculateScenario(
      scenario,
      newLogoTarget,
      expansionTarget,
      derivedActuals.newLogo.pipelineRoi,
      derivedActuals.expansion.pipelineRoi,
      input.lastYearActuals.newLogo.pipelineCreated,
      input.lastYearActuals.expansion.pipelineCreated,
      input.lastYearActuals.newLogo.demandBudget,
      input.lastYearActuals.expansion.demandBudget,
      input.planTarget,
    ),
  ) as [ScenarioResult, ScenarioResult, ScenarioResult];

  return {
    lastYearActuals: input.lastYearActuals,
    derivedActuals,
    planTarget: input.planTarget,
    newLogoTarget,
    expansionTarget,
    scenarios,
  };
}
