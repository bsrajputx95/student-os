import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from '@phosphor-icons/react';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const names = ['SquaresFour', 'Path', 'CodeBlock', 'Books', 'Briefcase', 'UsersThree', 'CalendarStar', 'ChartLineUp', 'GraduationCap', 'Brain', 'Database', 'RocketLaunch', 'Trophy', 'Flame', 'Compass', 'Target', 'ChatsCircle', 'BellRinging', 'Certificate', 'FileCode', 'ShieldCheck', 'Cloud', 'Stack', 'PlugsConnected', 'MicrophoneStage'];
const symbols = names.map(name => {
  const svg = renderToStaticMarkup(React.createElement(icons[name + 'Icon'], {
    weight: 'duotone'
  }));
  const content = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  if (/<(?:script|image|foreignObject)|\bon\w+=|(?:https?:|data:)/i.test(content)) throw new Error('Unexpected active content in product icon');
  return `<symbol id="${name}" viewBox="0 0 256 256">${content}</symbol>`;
});
mkdirSync('public/icons', {
  recursive: true
});
writeFileSync('public/icons/product.svg', `<svg xmlns="http://www.w3.org/2000/svg"><!-- Phosphor Icons, MIT License; see LICENSE.txt. -->${symbols.join('')}</svg>\n`);
writeFileSync('public/icons/LICENSE.txt', readFileSync('node_modules/@phosphor-icons/react/LICENSE'));
console.log(JSON.stringify({
  symbols: names.length,
  bytes: Buffer.byteLength(symbols.join(''))
}));
