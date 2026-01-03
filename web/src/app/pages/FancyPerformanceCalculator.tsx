import { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import styles from '../app.module.css';
import { Header } from '../components/Header';

// --- CONFIGURATION ---
// Field limits and rounding rules. Update this object to match your Excel sheet.
const FIELD_CONFIG = {
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
};

// --- HELPERS ---

/** Generates an array of string options for a dropdown based on a range. */
const generateOptions = (min: number, max: number, step: number) => {
  const options = [];
  for (let val = min; val <= max + 0.0001; val += step) {
    options.push(Number(val.toFixed(2)).toString());
  }
  return options;
};

/** Rounds a number to the nearest step and returns it as a formatted string. */
const roundToStep = (value: number, step: number): string => {
  if (step === 0) return value.toString();
  const inverse = 1 / step;
  const rounded = Math.round(value * inverse) / inverse;
  const decimalPlaces = step.toString().split('.')[1]?.length || 0;
  return rounded.toFixed(decimalPlaces);
};

export const FancyPerformanceCalculator = ({
  session,
}: {
  session: Session;
}) => {
  // Left side dropdown values
  const [tableWidth, setTableWidth] = useState('');
  const [crown, setCrown] = useState('');
  const [pavilionDepth, setPavilionDepth] = useState('');
  const [azimuth, setAzimuth] = useState('');
  const [symmetry, setSymmetry] = useState('');
  const [cwDiff, setCwDiff] = useState('');

  // Right side dropdown values
  const [halvesAngleAvg, setHalvesAngleAvg] = useState('');
  const [halvesAngleMin, setHalvesAngleMin] = useState('');
  const [halvesAngleMax, setHalvesAngleMax] = useState('');
  const [lowerLHL, setLowerLHL] = useState('');
  const [starRatio, setStarRatio] = useState('');
  const [haD, setHaD] = useState('');
  const [shape, setShape] = useState(''); // Default to empty

  // Static values for display
  const lightPerformance = 99;
  const brightness = 98;
  const contrast = 99;
  const fire = 97;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // keep static for now
  };

  const handleReset = () => {
    setTableWidth('');
    setCrown('');
    setPavilionDepth('');
    setAzimuth('');
    setSymmetry('');
    setCwDiff('');
    setHalvesAngleAvg('');
    setHalvesAngleMin('');
    setHalvesAngleMax('');
    setLowerLHL('');
    setStarRatio('');
    setHaD('');
    setShape('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processFileData(text);
    };
    reader.readAsText(file);
  };

  const processFileData = (text: string) => {
    const dataMap = new Map<string, string>();
    const lines = text.split(/\r?\n/);
    lines.forEach((line) => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        dataMap.set(parts[0].trim(), parts.slice(1).join('=').trim());
      }
    });

    const getNum = (key: string) => parseFloat(dataMap.get(key) || 'NaN');

    // --- Calculated Fields ---
    const halvesValues = [
      getNum('HALVES_ANGLE_DEG_1'),
      getNum('HALVES_ANGLE_DEG_8'),
      getNum('HALVES_ANGLE_DEG_9'),
      getNum('HALVES_ANGLE_DEG_16'),
    ].filter((v) => !isNaN(v));

    if (halvesValues.length > 0) {
      const avg = halvesValues.reduce((a, b) => a + b, 0) / halvesValues.length;
      setHalvesAngleAvg(roundToStep(avg, 0.1));
      setHalvesAngleMin(roundToStep(Math.min(...halvesValues), 0.1));
      setHalvesAngleMax(roundToStep(Math.max(...halvesValues), 0.1));
    }

    const crownCurveAngle = getNum('CROWN_FANCY_CURVE_ANGLE_DEG');
    const crownWingAngle = getNum('CROWN_FANCY_WING_ANGLE_DEG');
    if (!isNaN(crownCurveAngle) && !isNaN(crownWingAngle)) {
      const diff = Math.abs(crownCurveAngle - crownWingAngle);
      setCwDiff(roundToStep(diff, 0.1));
    }

    const haD12 = getNum('HALVES_ANGLE_DEG_12');
    const haD13 = getNum('HALVES_ANGLE_DEG_13');
    if (!isNaN(haD12) && !isNaN(haD13)) {
      const avg = (haD12 + haD13) / 2;
      setHaD(roundToStep(avg, FIELD_CONFIG.haD.rounding));
    }

    // --- Direct Mappings with Rounding ---
    const roundAndSet = (
      setter: (val: string) => void,
      config: { txtKey: string; rounding: number },
    ) => {
      const rawValue = dataMap.get(config.txtKey);
      if (rawValue) {
        const numValue = parseFloat(rawValue);
        if (!isNaN(numValue)) {
          setter(roundToStep(numValue, config.rounding));
        }
      }
    };

    roundAndSet(setTableWidth, FIELD_CONFIG.tableWidth);
    roundAndSet(setCrown, FIELD_CONFIG.crown);
    roundAndSet(setPavilionDepth, FIELD_CONFIG.pavilionDepth);
    roundAndSet(setLowerLHL, FIELD_CONFIG.lowerLHL);
    roundAndSet(setStarRatio, FIELD_CONFIG.starRatio);

    // --- Non-numeric / Special Mappings ---
    const shapeValue = dataMap.get('SHAPE');
    if (shapeValue) {
      setShape(shapeValue);
    }
    if (dataMap.has('AZIMUTH')) setAzimuth(dataMap.get('AZIMUTH')!);
    if (dataMap.has('SYMMETRY')) setSymmetry(dataMap.get('SYMMETRY')!);
  };

  // Generate options based on config
  const tableOptions = generateOptions(
    FIELD_CONFIG.tableWidth.min,
    FIELD_CONFIG.tableWidth.max,
    FIELD_CONFIG.tableWidth.step,
  );
  const crownOptions = generateOptions(
    FIELD_CONFIG.crown.min,
    FIELD_CONFIG.crown.max,
    FIELD_CONFIG.crown.step,
  );
  const depthOptions = generateOptions(
    FIELD_CONFIG.pavilionDepth.min,
    FIELD_CONFIG.pavilionDepth.max,
    FIELD_CONFIG.pavilionDepth.step,
  );
  const halvesOptions = generateOptions(
    FIELD_CONFIG.halvesAngle.min,
    FIELD_CONFIG.halvesAngle.max,
    FIELD_CONFIG.halvesAngle.step,
  );
  const lowerOptions = generateOptions(
    FIELD_CONFIG.lowerLHL.min,
    FIELD_CONFIG.lowerLHL.max,
    FIELD_CONFIG.lowerLHL.step,
  );
  const starOptions = generateOptions(
    FIELD_CONFIG.starRatio.min,
    FIELD_CONFIG.starRatio.max,
    FIELD_CONFIG.starRatio.step,
  );
  const haDOptions = generateOptions(
    FIELD_CONFIG.haD.min,
    FIELD_CONFIG.haD.max,
    FIELD_CONFIG.haD.step,
  );
  const shapeOptions = ['Pear 8 Mains', 'Round Brilliant', 'Oval', 'Princess'];
  const gradeOptions = ['EX', 'VG', 'G', 'F'];

  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.calcContainer}>
          <h2 className={styles.calcHeader}>
            KA Software Fancy Performance Calculator{' '}
            <span
              style={{
                fontWeight: 400,
                fontSize: '0.7em',
                color: '#64748b',
                marginLeft: 8,
              }}
            >
              v6.0
            </span>
          </h2>

          <div className={styles.calcControls}>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked
                  readOnly
                  style={{ accentColor: '#2563eb' }}
                />{' '}
                Manual Entry System
              </label>
              <label
                className={`${styles.radioLabel} ${styles.radioLabelDisabled}`}
              >
                <input type="radio" disabled /> Use [ AI ] for Auto Suggestions
              </label>
              <label
                className={`${styles.radioLabel} ${styles.radioLabelDisabled}`}
              >
                <input type="radio" disabled /> Ideal Scope Images (Virtual)
              </label>
            </div>

            <div className={styles.selectGroup}>
              <label
                className={styles.modernBtn}
                style={{
                  cursor: 'pointer',
                  marginRight: '10px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Upload File
                <input
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
              <span className={styles.selectLabel}>Select Shape</span>
              <select
                value={shape}
                onChange={(e) => setShape(e.target.value)}
                className={styles.modernSelect}
              >
                {/* Dynamically generate options */}
                {Array.from(new Set([shape, ...shapeOptions]))
                  .filter(Boolean)
                  .map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.gridContainer}>
              {/* left column */}
              <div className={styles.inputSection}>
                <SelectRow
                  label="Table (Width) %"
                  value={tableWidth}
                  onChange={setTableWidth}
                  options={tableOptions}
                />
                <SelectRow
                  label="Crown (Curve)"
                  value={crown}
                  onChange={setCrown}
                  options={crownOptions}
                />
                <SelectRow
                  label="Pavilion Depth"
                  value={pavilionDepth}
                  onChange={setPavilionDepth}
                  options={depthOptions}
                />
                <SelectRow
                  label="Azimuth °"
                  value={azimuth}
                  onChange={setAzimuth}
                  options={gradeOptions}
                />
                <SelectRow
                  label="Symmetry"
                  value={symmetry}
                  onChange={setSymmetry}
                  options={gradeOptions}
                />
                {/* CW-DIFF is a calculated field, so we display it */}
                <DisplayRow label="CW-DIFF" value={cwDiff} />
              </div>

              {/* middle column */}
              <div className={styles.inputSection}>
                <SelectRow
                  label="Halves Angle (Avg)°"
                  value={halvesAngleAvg}
                  onChange={setHalvesAngleAvg}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Halves Angle (Min)°"
                  value={halvesAngleMin}
                  onChange={setHalvesAngleMin}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Halves Angle (Max)°"
                  value={halvesAngleMax}
                  onChange={setHalvesAngleMax}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Lower (LHL) %"
                  value={lowerLHL}
                  onChange={setLowerLHL}
                  options={lowerOptions}
                />
                <SelectRow
                  label="Star Ratio (W) %"
                  value={starRatio}
                  onChange={setStarRatio}
                  options={starOptions}
                />
                <SelectRow
                  label="HA-D"
                  value={haD}
                  onChange={setHaD}
                  options={haDOptions}
                />
              </div>

              {/* right placeholder */}
              <div className={styles.placeholderBox}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>💎</div>
                <div>Shape Diagram Placeholder</div>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button type="button" className={styles.modernBtn}>
                Load HP Data
              </button>
              <button type="button" className={styles.modernBtn}>
                Load SRN Data
              </button>
              <button
                type="button"
                className={styles.modernBtn}
                onClick={handleReset}
              >
                RESET
              </button>
              <button
                type="button"
                className={`${styles.modernBtn} ${styles.modernBtnPrimary}`}
              >
                AI Grading
              </button>
              <button type="button" className={styles.modernBtn}>
                Export CSV
              </button>
            </div>

            <div className={styles.resultsTableContainer}>
              <table className={styles.resultsTable}>
                <thead>
                  <tr>
                    <th>KA LR Grade</th>
                    <th>Bowtie</th>
                    <th>Fish Eye</th>
                    <th>KA-GIA</th>
                    <th>KA-IGI</th>
                    <th>KA-GCal</th>
                    <th>Final LR Grade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 18,
                          color: '#2563eb',
                        }}
                      >
                        1
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Excellent
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>0</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Ideal
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>1</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Excellent
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>0</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Ideal
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>0</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Ideal
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>1</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Excellent
                      </div>
                    </td>
                    <td>
                      <div style={{ color: '#94a3b8' }}>NA</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className={styles.metricsContainer}>
              <MetricRow
                label="Light Performance"
                value={lightPerformance}
                color="#10b981"
              />
              <MetricRow
                label="Brightness"
                value={brightness}
                color="#3b82f6"
              />
              <MetricRow label="Contrast" value={contrast} color="#8b5cf6" />
              <MetricRow label="Fire" value={fire} color="#f59e0b" />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

/* helpers */

const DisplayRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
    <span className={styles.rowLabel}>{label}</span>
    <div
      className={styles.modernSelect}
      style={{
        width: '100%',
        minWidth: 0,
        backgroundColor: '#eef2ff',
        cursor: 'default',
      }}
    >
      {value || '-'}
    </div>
  </div>
);

const SelectRow = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) => {
  // Ensure the current value is available in options so it displays correctly
  const uniqueOptions = Array.from(new Set([value, ...options])).filter(
    Boolean,
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
      <span className={styles.rowLabel}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.modernSelect}
        style={{ width: '100%', minWidth: 0 }}
      >
        {uniqueOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
};

const MetricRow = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <div className={styles.metricRow}>
    <span className={styles.metricLabel}>{label}</span>
    <div
      style={{
        flex: 1,
        height: 10,
        backgroundColor: '#f1f5f9',
        borderRadius: 5,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${value}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: 5,
          transition: 'width 1s ease-out',
        }}
      />
    </div>
    <span className={styles.metricValue}>{value}%</span>
  </div>
);
