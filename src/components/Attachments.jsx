import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Icon } from './ui.jsx';
export default function Attachments({
  assignmentId,
  value = [],
  onChange,
  readOnly = false
}) {
  const {
      request
    } = useStore(),
    input = useRef(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(event) {
    const file = event.target.files[0];
    if (!file) return;
    setError('');
    if (file.size > 5 * 1024 * 1024) {
      setError('Keep each file under 5 MB.');
      return;
    }
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 16384) binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      const result = await request('/api/files/upload', {
        assignmentId,
        name: file.name,
        base64: btoa(binary)
      });
      onChange([...value, result]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }
  return <section className="attachments"><strong>{readOnly ? 'Attached files' : 'Files and supporting evidence'}</strong><div>{value.map(file => <span key={file.id}><a href={'/api/files/' + file.id} target="_blank" rel="noreferrer"><Icon name="Paperclip" size={14} />{file.name || 'Download attachment'}</a>{!readOnly && <button type="button" aria-label={'Remove ' + file.name + ' from this draft'} onClick={() => onChange(value.filter(f => f.id !== file.id))}>×</button>}</span>)}</div>{!readOnly && <><input ref={input} type="file" hidden accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.zip,.docx" onChange={upload} /><Button variant="secondary" type="button" icon="Upload" disabled={busy || value.length >= 8} onClick={() => input.current.click()}>{busy ? 'Uploading…' : 'Attach a file'}</Button><p className="quiet-note">Up to eight files, 5 MB each. Files are private until submitted or published to an authorized audience. ZIPs are stored for download and are not executed or extracted.</p></>}{error && <p className="error-text" role="alert">{error}</p>}</section>;
}
