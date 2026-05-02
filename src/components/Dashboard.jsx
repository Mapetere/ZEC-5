import { useMemo } from 'react';
import Chart from 'react-apexcharts';

/**
 * Dashboard — Behavioral monitoring with 5 sensor gauges, charts, and inference alerts.
 */
export default function Dashboard({ sensors, history, alerts, profiles, onShedLoad }) {
  const sensorCards = useMemo(() => {
    return (profiles || []).map((p, i) => {
      const val = sensors?.[i] ?? 0;
      const pct = Math.min((val / (p.base * 3)) * 100, 100);
      const level = val > p.base * 2 ? 'danger' : val > p.base * 1.5 ? 'warning' : 'normal';
      return { ...p, val, pct, level, index: i };
    });
  }, [sensors, profiles]);

  const chartOptions = useMemo(() => ({
    chart: {
      type: 'area',
      sparkline: { enabled: false },
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: true, easing: 'easeinout', speed: 600 },
    },
    grid: {
      borderColor: '#1E2738',
      strokeDashArray: 4,
      padding: { top: 0, right: 4, bottom: 0, left: 4 },
    },
    xaxis: {
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: '#5A6478', fontSize: '10px', fontFamily: 'Orbitron' },
        formatter: (v) => v.toFixed(1),
      },
      min: 0,
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.02, stops: [0, 100] },
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v) => `${v.toFixed(2)} A` },
    },
    colors: ['#00E5FF'],
    dataLabels: { enabled: false },
    legend: { show: false },
  }), []);

  return (
    <div className="fade-in">
      {/* Sensor Gauge Cards */}
      <div className="section-title"><span className="dot" /> Live Sensor Feeds</div>
      <div className="dashboard-grid three-col" style={{ marginBottom: 28 }}>
        {sensorCards.map((s) => (
          <div key={s.index} className="card gauge-card">
            <div className="card-header">
              <span className="card-title">{s.name}</span>
              <span className="card-badge">CH {s.index + 1}</span>
            </div>
            <div className="gauge-value">
              {s.val.toFixed(2)}
              <span className="unit">A</span>
            </div>
            <div className="gauge-bar-track">
              <div
                className={`gauge-bar-fill ${s.level}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      <div className="section-title"><span className="dot" /> Energy Fingerprints</div>
      <div className="card full-width" style={{ marginBottom: 28 }}>
        <Chart
          type="area"
          height={260}
          options={{
            ...chartOptions,
            colors: ['#00E5FF', '#39FF14', '#FFB300', '#FF3D00', '#9C27B0'],
            legend: {
              show: true,
              position: 'top',
              horizontalAlign: 'right',
              labels: { colors: '#8892A4' },
              fontFamily: 'Inter',
              fontSize: '11px',
            },
          }}
          series={(profiles || []).map((p, i) => ({
            name: p.name,
            data: history?.[i] || [],
          }))}
        />
      </div>

      {/* Inference / Alerts */}
      <div className="section-title"><span className="dot" /> Inference Engine</div>
      <div className="alerts-section">
        {(alerts || []).map((a) => (
          <div key={a.id} className={`alert-item ${a.type} slide-in`}>
            <div className="alert-icon">
              {a.type === 'danger' ? '⚠' : a.type === 'warning' ? '⚡' : 'ℹ'}
            </div>
            <div className="alert-text">
              <h4>{a.title}</h4>
              <p>{a.message}</p>
            </div>
            <span className="alert-time">{a.time}</span>
            {a.actionable && (
              <button
                className="alert-action"
                onClick={() => onShedLoad && onShedLoad(a.relayIndex)}
                id={`alert-shed-${a.relayIndex}`}
              >
                Shed Load
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
