import { calculateRevenuePlan } from "../lib/calculations.ts";
import { formatCurrencyShort } from "../lib/formatters.ts";
import { sampleRevenuePlanInput } from "../lib/sampleData.ts";

function assertClose(
  actual: number,
  expected: number,
  label: string,
  tolerance = 0.01,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(label);
  }
}

const result = calculateRevenuePlan(sampleRevenuePlanInput);
const [scenarioA, scenarioB, scenarioC] = result.scenarios;
const zeroAdjustmentInput = structuredClone(sampleRevenuePlanInput);
const zeroAdjustmentScenario = zeroAdjustmentInput.scenarios[0];
const zeroAdjustmentDerived = result.derivedActuals;

zeroAdjustmentScenario.newLogo.demandBudget =
  zeroAdjustmentInput.lastYearActuals.newLogo.demandBudget;
zeroAdjustmentScenario.newLogo.winRate.absoluteValue =
  zeroAdjustmentDerived.newLogo.winRate * 100;
zeroAdjustmentScenario.expansion.demandBudget =
  zeroAdjustmentInput.lastYearActuals.expansion.demandBudget;
zeroAdjustmentScenario.expansion.winRate.absoluteValue =
  zeroAdjustmentDerived.expansion.winRate * 100;

const zeroAdjustmentResult = calculateRevenuePlan(zeroAdjustmentInput);
const zeroAdjustmentActiveScenario = zeroAdjustmentResult.scenarios[0];

assertClose(result.newLogoTarget, 7_040_000, "newLogoTarget");
assertClose(result.expansionTarget, 3_960_000, "expansionTarget");
assertClose(
  result.derivedActuals.newLogo.winRate,
  0.25,
  "newLogo implied close rate from actuals",
);
assertClose(
  result.derivedActuals.expansion.winRate,
  0.3,
  "expansion implied close rate from actuals",
);
assertClose(
  result.derivedActuals.newLogo.pipelineRoi,
  5.71,
  "newLogo impliedPipelineRoi",
  0.01,
);
assertClose(
  result.derivedActuals.expansion.pipelineRoi,
  25,
  "expansion impliedPipelineRoi",
  0.01,
);
assertClose(
  zeroAdjustmentActiveScenario.newLogo.pipeline.combinedPipeline,
  zeroAdjustmentInput.lastYearActuals.newLogo.pipelineCreated,
  "zero-adjustment newLogo combinedPipeline equals last year pipeline",
);
assertClose(
  zeroAdjustmentActiveScenario.newLogo.pipeline.budgetSupportedPipeline,
  0,
  "zero-adjustment newLogo incremental budget pipeline",
);
assertClose(
  zeroAdjustmentActiveScenario.newLogo.pipeline.combinedPipelineBookings,
  zeroAdjustmentInput.lastYearActuals.newLogo.bookings,
  "zero-adjustment newLogo bookings reproduce last year's bookings",
  1_000,
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.pipeline.combinedPipeline,
  zeroAdjustmentInput.lastYearActuals.expansion.pipelineCreated,
  "zero-adjustment expansion combinedPipeline equals last year pipeline",
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.pipeline.budgetSupportedPipeline,
  0,
  "zero-adjustment expansion incremental budget pipeline",
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.pipeline.combinedPipelineBookings,
  zeroAdjustmentInput.lastYearActuals.expansion.bookings,
  "zero-adjustment expansion bookings reproduce last year's bookings",
  1_000,
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.selectedBottomUpCapacity,
  3_000_000,
  "zero-adjustment expansion selected capacity",
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.eligibleCustomerCount,
  140,
  "zero-adjustment expansion eligible customer count",
);
assertClose(
  zeroAdjustmentActiveScenario.expansion.revenuePerEligibleCustomer,
  3_000_000 / 140,
  "zero-adjustment expansion revenue per eligible customer",
);
assertClose(
  zeroAdjustmentActiveScenario.totalBottomUpCapacity,
  8_000_000,
  "zero-adjustment total bottom-up capacity",
);
assertClose(
  zeroAdjustmentActiveScenario.totalPlanGap,
  -3_000_000,
  "zero-adjustment total plan gap",
);
assert(
  zeroAdjustmentActiveScenario.feasibilityStatus === "At Risk",
  "zero-adjustment feasibility status should be At Risk",
);
assertClose(
  scenarioA.newLogo.pipeline.combinedPipeline,
  11_428_571.43,
  "Scenario A newLogo combinedPipeline",
  0.01,
);
assert(
  scenarioA.totalPlanGap < 0,
  "Scenario A totalPlanGap should be negative",
);
assert(
  scenarioB.totalPlanGap > scenarioA.totalPlanGap,
  "Scenario B totalPlanGap should be better than Scenario A",
);
assert(
  scenarioC.totalBottomUpCapacity > scenarioB.totalBottomUpCapacity,
  "Scenario C totalBottomUpCapacity should exceed Scenario B",
);

console.log("Calculation validation passed.");
console.log("Zero-adjustment pipeline and bookings tests passed for both motions.");
console.log(
  `Zero-adjustment capacity: ${formatCurrencyShort(
    zeroAdjustmentActiveScenario.totalBottomUpCapacity,
  )}`,
);
console.log(
  `Zero-adjustment gap: ${formatCurrencyShort(
    zeroAdjustmentActiveScenario.totalPlanGap,
  )}`,
);
console.log(
  `Zero-adjustment status: ${zeroAdjustmentActiveScenario.feasibilityStatus}`,
);
console.log(
  `Expansion revenue per eligible customer: ${formatCurrencyShort(
    zeroAdjustmentActiveScenario.expansion.revenuePerEligibleCustomer,
  )}`,
);
console.log(`New logo target: ${formatCurrencyShort(result.newLogoTarget)}`);
console.log(`Expansion target: ${formatCurrencyShort(result.expansionTarget)}`);

for (const scenario of result.scenarios) {
  console.log(`\n${scenario.scenarioName} (${scenario.scenarioLabel})`);
  console.log(
    `Total bottom-up capacity: ${formatCurrencyShort(
      scenario.totalBottomUpCapacity,
    )}`,
  );
  console.log(
    `New logo pipeline: ${formatCurrencyShort(
      scenario.newLogo.pipeline.combinedPipeline,
    )} (${formatCurrencyShort(
      scenario.newLogo.pipeline.budgetSupportedPipeline,
    )} from incremental budget)`,
  );
  console.log(
    `New logo pipeline bookings: ${formatCurrencyShort(
      scenario.newLogo.pipeline.combinedPipelineBookings,
    )}`,
  );
  console.log(
    `Expansion pipeline: ${formatCurrencyShort(
      scenario.expansion.pipeline.combinedPipeline,
    )} (${formatCurrencyShort(
      scenario.expansion.pipeline.budgetSupportedPipeline,
    )} from incremental budget)`,
  );
  console.log(
    `Expansion pipeline bookings: ${formatCurrencyShort(
      scenario.expansion.pipeline.combinedPipelineBookings,
    )}`,
  );
  console.log(`Total plan gap: ${formatCurrencyShort(scenario.totalPlanGap)}`);
  console.log(`Feasibility status: ${scenario.feasibilityStatus}`);
  console.log(
    `Primary constraint: ${
      scenario.constraintDiagnosis.primary?.constraint ?? "none"
    }`,
  );
  console.log(`New logo limiting factor: ${scenario.newLogo.limitingFactor}`);
  console.log(`Expansion limiting factor: ${scenario.expansion.limitingFactor}`);
}
