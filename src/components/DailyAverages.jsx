export default function DailyAverages({ dailyAverages, profiles, vacant }) {
  const recentDays = (dailyAverages || []).slice(-30);

  return (
    <div className="fade-in">
      <div className="section-title"><span className="dot" /> Daily Averages Database</div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
        Historical daily averages used by the predictive engine for accurate baseline generation.
      </p>
      
      {recentDays.length > 0 ? (
        <div className="card full-width daily-avg-table" style={{ marginBottom: 28 }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                {(profiles || []).slice(0, 5).map((p, i) => <th key={i}>{p.name}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map(day => (
                <tr key={day.date}>
                  <td>{day.date}</td>
                  {day.sensors.map((v, i) => <td key={i}>{v.toFixed(2)}A</td>)}
                  <td>{day.sensors.reduce((a, b) => a + b, 0).toFixed(2)}A</td>
                </tr>
              ))}
            </tbody>
          </table>
          {vacant && (
            <div className="vacant-notice" style={{ marginTop: '16px' }}>
              Near-zero current detected. Household appears vacant. Duration goal validated as Achievable.
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)' }}>No historical data collected yet. Check back tomorrow.</p>
      )}
    </div>
  );
}
