import React from 'react';
export const productIcons = {
  LayoutDashboard: 'SquaresFour',
  Map: 'Path',
  Route: 'Path',
  Code2: 'CodeBlock',
  BookOpen: 'Books',
  Briefcase: 'Briefcase',
  Users: 'UsersThree',
  CalendarDays: 'CalendarStar',
  ChartNoAxesCombined: 'ChartLineUp',
  GraduationCap: 'GraduationCap',
  Brain: 'Brain',
  Database: 'Database',
  Rocket: 'RocketLaunch',
  Trophy: 'Trophy',
  Flame: 'Flame',
  Compass: 'Compass',
  Target: 'Target',
  MessageCircle: 'ChatsCircle',
  MessagesSquare: 'ChatsCircle',
  Bell: 'BellRinging',
  Award: 'Certificate',
  Blocks: 'Stack',
  ShieldCheck: 'ShieldCheck',
  Cloud: 'Cloud',
  Braces: 'FileCode',
  Plug: 'PlugsConnected',
  AudioLines: 'MicrophoneStage'
};
export default function ProductIcon({
  name,
  size = 18,
  ...props
}) {
  const id = productIcons[name];
  return id ? <svg width={size} height={size} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false" {...props}><use href={"/icons/product.svg#" + id} /></svg> : null;
}
