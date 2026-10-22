import React, { useEffect, useState } from 'react';
import { useStore } from '../lib/store.jsx';
export default function CacheStatus() {
  const { savedView, error, refresh } = useStore();
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    const ready = event => setUpdate(() => event.detail);
    window.addEventListener('studentos-app-update', ready);
    return () => window.removeEventListener('studentos-app-update', ready);
  }, []);
  if (!savedView && !update) return null;
  return <div className="cache-status" role="status" data-testid="cache-status">
    <span className={savedView ? 'cache-pulse' : 'cache-ready'} />
    <span>{savedView ? error ? 'Saved view · connection interrupted. Changes need a live connection.' : 'Saved view · updating your progress…' : 'A new version of StudentOS is ready.'}</span>
    {savedView && error ? <button onClick={refresh}>Retry</button> : update && !savedView ? <button onClick={update}>Reload</button> : null}
  </div>;
}
