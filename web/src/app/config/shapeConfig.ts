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

// The Registry of Shapes.
export const SHAPE_LIBRARY: Record<string, ShapeProfile> = {
  Pear: {
    name: 'Pear 8 Mains',
    fields: {
      tableWidth: {
        min: 48,
        max: 72,
        step: 1,
        txtKey: 'WIDTH_TABLE_PC',
        rounding: 1.0,
      },
      crown: {
        min: 28,
        max: 48,
        step: 0.5,
        txtKey: 'CROWN_FANCY_CURVE_ANGLE_DEG',
        rounding: 0.5,
      },
      pavilionDepth: {
        min: 35,
        max: 55,
        step: 0.2,
        txtKey: 'PAVILION_DEPTH_PC',
        rounding: 0.2,
      },
      halvesAngle: { min: 35.1, max: 48, step: 0.1 }, // For dropdown generation
      lowerLHL: {
        min: 65,
        max: 85,
        step: 1,
        txtKey: 'LENGTH_GIRDLE_FACET',
        rounding: 1.0,
      },
      starRatio: {
        min: 35,
        max: 65,
        step: 1,
        txtKey: 'STAR_RATIO_PC',
        rounding: 1.0,
      },
      haD: { min: 40, max: 42, step: 0.5, txtKey: 'HA_D', rounding: 0.5 },
      crownHeight: {
        min: 0,
        max: 100,
        step: 0.5,
        txtKey: 'CROWN_FANCY_CURVE_HEIGHT_PC',
        rounding: 0.5,
      },
      pavilionCurve: {
        min: 0,
        max: 100,
        step: 0.2,
        txtKey: 'PAVILION_FANCY_CURVE_ANGLE_DEG',
        rounding: 0.2,
      },
    },
  },
  // Example of how easy it is to add another shape with different rules
  Round: {
    name: 'Round Brilliant',
    fields: {
      tableWidth: {
        min: 50,
        max: 65,
        step: 1,
        txtKey: 'TABLE_PC', // Different key for Round?
        rounding: 0,
      },
      // ... add other specific fields for Round
    },
  },
};

// Fallback config if shape is unknown
export const DEFAULT_CONFIG = SHAPE_LIBRARY['Pear'];