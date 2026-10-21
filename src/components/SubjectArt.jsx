import React, { useId } from 'react';
const colors = {
  react: ['#35c9f3', '#175bea'],
  javascript: ['#ffd449', '#ee8b22'],
  sql: ['#4ce1bb', '#098b88'],
  dsa: ['#c799ff', '#7841ec'],
  python: ['#71b9ff', '#ffd447'],
  devops: ['#ffac80', '#ef5e66'],
  statistics: ['#c6a3ff', '#7b54ec'],
  'machine-learning': ['#ff91bc', '#bd4bdf'],
  analytics: ['#57e4df', '#168dcb'],
  linux: ['#a5c1ed', '#5d81c6'],
  networks: ['#83c2ff', '#6b64ed'],
  'system-design': ['#ffd092', '#e28c39']
};
const Wire = ({
  d,
  color = '#a9b8f1'
}) => <path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />;
const Tile = ({
  x,
  y,
  width = 60,
  height = 44,
  label,
  fill = '#f5f8ff',
  ink = '#344779'
}) => <g className="subject-tile"><rect x={x} y={y + 6} width={width} height={height} rx="9" fill="#0a1738" opacity=".2" /><rect x={x} y={y} width={width} height={height} rx="9" fill={fill} stroke="#ffffff8c" /><text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fontSize="14" fontWeight="800" fill={ink} fontFamily="monospace">{label}</text></g>;
const Cylinder = ({
  x = 124,
  y = 38,
  color = '#47dfb9'
}) => <g><path d={`M${x} ${y + 15}v66c0 22 76 22 76 0V${y + 15}`} fill={color} /><ellipse cx={x + 38} cy={y + 15} rx="38" ry="15" fill="#d1fff3" /><path d={`M${x} ${y + 42}c0 20 76 20 76 0M${x} ${y + 66}c0 20 76 20 76 0`} fill="none" stroke="#086d75" strokeWidth="3" opacity=".5" /><ellipse cx={x + 38} cy={y + 15} rx="25" ry="8" fill={color} /><path d={`M${x + 12} ${y + 35}v45`} stroke="#ffffff91" strokeWidth="4" strokeLinecap="round" /></g>;
const Cube = ({
  x,
  y,
  color = '#ffbf8e'
}) => <g><path d={`M${x} ${y}l27-15 27 15-27 16Z`} fill="#ffdfbf" /><path d={`M${x} ${y}l27 16v33l-27-16Z`} fill={color} /><path d={`M${x + 27} ${y + 16}l27-16v33l-27 16Z`} fill="#d76b65" /><path d={`M${x + 7} ${y + 7}l12 7v12l-12-7Z`} fill="#fff" opacity=".65" /></g>;
export default function SubjectArt({
  type = 'javascript',
  className = ''
}) {
  const id = 'subject-' + useId().replace(/:/g, '');
  const [accent, secondary] = colors[type] || colors.javascript;
  let scene;
  if (type === 'react') scene = <><g stroke={accent} fill="none" strokeWidth="5"><ellipse cx="161" cy="86" rx="75" ry="27" /><ellipse cx="161" cy="86" rx="75" ry="27" transform="rotate(60 161 86)" /><ellipse cx="161" cy="86" rx="75" ry="27" transform="rotate(120 161 86)" /></g><circle cx="161" cy="86" r="15" fill="#e6fbff" /><Tile x={35} y={106} width={68} height={34} label="props" /><Tile x={226} y={29} width={67} height={34} label="state" fill="#c6f5ff" /></>;else if (type === 'sql') scene = <><Wire d="M89 87h36M200 85h35v36" /><Cylinder color={accent} /><Tile x={29} y={66} label="JOIN" /><Tile x={224} y={113} width={69} height={34} label="rows" fill="#c7fff1" /><circle cx="231" cy="84" r="6" fill="#c7fff1" /></>;else if (type === 'dsa') scene = <><Wire d="M160 49v20M160 69H90v29M160 69h70v29M90 120v18M230 120v18" color="#d6b7ff" />{[[160, 35, 'n'], [90, 109, 'n/2'], [230, 109, 'n/2']].map(([x, y, text]) => <g key={x}><circle cx={x} cy={y + 5} r="23" fill="#412781" /><circle cx={x} cy={y} r="23" fill={x === 160 ? '#efe1ff' : accent} /><text x={x} y={y + 5} textAnchor="middle" fill="#45267b" fontSize="14" fontWeight="800" fontFamily="monospace">{text}</text></g>)}<Tile x={128} y={110} width={64} height={32} label="O(n)" /></>;else if (type === 'python') scene = <><path d="M107 87V55q0-24 24-24h47q22 0 22 22v23h-54v15h-28q-11 0-11-4Z" fill={accent} /><path d="M211 77v39q0 24-24 24h-47q-22 0-22-22V96h54V81h28q11 0 11-4Z" fill={secondary} /><circle cx="140" cy="46" r="4" fill="#133965" /><circle cx="180" cy="123" r="4" fill="#805b17" /><Tile x={38} y={92} width={57} height={33} label="def" /><Tile x={227} y={40} width={53} height={33} label="[ ]" /></>;else if (type === 'devops') scene = <><Wire d="M81 106h65v-42h66M161 106h66" color="#ffd2bd" /><Cube x={39} y={81} /><Cube x={127} y={44} /><Cube x={218} y={81} color="#ff9c92" /><circle cx="254" cy="39" r="15" fill="#e0ffdb" /><path d="m247 39 5 5 8-10" stroke="#29885d" strokeWidth="3" fill="none" strokeLinecap="round" /></>;else if (type === 'statistics') scene = <><path d="M48 133H278M60 133V38" stroke="#efe3ff" strokeWidth="2" opacity=".7" />{[24, 38, 69, 93, 69, 38, 24].map((height, i) => <rect key={i} x={80 + i * 24} y={133 - height} width="17" height={height} rx="4" fill={i === 3 ? '#f3e3ff' : accent} opacity={.45 + i * .06} />)}<path d="M72 126c30 0 29-90 89-90s58 90 98 90" stroke="#f6dcff" strokeWidth="3" fill="none" /><Tile x={212} y={19} width={58} height={33} label="μ ± σ" /></>;else if (type === 'machine-learning') scene = <>{[55, 95, 135].flatMap((y, i) => [44, 87, 130].map((z, j) => <Wire key={i + '-' + j} d={`M89 ${y} 160 ${z}`} color="#f8b7e4" />))}{[44, 87, 130].map((y, i) => <Wire key={i} d={`M160 ${y} 234 85`} color="#f8b7e4" />)}{[[85, 55], [85, 95], [85, 135], [160, 44], [160, 87], [160, 130], [235, 85]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y + 4} r="13" fill="#5e285c" /><circle cx={x} cy={y} r="13" fill={i === 6 ? '#fff0b9' : i > 2 ? '#ffd0e6' : accent} /></g>)}<Tile x={215} y={117} width={64} height={28} label="0.94" /></>;else if (type === 'analytics') scene = <><rect x="65" y="37" width="195" height="112" rx="11" fill="#0b4862" opacity=".4" /><rect x="61" y="29" width="195" height="112" rx="11" fill="#f0ffff" /><rect x="72" y="41" width="171" height="8" rx="4" fill="#b5dbe5" /><circle cx="108" cy="91" r="27" stroke="#a2e5e3" strokeWidth="12" fill="none" /><circle cx="108" cy="91" r="27" stroke={secondary} strokeWidth="12" strokeDasharray="105 170" transform="rotate(-90 108 91)" fill="none" />{[28, 42, 35, 57].map((h, i) => <rect key={i} x={151 + i * 21} y={118 - h} width="14" height={h} rx="4" fill={i === 3 ? '#126bd0' : accent} />)}<Tile x={222} y={96} width={61} height={34} label="+24%" fill="#d6fff3" ink="#087b64" /></>;else if (type === 'linux' || type === 'javascript') scene = <><rect x="64" y="38" width="195" height="110" rx="12" fill="#101c39" opacity=".4" /><rect x="59" y="29" width="195" height="110" rx="12" fill="#172a4a" stroke="#bdd5ff" strokeWidth="2" /><path d="M60 52h193" stroke="#627b9e" />{[76, 87, 98].map((x, i) => <circle key={x} cx={x} cy="41" r="3" fill={['#ff7e89', '#ffcf64', '#73dfbf'][i]} />)}<text x="77" y="86" fill={accent} fontFamily="monospace" fontSize="20" fontWeight="700">{type === 'linux' ? '$ tail -f' : 'const idea ='}<tspan x="77" dy="26" fill="#e7efff" fontSize="15">{type === 'linux' ? 'service.log' : 'build();'}</tspan></text><Tile x={224} y={94} width={53} height={47} label={type === 'linux' ? '$_' : 'JS'} fill={accent} ink="#2a3550" /></>;else if (type === 'networks') scene = <><g stroke="#bfdbff" fill="none" strokeWidth="2"><circle cx="160" cy="83" r="52" fill="#3d75ce" /><ellipse cx="160" cy="83" rx="22" ry="52" /><ellipse cx="160" cy="83" rx="52" ry="18" /><path d="M108 83h104M160 31v104" /></g><path d="M94 112c-67-72 172-108 142-28" stroke={accent} strokeWidth="4" fill="none" strokeDasharray="7 5" /><Tile x={36} y={105} width={65} height={34} label="DNS" /><Tile x={223} y={32} width={65} height={34} label="HTTPS" /><circle cx="235" cy="87" r="6" fill="#fff3af" /></>;else scene = <><Wire d="M90 57h46v55h81M136 57h81M136 112H90" color="#ffd9ae" /><Tile x={32} y={36} label="API" fill="#fff1db" /><Tile x={32} y={92} label="WEB" fill="#ffe6bd" /><Tile x={214} y={35} width={69} label="CACHE" fill="#ffce8e" /><Tile x={214} y={93} width={69} label="QUEUE" fill="#fff1db" /><rect x="118" y="65" width="37" height="35" rx="9" fill="#f5a84b" stroke="#ffedcf" strokeWidth="2" /></>;
  return <svg className={'subject-art ' + className} viewBox="0 0 320 180" fill="none" aria-hidden="true"><defs><radialGradient id={id}><stop stopColor={accent} stopOpacity=".32" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient></defs><ellipse cx="160" cy="91" rx="142" ry="86" fill={'url(#' + id + ')'} /><ellipse cx="161" cy="155" rx="104" ry="11" fill="#0d173d" opacity=".18" /><g className="subject-scene">{scene}</g><g fill="#fff1bd"><path d="m284 101 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" /><circle cx="45" cy="45" r="2.5" /><circle cx="275" cy="144" r="2" /></g></svg>;
}
