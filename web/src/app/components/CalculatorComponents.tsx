import React from 'react';
import styles from '../app.module.css';

export const DisplayRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
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

export const SelectRow = ({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  options: (string | number)[];
  disabled?: boolean;
}) => {
  // Ensure options come first so selected value doesn't jump to top unless it's the first option
  const uniqueOptions = Array.from(
    new Set([...options, value].map((v) => String(v))),
  ).filter((v) => v !== '' && v !== 'undefined' && v !== 'null');

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
      <span className={styles.rowLabel}>{label}</span>
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className={styles.modernSelect}
        style={{
          width: '100%',
          minWidth: 0,
          backgroundColor: disabled ? '#f1f5f9' : '#fff',
          cursor: disabled ? 'not-allowed' : 'default',
        }}
        disabled={disabled}
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

export const MetricRow = ({
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
