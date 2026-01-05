/** Generates an array of string options for a dropdown based on a range. */
export const generateOptions = (min: number, max: number, step: number) => {
  const options = [];
  for (let val = min; val <= max + 0.0001; val += step) {
    options.push(Number(val.toFixed(2)).toString());
  }
  return options;
};

/** Rounds a number to the nearest step and returns it as a formatted string. */
export const roundToStep = (value: number, step: number): string => {
  if (step === 0) return value.toString();
  const inverse = 1 / step;
  const rounded = Math.round(value * inverse) / inverse;
  const decimalPlaces = step.toString().split('.')[1]?.length || 0;
  return rounded.toFixed(decimalPlaces);
};