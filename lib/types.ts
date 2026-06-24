export type ScenarioName = "a" | "b" | "c";

export type FeasibilityStatus =
  | "On Track"
  | "Slightly Short"
  | "At Risk"
  | "Material Gap"
  | "Not Feasible Under Current Assumptions";

export type NewLogoLimitingFactor = "pipeline";
export type ExpansionLimitingFactor = NewLogoLimitingFactor;

export type ConstraintKey =
  | "new_logo_pipeline"
  | "expansion_pipeline";

export interface AbsoluteValue {
  absoluteValue: number;
}

export interface LastYearMotionActuals {
  bookings: number;
  pipelineCreated: number;
  demandBudget: number;
}

export interface LastYearActuals {
  newLogo: LastYearMotionActuals;
  expansion: LastYearMotionActuals;
}

export interface DerivedMotionActuals {
  winRate: number;
  pipelineRoi: number;
  coverageRatio: number;
  bookingsPerDollarOfBudget: number;
}

export interface DerivedActuals {
  newLogo: DerivedMotionActuals;
  expansion: DerivedMotionActuals;
}

export interface PlanTarget {
  totalBookingsTarget: number;
  newLogoTargetPct: number;
  expansionTargetPct: number;
}

export interface SegmentScenarioAssumptions {
  demandBudget: number;
  winRate: AbsoluteValue;
  averageDealSize: AbsoluteValue;
}

export interface ExpansionScenarioAssumptions
  extends SegmentScenarioAssumptions {
  existingCustomers: number;
  eligibleExpansionPct: AbsoluteValue;
}

export interface ScenarioAssumptions {
  scenarioName: ScenarioName;
  scenarioLabel: string;
  newLogo: SegmentScenarioAssumptions;
  expansion: ExpansionScenarioAssumptions;
}

export interface RevenuePlanInput {
  lastYearActuals: LastYearActuals;
  planTarget: PlanTarget;
  scenarios: [ScenarioAssumptions, ScenarioAssumptions, ScenarioAssumptions];
}

export interface PipelineCapacityResult {
  currentPipeline: number;
  budgetSupportedPipeline: number;
  combinedPipeline: number;
  impliedPipelineRoi: number;
  combinedPipelineBookings: number;
  requiredPipeline: number;
  coverageRatio: number;
}

export interface NewLogoScenarioResult {
  target: number;
  pipeline: PipelineCapacityResult;
  winRate: number;
  averageDealSize: number;
  closedWonDealsNeeded: number;
  selectedBottomUpCapacity: number;
  limitingFactor: NewLogoLimitingFactor;
  limitingFactorExplanation: string;
  segmentGap: number;
}

export interface ExpansionScenarioResult
  extends Omit<NewLogoScenarioResult, "limitingFactor"> {
  existingCustomers: number;
  eligibleExpansionPct: number;
  eligibleCustomerCount: number;
  revenuePerEligibleCustomer: number;
  limitingFactor: ExpansionLimitingFactor;
}

export interface ConstraintScore {
  constraint: ConstraintKey;
  shortfall: number;
}

export interface ConstraintDiagnosis {
  primary: ConstraintScore | null;
  secondary: ConstraintScore[];
}

export type GapClosureOptionType =
  | "add_demand_budget"
  | "improve_win_rate"
  | "increase_average_deal_size"
  | "improve_pipeline_efficiency";

export interface GapClosureOption {
  type: GapClosureOptionType;
  label: string;
  value: number;
  unit: "currency" | "percent" | "number" | "multiple";
  explanation: string;
}

export interface SegmentAssumptionsSummary {
  demandBudget: number;
}

export interface ScenarioAssumptionsSummary {
  newLogo: SegmentAssumptionsSummary;
  expansion: SegmentAssumptionsSummary;
}

export interface ScenarioResult {
  scenarioName: ScenarioName;
  scenarioLabel: string;
  newLogo: NewLogoScenarioResult;
  expansion: ExpansionScenarioResult;
  totalBottomUpCapacity: number;
  totalPlanGap: number;
  coveragePct: number;
  feasibilityStatus: FeasibilityStatus;
  constraintDiagnosis: ConstraintDiagnosis;
  gapClosureOptions: GapClosureOption[];
  assumptionsSummary: ScenarioAssumptionsSummary;
}

export interface RevenuePlanResult {
  lastYearActuals: LastYearActuals;
  derivedActuals: DerivedActuals;
  planTarget: PlanTarget;
  newLogoTarget: number;
  expansionTarget: number;
  scenarios: [ScenarioResult, ScenarioResult, ScenarioResult];
}
