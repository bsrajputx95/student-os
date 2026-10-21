import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
const Store = import.meta.hot?.data.context || createContext(null);
if (import.meta.hot) import.meta.hot.data.context = Store;
export function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({
    top: 0,
    behavior: 'instant'
  });
}
export function useRoute() {
  const [path, setPath] = useState(window.location.pathname + window.location.search);
  useEffect(() => {
    const update = () => setPath(window.location.pathname + window.location.search);
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return [path, navigate];
}
export function useStore() {
  return useContext(Store);
}
export function Provider({
  children
}) {
  const [state, setState] = useState(null),
    [error, setError] = useState(''),
    [toasts, setToasts] = useState([]),
    [modal, setModal] = useState(null),
    [assistant, setAssistant] = useState(null);
  const catalog = useRef(null),
    epoch = useRef(0);
  const toast = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, {
      id,
      message,
      tone
    }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const loadCatalog = useCallback(async () => {
    if (!catalog.current) {
      const res = await fetch('/api/catalog');
      if (!res.ok) throw new Error('The content library could not load.');
      catalog.current = await res.json();
    }
    return catalog.current;
  }, []);
  const refresh = useCallback(async () => {
    const ticket = epoch.current;
    try {
      const [res, content] = await Promise.all([fetch('/api/state'), loadCatalog()]);
      if (!res.ok) throw new Error('The workspace could not be loaded.');
      const next = await res.json();
      if (ticket !== epoch.current) return;
      setState(previous => previous?.profile?.id === next.profile?.id && previous?.version > next.version ? previous : {
        ...next,
        catalog: content
      });
      setError('');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [loadCatalog]);
  useEffect(() => {
    let stopped = false,
      timer;
    async function connect(attempt = 0) {
      const ok = await refresh();
      if (!ok && !stopped && attempt < 5) timer = setTimeout(() => connect(attempt + 1), Math.min(10000, 1000 * 2 ** attempt));
    }
    connect();
    const expired = () => refresh();
    window.addEventListener('studentos-session-expired', expired);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('studentos-session-expired', expired);
    };
  }, [refresh]);
  const profileId = state?.profile?.id;
  const realtimeTransport = state?.realtimeTransport;
  useEffect(() => {
    if (!profileId) return;
    if (realtimeTransport === 'poll') {
      const update = () => {
        if (document.visibilityState !== 'visible') return;
        refresh();
        window.dispatchEvent(new Event('studentos-update'));
      };
      const timer = setInterval(update, 30000);
      window.addEventListener('focus', update);
      return () => {
        clearInterval(timer);
        window.removeEventListener('focus', update);
      };
    }
    const stream = new EventSource('/api/events');
    stream.onmessage = () => {
      refresh();
      window.dispatchEvent(new Event('studentos-update'));
    };
    return () => stream.close();
  }, [profileId, realtimeTransport, refresh]);
  const request = useCallback(async (url, payload) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.status === 401) window.dispatchEvent(new Event('studentos-session-expired'));
    if (!res.ok) throw new Error(data.error || 'This request failed.');
    return data;
  }, []);
  const startSession = async payload => {
    epoch.current++;
    const next = await request(payload.mode === 'invite' ? '/api/invite/accept' : '/api/session', payload);
    setState({
      ...next,
      catalog: await loadCatalog()
    });
    setModal(null);
    setAssistant(null);
    navigate(['teacher', 'placement', 'support', 'admin'].includes(next.profile?.role) ? '/staff/overview' : '/overview');
  };
  const endSession = async () => {
    epoch.current++;
    const next = await request('/api/session/end', {});
    setModal(null);
    setAssistant(null);
    setState({
      ...next,
      catalog: catalog.current
    });
    navigate('/login');
  };
  const act = useCallback(async (type, payload = {}, message) => {
    const ticket = epoch.current;
    try {
      const data = await request('/api/action', {
        type,
        payload
      });
      if (ticket === epoch.current) setState(previous => previous?.profile?.id === data.state.profile?.id && previous?.version > data.state.version ? previous : {
        ...data.state,
        catalog: catalog.current
      });
      if (message) toast(message);
      return data.result;
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }, [toast, request]);
  return <Store.Provider value={{
    state,
    error,
    refresh,
    act,
    toast,
    modal,
    setModal,
    assistant,
    setAssistant,
    startSession,
    endSession,
    request
  }}>{children}<div className="toast-stack" aria-live="polite">{toasts.map(t => <div key={t.id} className={'toast ' + t.tone}><span>{t.tone === 'error' ? '!' : '✓'}</span>{t.message}</div>)}</div></Store.Provider>;
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
export function yearLabel(year) {
  return year + ['', 'st', 'nd', 'rd', 'th'][year] + ' year';
}
export function niceDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}
