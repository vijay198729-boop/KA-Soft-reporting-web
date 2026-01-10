// Types for the Shape Configuration Strategy
export type FieldRule = {
  min: number;
  max: number;
  step: number;
  txtKey?: string; // The key in the uploaded text file
  rounding?: number; // Rounding precision
};

export type ShapeProfile = {
  name: string;
  fields: Record<string, FieldRule>;
  // Optional: Custom post-processing logic for specific shapes
  postProcess?: (
    dataMap: Map<string, string>,
    currentData: Record<string, string>,
  ) => Record<string, string>;
};

// Common fields reused across shapes
const COMMON_FIELDS: Record<string, FieldRule> = {
  tableWidth: { min: 48, max: 72, step: 1, txtKey: 'WIDTH_TABLE_PC', rounding: 1.0 },
  crown: { min: 28, max: 48, step: 0.5, txtKey: 'CROWN_FANCY_CURVE_ANGLE_DEG', rounding: 0.5 },
  pavilionDepth: { min: 35, max: 55, step: 0.2, txtKey: 'PAVILION_DEPTH_PC', rounding: 0.2 },
  halvesAngle: { min: 35.1, max: 48, step: 0.1 },
  lowerLHL: { min: 65, max: 85, step: 1, txtKey: 'LENGTH_GIRDLE_FACET', rounding: 1.0 },
  starRatio: { min: 35, max: 65, step: 1, txtKey: 'STAR_RATIO_PC', rounding: 1.0 },
  haD: { min: 40, max: 42, step: 0.5, txtKey: 'HA_D', rounding: 0.5 },
  crownHeight: { min: 0, max: 100, step: 0.5, txtKey: 'CROWN_FANCY_CURVE_HEIGHT_PC', rounding: 0.5 },
};

// Logic to detect shape variant from file data
export const SHAPE_VARIANTS: Record<string, (data: Map<string, string>) => string> = {
  Marquise: (data) => (data.has('PAVILION_FANCY_CURVE_ANGLE_DEG') ? 'Marq 8 Mains' : 'Marq 4 Mains'),
  Oval: (data) => (data.has('PAVILION_FANCY_CURVE_ANGLE_DEG') ? 'Oval 8 Mains' : 'Oval 4 Mains'),
  Pear: (data) => (data.has('PAVILION_FANCY_CURVE_ANGLE_DEG') ? 'Pear 8 Mains' : 'Pear 4 Mains'),
};

// The Registry of Shapes.
export const SHAPE_LIBRARY: Record<string, ShapeProfile> = {
  'Pear 8 Mains': {
    name: 'Pear 8 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_CURVE_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
  'Pear 4 Mains': {
    name: 'Pear 4 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_HEAD_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
  'Oval 8 Mains': {
    name: 'Oval 8 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_CURVE_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
  'Oval 4 Mains': {
    name: 'Oval 4 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_WING_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
  'Marq 8 Mains': {
    name: 'Marq 8 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_CURVE_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
  'Marq 4 Mains': {
    name: 'Marq 4 Mains',
    fields: {
      ...COMMON_FIELDS,
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_WING_ANGLE_DEG',
        rounding: 0.1,
      },
    },
  },
};

// Fallback config if shape is unknown
export const DEFAULT_CONFIG = SHAPE_LIBRARY['Pear 8 Mains'];