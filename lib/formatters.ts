const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function formatCurrencyShort(value: number): string {
  const absoluteValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absoluteValue >= 1_000_000) {
    return `${sign}$${(absoluteValue / 1_000_000).toFixed(1)}M`;
  }

  if (absoluteValue >= 1_000) {
    return `${sign}$${Math.round(absoluteValue / 1_000)}K`;
  }

  return `${sign}${currencyFormatter.format(absoluteValue)}`;
}

export function formatPercent(value: number): string {
  return `${numberFormatter.format(value)}%`;
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDays(value: number): string {
  return `${formatNumber(value)} days`;
}

export function formatMultiple(value: number): string {
  return `${value.toFixed(1)}x`;
}
