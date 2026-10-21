import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../lib/store.jsx';
const Campus = import.meta.hot?.data.campusContext || createContext(null);
if (import.meta.hot) import.meta.hot.data.campusContext = Campus;
export const useCampus = () => useContext(Campus);
export function CampusProvider({
  children
}) {
  const {
    request,
    toast,
    state
  } = useStore();
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [dialog, setDialog] = useState(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++sequence.current;
    try {
      const res = await fetch('/api/staff');
      const next = await res.json();
      if (!res.ok) throw new Error(next.error);
      if (sequence.current === ticket) {
        setData(next);
        setError('');
      }
      return next;
    } catch (e) {
      if (sequence.current === ticket) setError(e.message);
    }
  }, []);
  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener('studentos-update', handler);
    return () => window.removeEventListener('studentos-update', handler);
  }, [load, state.profile.id]);
  const mutate = async (type, payload, message) => {
    setBusy(true);
    try {
      const result = await request('/api/staff/action', {
        type,
        payload
      });
      await load();
      if (message) toast(message);
      return result.result;
    } catch (e) {
      toast(e.message, 'error');
      throw e;
    } finally {
      setBusy(false);
    }
  };
  return <Campus.Provider value={{
    data,
    error,
    busy,
    load,
    mutate,
    dialog,
    setDialog
  }}>{children}</Campus.Provider>;
}
