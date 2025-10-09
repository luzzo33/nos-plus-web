const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isEnabled = (value: string | undefined): boolean => {
  if (!value) return false;
  return TRUE_VALUES.has(value.toLowerCase());
};

export const features = {
  priceForecast: isEnabled(process.env.NEXT_PUBLIC_ENABLE_PRICE_FORECAST),
};

