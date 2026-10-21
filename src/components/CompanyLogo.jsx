import React, { useState } from 'react';
import brands from '../../shared/content/brand-art.json';
const key = name => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
export default function CompanyLogo({
  name = '',
  className = ''
}) {
  const [failed, setFailed] = useState(false);
  const normalized = key(name);
  const brand = brands.find(b => key(b.name) === normalized || b.slug === normalized || b.slug === 'amazon' && normalized.startsWith('amazon') || b.slug === 'walmart' && normalized.startsWith('walmart'));
  return <span className={'company-logo brand-logo ' + className} role="img" aria-label={name + (brand?.path && !failed ? ' logo' : ' company')} style={{
    '--brand-color': '#' + (brand?.color || '6336d8')
  }}>{brand?.path && !failed ? <img src={brand.path} alt="" width="32" height="32" loading="lazy" onError={() => setFailed(true)} /> : <span>{name.split(/\s+/).map(s => s[0]).slice(0, 2).join('') || 'Co'}</span>}</span>;
}
