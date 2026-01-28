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

/** Parses a text file content into a Map of key-value pairs. */
export const parseTextFileToMap = (text: string): Map<string, string> => {
  const dataMap = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  lines.forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      dataMap.set(parts[0].trim(), parts.slice(1).join('=').trim());
    }
  });
  return dataMap;
};

/** Calculates common derived metrics like Halves Avg, CW Diff, etc. */
export const calculateDerivedMetrics = (
  dataMap: Map<string, string>,
): Record<string, string> => {
  const newData: Record<string, string> = {};
  const getNum = (key: string) => parseFloat(dataMap.get(key) || 'NaN');

  // Halves
  const h1 = getNum('HALVES_ANGLE_DEG_1');
  const p1 = getNum('PAVILION_FANCY_CURVE_ANGLE_DEG_1');

  let halvesIndices = [1, 8, 9, 16];
  if (!isNaN(h1) && !isNaN(p1) && h1 <= p1) {
    halvesIndices = [16, 7, 8, 15];
  }

  const halvesValues = halvesIndices.map((i) => getNum(`HALVES_ANGLE_DEG_${i}`)).filter((v) => !isNaN(v));

  if (halvesValues.length > 0) {
    const avg = halvesValues.reduce((a, b) => a + b, 0) / halvesValues.length;
    newData['halvesAngleAvg'] = roundToStep(avg, 0.1);
    newData['halvesAngleMin'] = roundToStep(Math.min(...halvesValues), 0.1);
    newData['halvesAngleMax'] = roundToStep(Math.max(...halvesValues), 0.1);
  }

  // CW Diff
  const crownCurveAngle = getNum('CROWN_FANCY_CURVE_ANGLE_DEG');
  const crownWingAngle = getNum('CROWN_FANCY_WING_ANGLE_DEG');
  if (!isNaN(crownCurveAngle) && !isNaN(crownWingAngle)) {
    const diff = Math.abs(crownCurveAngle - crownWingAngle);
    newData['cwDiff'] = roundToStep(diff, 0.1);
  }

  // HA-D (Initial calculation, can be overridden by config fields if txtKey exists)
  const haD12 = getNum('HALVES_ANGLE_DEG_12');
  const haD13 = getNum('HALVES_ANGLE_DEG_13');
  if (!isNaN(haD12) && !isNaN(haD13)) {
    const avg = (haD12 + haD13) / 2;
    newData['haD'] = roundToStep(avg, 0.5);
  }

  return newData;
};