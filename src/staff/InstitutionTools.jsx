import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Badge } from '../components/ui.jsx';
export default function InstitutionTools() {
  const {
      request
    } = useStore(),
    [csv, setCsv] = useState('email,role,department\n'),
    [preview, setPreview] = useState(null),
    [links, setLinks] = useState([]),
    [json, setJson] = useState('[]'),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function action(path, p, done) {
    setBusy(true);
    setError('');
    try {
      done(await request(path, p));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return <section className="card admin-panel"><h2>Institution imports</h2><details><summary>Import a roster through individual invitations</summary><p>CSV headers: email, role, department. Preview validates all rows before any invitation is created.</p><textarea aria-label="Roster CSV" rows={7} value={csv} onChange={e => {
        setCsv(e.target.value);
        setPreview(null);
      }} /><Button variant="secondary" disabled={busy} onClick={() => action('/api/admin/roster', {
        csv,
        preview: true
      }, setPreview)}>Validate roster</Button>{preview && <><p>{preview.rows.length} valid invitation recipients</p><Button disabled={busy} onClick={() => action('/api/admin/roster', {
          csv
        }, r => {
          setLinks(r.invitations);
          setPreview(null);
        })}>Create these invitations</Button></>}{links.map(l => <p key={l.email}>{l.email} · {l.role}<input readOnly value={l.url} aria-label={'Invitation for ' + l.email} /></p>)}</details><details><summary>Import authorized opportunity records</summary><p>Use an array of sourced records with company, title, description, eligibility, country, location, sourceUrl, type, years, skills, and requirements. Reimporting a source URL updates its existing record.</p><textarea aria-label="Opportunity JSON" rows={9} value={json} onChange={e => setJson(e.target.value)} /><Button disabled={busy} onClick={() => {
        try {
          action('/api/admin/opportunities', {
            rows: JSON.parse(json)
          }, r => setError(r.imported + ' opportunities imported. Reload to refresh the catalog.'));
        } catch (e) {
          setError(e.message);
        }
      }}>Import sourced records</Button><Button variant="secondary" disabled={busy} onClick={() => action('/api/admin/opportunities/refresh', {}, () => setError('Authorized feed refresh queued. Check delivery status below.'))}>Refresh configured feed</Button></details>{error && <p role="status">{error}</p>}</section>;
}
