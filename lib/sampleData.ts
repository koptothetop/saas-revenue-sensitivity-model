import type { RevenuePlanInput } from "./types.ts";

export const sampleRevenuePlanInput: RevenuePlanInput = {
  lastYearActuals: {
    newLogo: {
      bookings: 5_000_000,
      pipelineCreated: 20_000_000,
      demandBudget: 3_500_000,
    },
    expansion: {
      bookings: 3_000_000,
      pipelineCreated: 10_000_000,
      demandBudget: 400_000,
    },
  },
  planTarget: {
    totalBookingsTarget: 11_000_000,
    newLogoTargetPct: 64,
    expansionTargetPct: 36,
  },
  scenarios: [
    {
      scenarioName: "a",
      scenarioLabel: "Scenario A",
      newLogo: {
        demandBudget: 2_000_000,
        winRate: { absoluteValue: 25 },
        averageDealSize: { absoluteValue: 100_000 },
      },
      expansion: {
        demandBudget: 100_000,
        winRate: { absoluteValue: 30 },
        averageDealSize: { absoluteValue: 50_000 },
        existingCustomers: 400,
        eligibleExpansionPct: { absoluteValue: 35 },
      },
    },
    {
      scenarioName: "b",
      scenarioLabel: "Scenario B",
      newLogo: {
        demandBudget: 2_400_000,
        winRate: { absoluteValue: 28 },
        averageDealSize: { absoluteValue: 110_000 },
      },
      expansion: {
        demandBudget: 140_000,
        winRate: { absoluteValue: 34 },
        averageDealSize: { absoluteValue: 55_000 },
        existingCustomers: 420,
        eligibleExpansionPct: { absoluteValue: 40 },
      },
    },
    {
      scenarioName: "c",
      scenarioLabel: "Scenario C",
      newLogo: {
        demandBudget: 2_800_000,
        winRate: { absoluteValue: 32 },
        averageDealSize: { absoluteValue: 125_000 },
      },
      expansion: {
        demandBudget: 180_000,
        winRate: { absoluteValue: 38 },
        averageDealSize: { absoluteValue: 60_000 },
        existingCustomers: 450,
        eligibleExpansionPct: { absoluteValue: 45 },
      },
    },
  ],
};
