import type {
  DerivedActuals,
  DerivedMotionActuals,
  LastYearActuals,
} from "./types.ts";

function divideSafely(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateMotionDerivedActuals(
  bookings: number,
  pipelineCreated: number,
  demandBudget: number,
): DerivedMotionActuals {
  return {
    winRate: divideSafely(bookings, pipelineCreated),
    pipelineRoi: divideSafely(pipelineCreated, demandBudget),
    coverageRatio: divideSafely(pipelineCreated, bookings),
    bookingsPerDollarOfBudget: divideSafely(bookings, demandBudget),
  };
}

export function calculateDerivedActuals(
  actuals: LastYearActuals,
): DerivedActuals {
  return {
    newLogo: calculateMotionDerivedActuals(
      actuals.newLogo.bookings,
      actuals.newLogo.pipelineCreated,
      actuals.newLogo.demandBudget,
    ),
    expansion: calculateMotionDerivedActuals(
      actuals.expansion.bookings,
      actuals.expansion.pipelineCreated,
      actuals.expansion.demandBudget,
    ),
  };
}
