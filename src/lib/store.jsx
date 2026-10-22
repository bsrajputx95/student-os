import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import catalogUrl from 'virtual:studentos-catalog-url';
import { mergePublicCatalog } from '../../shared/public-catalog.js';
import { readApiResponse } from './http-response.js';
import { browserWorkspaceCache, cacheIdentity, validWorkspace } from './workspace-cache.js';
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
    [assistant, setAssistant] = useState(null),
    [savedView, setSavedView] = useState(false);
  const catalog = useRef(null),
    catalogRequest = useRef(null),
    stateRequest = useRef(null),
    epoch = useRef(0),
    cache = useRef(null),
    liveReady = useRef(false),
    readOnly = useRef(false);
  if (!cache.current) cache.current = browserWorkspaceCache();
  const announceSession = useCallback(() => {
    try { window.localStorage.setItem('studentos-session-change', crypto.randomUUID()); } catch {}
  }, []);
  const resetLocal = useCallback(() => {
    epoch.current++;
    liveReady.current = false;
    readOnly.current = false;
    cache.current.clear();
    setSavedView(false);
    setModal(null);
    setAssistant(null);
    setState({ sessionRequired: true, version: 0, catalog: catalog.current });
  }, []);
  const toast = useCallback((message, tone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, {
      id,
      message,
      tone
    }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
  }, []);
  const openModal = useCallback(value => {
    if (value && readOnly.current) {
      toast('Your saved view is updating. Please try again when your live workspace is ready.', 'info');
      return;
    }
    setModal(value);
  }, [toast]);
  const loadCatalog = useCallback(async () => {
    if (catalog.current) return catalog.current;
    if (!catalogRequest.current) catalogRequest.current = fetch(catalogUrl).then(async res => {
      if (!res.ok) throw new Error('The content library could not load.');
      return catalog.current = await res.json();
    }).finally(() => {
      catalogRequest.current = null;
    });
    return catalogRequest.current;
  }, []);
  const refresh = useCallback(async () => {
    const ticket = epoch.current;
    try {
      if (!stateRequest.current || stateRequest.current.ticket !== ticket) {
        const entry = {
          ticket
        };
        entry.promise = fetch('/api/state', { cache: 'no-store', signal: AbortSignal.timeout(110000) }).then(readApiResponse).finally(() => {
          if (stateRequest.current === entry) stateRequest.current = null;
        });
        stateRequest.current = entry;
      }
      const [next, content] = await Promise.all([stateRequest.current.promise, loadCatalog()]);
      if (ticket !== epoch.current) return;
      liveReady.current = true;
      readOnly.current = false;
      setSavedView(false);
      if (next.sessionRequired) cache.current.clear();
      setState(previous => previous?.profile?.id === next.profile?.id && previous?.version > next.version ? previous : {
        ...next,
        catalog: mergePublicCatalog(content, next.catalogUpdates)
      });
      setError('');
      window.dispatchEvent(new Event('studentos-workspace-ready'));
      return true;
    } catch (err) {
      if (ticket === epoch.current) setError(err.message);
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
    const ticket = epoch.current;
    // A cookie-validated identity is required before any private saved view is shown.
    async function restore() {
      try {
        const record = await Promise.race([cache.current.read(), new Promise(resolve => setTimeout(() => resolve(null), 200))]);
        if (!record || stopped || liveReady.current || ticket !== epoch.current) return;
        const identity = await fetch('/api/session/identity', { cache: 'no-store', signal: AbortSignal.timeout(15000) }).then(readApiResponse);
        if (stopped || liveReady.current || ticket !== epoch.current) return;
        if (!validWorkspace(record, cacheIdentity(identity.profile))) {
          await cache.current.clear();
          return;
        }
        const content = await loadCatalog();
        if (stopped || liveReady.current || ticket !== epoch.current) return;
        readOnly.current = true;
        setSavedView(true);
        setState({ ...record.view, catalog: content });
      } catch { /* No cached private view is displayed without a verified session. */ }
      finally {
        if (!stopped && ticket === epoch.current) connect();
      }
    }
    restore();
    const expired = () => { resetLocal(); announceSession(); refresh(); };
    const accountChanged = event => {
      if (event.key !== 'studentos-session-change') return;
      resetLocal();
      refresh();
    };
    window.addEventListener('studentos-session-expired', expired);
    window.addEventListener('storage', accountChanged);
    return () => {
      stopped = true;
      clearTimeout(timer);
      window.removeEventListener('studentos-session-expired', expired);
      window.removeEventListener('storage', accountChanged);
    };
  }, [refresh, loadCatalog, resetLocal, announceSession]);
  useEffect(() => {
    if (state?.profile && !savedView) cache.current.save(state);
  }, [state, savedView]);
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
    if (readOnly.current && !['/api/session', '/api/invite/accept', '/api/session/end'].includes(url)) throw new Error('Your saved view is still updating. Reconnect and refresh before making changes.');
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(110000)
    }).catch(() => {
      throw new Error('The connection was interrupted. Refresh to check your saved work before trying again.');
    });
    if (res.status === 401) window.dispatchEvent(new Event('studentos-session-expired'));
    return readApiResponse(res);
  }, []);
  const startSession = async payload => {
    const ticket = ++epoch.current;
    await cache.current.clear();
    const next = await request(payload.mode === 'invite' ? '/api/invite/accept' : '/api/session', payload);
    const content = await loadCatalog();
    if (ticket !== epoch.current) return;
    liveReady.current = true;
    readOnly.current = false;
    setSavedView(false);
    setError('');
    window.dispatchEvent(new Event('studentos-workspace-ready'));
    setState({
      ...next,
      catalog: mergePublicCatalog(content, next.catalogUpdates)
    });
    announceSession();
    setModal(null);
    setAssistant(null);
    navigate(['teacher', 'placement', 'support', 'admin'].includes(next.profile?.role) ? '/staff/overview' : '/overview');
  };
  const endSession = async () => {
    epoch.current++;
    await cache.current.clear();
    const next = await request('/api/session/end', {});
    resetLocal();
    announceSession();
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
        catalog: mergePublicCatalog(catalog.current, data.state.catalogUpdates)
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
    savedView,
    error,
    refresh,
    act,
    toast,
    modal,
    setModal: openModal,
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
