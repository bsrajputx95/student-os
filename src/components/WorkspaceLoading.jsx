import React from 'react';
export default function WorkspaceLoading({ compact = false, error, retry }) {
  return <div className={'workspace-loading' + (compact ? ' compact' : '')} role="status" aria-live="polite">
    {!compact && <div className="loading-brand"><span className="brand-mark">s<sup>✦</sup></span><strong>studentos.</strong></div>}
    <p>{error || (compact ? 'Opening your workspace…' : 'Getting your learning workspace ready…')}</p>
    {error && <button className="btn primary" onClick={retry}>Try again</button>}
    <div className="loading-shape heading" /><div className="loading-shape subtitle" />
    <div className="loading-grid">{[0, 1, 2].map(i => <div className="loading-shape" key={i} />)}</div>
    <div className="loading-shape panel" /><span className="sr-only">Loading</span>
  </div>;
}
