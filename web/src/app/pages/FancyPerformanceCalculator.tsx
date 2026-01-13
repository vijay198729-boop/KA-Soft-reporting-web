import { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import styles from '../app.module.css';
import { Header } from '../components/Header';
import {
  SHAPE_LIBRARY,
  DEFAULT_CONFIG,
  SHAPE_VARIANTS,
} from '../config/shapeConfig';
import {
  generateOptions,
  roundToStep,
  parseTextFileToMap,
  calculateDerivedMetrics,
} from '../utils/calculatorUtils';
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
  const [fileData, setFileData] = useState<Map<string, string> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [calculatedGrades, setCalculatedGrades] = useState<{
    kgs: number | null;
    feye: number | null;
    bowtie: number | null;
  }>({ kgs: null, feye: null, bowtie: null });

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

  // Fetch calculated grades when relevant fields change
  useEffect(() => {
    const fetchGrades = async () => {
      const { tableWidth, crown, pavilionDepth, shape, halvesAngleAvg } =
        formData;

      if (!tableWidth || !crown || !pavilionDepth) {
        setCalculatedGrades({ kgs: null, feye: null, bowtie: null });
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/calculate-grades`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            tableWidth,
            crown,
            pavilionDepth,
            shape,
            halvesAngleAvg,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCalculatedGrades(data);
        }
      } catch (err) {
        console.error('Error fetching grades:', err);
      }
    };
    fetchGrades();
  }, [
    formData.tableWidth,
    formData.crown,
    formData.pavilionDepth,
    formData.shape,
    formData.halvesAngleAvg,
    session,
  ]);

  // Helper to update a single field
  const updateField = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate Halves Angle Avg if Min or Max changes
      if (field === 'halvesAngleMin' || field === 'halvesAngleMax') {
        const min = parseFloat(updated.halvesAngleMin);
        const max = parseFloat(updated.halvesAngleMax);
        if (!isNaN(min) && !isNaN(max)) {
          updated.halvesAngleAvg = ((min + max) / 2).toFixed(1);
        }
      }
      return updated;
    });
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
    setFileData(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processFileContent(text);
    };
    reader.readAsText(file);
  };

  const calculateFormData = (
    dataMap: Map<string, string>,
    shapeName: string,
  ) => {
    const config = SHAPE_LIBRARY[shapeName] || DEFAULT_CONFIG;

    // 2. Initialize new data object
    const newData: Record<string, string> = {};
    newData['shape'] = shapeName;

    if (dataMap.has('AZIMUTH')) newData['azimuth'] = dataMap.get('AZIMUTH')!;
    if (dataMap.has('SYMMETRY')) newData['symmetry'] = dataMap.get('SYMMETRY')!;

    // 3. Calculate derived metrics (Halves, CW Diff, etc.)
    Object.assign(newData, calculateDerivedMetrics(dataMap));

    // 4. Dynamic Field Mapping based on Config
    Object.entries(config.fields).forEach(([stateKey, rule]) => {
      if (rule.txtKey) {
        const rawVal = dataMap.get(rule.txtKey);
        if (rawVal) {
          const numVal = parseFloat(rawVal);
          if (!isNaN(numVal)) {
            const rounding =
              stateKey === 'pavilionCurve' ? 0.2 : rule.rounding || 1;
            newData[stateKey] = roundToStep(numVal, rounding);
          }
        }
      }
    });

    // 5. Execute custom post-processing if defined for this shape
    if (config.postProcess) {
      const processed = config.postProcess(dataMap, newData);
      Object.assign(newData, processed);
    }

    return newData;
  };

  const processFileContent = (text: string) => {
    const dataMap = parseTextFileToMap(text);

    setFileData(dataMap);

    // 1. Determine Shape
    const rawShape = dataMap.get('SHAPE') || 'Pear';
    let shapeName = rawShape;
    if (SHAPE_VARIANTS[rawShape]) {
      shapeName = SHAPE_VARIANTS[rawShape](dataMap);
    }

    const newData = calculateFormData(dataMap, shapeName);
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleShapeChange = (newShape: string) => {
    if (fileData) {
      const newData = calculateFormData(fileData, newShape);
      setFormData((prev) => ({ ...prev, ...newData }));
    } else {
      updateField('shape', newShape);
    }
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
  const shapeOptions = Object.keys(SHAPE_LIBRARY);
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
                onChange={(e) => handleShapeChange(e.target.value)}
                className={styles.modernSelect}
              >
                {/* Dynamically generate options */}
                {Array.from(new Set([...shapeOptions, formData.shape]))
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
                  disabled={true}
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
                        {calculatedGrades.kgs !== null
                          ? calculatedGrades.kgs
                          : '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {/* Grade Label */}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {calculatedGrades.bowtie !== null
                          ? calculatedGrades.bowtie
                          : '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        Ideal
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {calculatedGrades.feye !== null
                          ? calculatedGrades.feye
                          : '-'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {/* Grade Label */}
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
