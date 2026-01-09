import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import styles from '../app.module.css';
import { Header } from '../components/Header';
import { SHAPE_LIBRARY, DEFAULT_CONFIG } from '../config/shapeConfig';
import { generateOptions, roundToStep } from '../utils/calculatorUtils';
import {
  SelectRow,
  DisplayRow,
  MetricRow,
} from '../components/CalculatorComponents';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3100' : '')
).replace(/\/$/, '');

export const FancyPerformanceCalculator = ({
  session,
}: {
  session: Session;
}) => {
  // Unified state for all form fields
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.role === 'admin') {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    if (session) checkAdmin();
  }, [session]);

  // Helper to update a single field
  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    setFormData({});
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

    // 1. Determine Shape
    const shapeName = dataMap.get('SHAPE') || 'Pear';
    const config = SHAPE_LIBRARY[shapeName] || DEFAULT_CONFIG;

    // 2. Initialize new data object
    const newData: Record<string, string> = {};
    newData['shape'] = shapeName;

    if (dataMap.has('AZIMUTH')) newData['azimuth'] = dataMap.get('AZIMUTH')!;
    if (dataMap.has('SYMMETRY')) newData['symmetry'] = dataMap.get('SYMMETRY')!;

    // 3. Helper to parse numbers
    const getNum = (key: string) => parseFloat(dataMap.get(key) || 'NaN');

    // 4. Common Calculations (can be moved to config.postProcess if they differ wildly)
    const halvesValues = [
      getNum('HALVES_ANGLE_DEG_1'),
      getNum('HALVES_ANGLE_DEG_8'),
      getNum('HALVES_ANGLE_DEG_9'),
      getNum('HALVES_ANGLE_DEG_16'),
    ].filter((v) => !isNaN(v));

    if (halvesValues.length > 0) {
      const avg = halvesValues.reduce((a, b) => a + b, 0) / halvesValues.length;
      newData['halvesAngleAvg'] = roundToStep(avg, 0.1);
      newData['halvesAngleMin'] = roundToStep(Math.min(...halvesValues), 0.1);
      newData['halvesAngleMax'] = roundToStep(Math.max(...halvesValues), 0.1);
    }

    const crownCurveAngle = getNum('CROWN_FANCY_CURVE_ANGLE_DEG');
    const crownWingAngle = getNum('CROWN_FANCY_WING_ANGLE_DEG');
    if (!isNaN(crownCurveAngle) && !isNaN(crownWingAngle)) {
      const diff = Math.abs(crownCurveAngle - crownWingAngle);
      newData['cwDiff'] = roundToStep(diff, 0.1);
    }

    const haD12 = getNum('HALVES_ANGLE_DEG_12');
    const haD13 = getNum('HALVES_ANGLE_DEG_13');
    if (!isNaN(haD12) && !isNaN(haD13)) {
      const avg = (haD12 + haD13) / 2;
      // Use rounding from config if available, else default 0.5
      const rounding = config.fields['haD']?.rounding || 0.5;
      newData['haD'] = roundToStep(avg, rounding);
    }

    // 5. Dynamic Field Mapping based on Config
    Object.entries(config.fields).forEach(([stateKey, rule]) => {
      if (rule.txtKey) {
        const rawVal = dataMap.get(rule.txtKey);
        if (rawVal) {
          const numVal = parseFloat(rawVal);
          if (!isNaN(numVal)) {
            newData[stateKey] = roundToStep(numVal, rule.rounding || 1);
          }
        }
      }
    });

    // 6. Execute custom post-processing if defined for this shape
    if (config.postProcess) {
      const processed = config.postProcess(dataMap, newData);
      Object.assign(newData, processed);
    }

    setFormData((prev) => ({ ...prev, ...newData }));
  };

  // Determine which config to use for rendering options (default to Pear if not set)
  const currentShape = formData['shape'] || 'Pear';
  const activeConfig = SHAPE_LIBRARY[currentShape] || DEFAULT_CONFIG;
  const fields = activeConfig.fields;

  // Generate options based on config
  const tableOptions = generateOptions(
    fields.tableWidth?.min || 48,
    fields.tableWidth?.max || 72,
    fields.tableWidth?.step || 1,
  );
  const crownOptions = generateOptions(
    fields.crown?.min || 28,
    fields.crown?.max || 48,
    fields.crown?.step || 0.5,
  );
  const depthOptions = generateOptions(
    fields.pavilionDepth?.min || 35,
    fields.pavilionDepth?.max || 55,
    fields.pavilionDepth?.step || 0.2,
  );
  const halvesOptions = generateOptions(
    fields.halvesAngle?.min || 35.1,
    fields.halvesAngle?.max || 48,
    fields.halvesAngle?.step || 0.1,
  );
  const lowerOptions = generateOptions(
    fields.lowerLHL?.min || 65,
    fields.lowerLHL?.max || 85,
    fields.lowerLHL?.step || 1,
  );
  const starOptions = generateOptions(
    fields.starRatio?.min || 35,
    fields.starRatio?.max || 65,
    fields.starRatio?.step || 1,
  );
  const haDOptions = generateOptions(
    fields.haD?.min || 40,
    fields.haD?.max || 42,
    fields.haD?.step || 0.5,
  );
  const shapeOptions = ['Pear 8 Mains', 'Round Brilliant', 'Oval', 'Princess'];
  const gradeOptions = ['EX', 'VG', 'G', 'F'];

  return (
    <div className={styles.container}>
      <Header session={session} />
      <main className={styles.main}>
        <div className={styles.calcContainer}>
          {isAdmin && (
            <div style={{ textAlign: 'right', marginBottom: '10px' }}>
              <Link to="/admin" className={styles.link}>
                Go to Admin Dashboard
              </Link>
            </div>
          )}
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
                value={formData.shape || ''}
                onChange={(e) => updateField('shape', e.target.value)}
                className={styles.modernSelect}
              >
                {/* Dynamically generate options */}
                {Array.from(new Set([formData.shape, ...shapeOptions]))
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
                  value={formData.tableWidth || ''}
                  onChange={(v) => updateField('tableWidth', v)}
                  options={tableOptions}
                />
                <SelectRow
                  label="Crown (Curve)"
                  value={formData.crown || ''}
                  onChange={(v) => updateField('crown', v)}
                  options={crownOptions}
                />
                <SelectRow
                  label="Crown Height %"
                  value={formData.crownHeight || ''}
                  onChange={(v) => updateField('crownHeight', v)}
                  options={[]}
                  disabled={true}
                />
                <SelectRow
                  label="Pavilion Depth"
                  value={formData.pavilionDepth || ''}
                  onChange={(v) => updateField('pavilionDepth', v)}
                  options={depthOptions}
                />
                <SelectRow
                  label="Pavilion Curve °"
                  value={formData.pavilionCurve || ''}
                  onChange={(v) => updateField('pavilionCurve', v)}
                  options={[]}
                  disabled={true}
                />
                <SelectRow
                  label="Azimuth °"
                  value={formData.azimuth || ''}
                  onChange={(v) => updateField('azimuth', v)}
                  options={gradeOptions}
                  disabled={true}
                />
                <SelectRow
                  label="Symmetry"
                  value={formData.symmetry || ''}
                  onChange={(v) => updateField('symmetry', v)}
                  options={gradeOptions}
                  disabled={true}
                />
                {/* CW-DIFF is a calculated field, so we display it */}
                <DisplayRow label="CW-DIFF" value={formData.cwDiff || ''} />
              </div>

              {/* middle column */}
              <div className={styles.inputSection}>
                <SelectRow
                  label="Halves Angle (Avg)°"
                  value={formData.halvesAngleAvg || ''}
                  onChange={(v) => updateField('halvesAngleAvg', v)}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Halves Angle (Min)°"
                  value={formData.halvesAngleMin || ''}
                  onChange={(v) => updateField('halvesAngleMin', v)}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Halves Angle (Max)°"
                  value={formData.halvesAngleMax || ''}
                  onChange={(v) => updateField('halvesAngleMax', v)}
                  options={halvesOptions}
                />
                <SelectRow
                  label="Lower (LHL) %"
                  value={formData.lowerLHL || ''}
                  onChange={(v) => updateField('lowerLHL', v)}
                  options={lowerOptions}
                />
                <SelectRow
                  label="Star Ratio (W) %"
                  value={formData.starRatio || ''}
                  onChange={(v) => updateField('starRatio', v)}
                  options={starOptions}
                />
                <SelectRow
                  label="HA-D"
                  value={formData.haD || ''}
                  onChange={(v) => updateField('haD', v)}
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
