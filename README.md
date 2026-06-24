# SaaS Revenue Plan Sensitivity Model

A revenue planning tool for B2B SaaS teams that 
pressure-tests whether an annual bookings target is 
achievable — and shows exactly what has to be true 
to hit it.

---

## Overview

Enter last year's actuals. The model derives your 
implied dollar-weighted close rate and pipeline ROI 
automatically, then projects forward based on your 
assumptions. Adjust levers to model different scenarios 
and watch the plan update in real time.

At zero adjustment, the model reproduces last year's 
actual bookings exactly. Any gap shown reflects 
genuine assumptions about improvement.

**Not modelled (by design):** churn, NRR, sales 
headcount capacity, MQL/SQL funnel stages, CAC, 
revenue recognition timing.

---

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run validate
```

---

## Stack

Next.js 15 · TypeScript · Tailwind CSS · Recharts

---

## Key design decisions

**Actuals-anchored** — efficiency metrics are derived 
from last year's results, not entered as assumptions.

**Incremental budget** — program spend at zero 
adjustment contributes zero additional pipeline. 
Only budget increases above last year generate 
incremental capacity.

**Symmetric motions** — New Logo and Expansion use 
identical pipeline-to-bookings conversion formulas.

---

## About

Andrew Koperwas — Growth Prism Advisory  
Fractional CMO for B2B SaaS  
[growthprismadvisory.com](https://growthprismadvisory.com)