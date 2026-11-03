export default function PassportTrackSelector({ track, onChange }) {
  return <nav className="ip-scope-switch" aria-label="學習護照類型"><button type="button" aria-pressed={track === 'pgy'} onClick={() => onChange('pgy')}>PGY 藥師護照</button><button type="button" aria-pressed={track === 'intern'} onClick={() => onChange('intern')}>實習生護照</button></nav>;
}
