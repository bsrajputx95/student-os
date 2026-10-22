import SubjectArt from './SubjectArt.jsx';
import ProfileImage from './ProfileImage.jsx';
import { taskLocation } from '../../shared/navigation.js';
import React, { useEffect, useRef } from 'react';
import { ClipboardCheck, LogOut, Mail, MessagesSquare, Paperclip, RefreshCw, ShieldCheck, Upload, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, AudioLines, Award, BadgeCheck, Bell, Blocks, Bookmark, BookmarkCheck, BookOpen, Braces, Brain, Briefcase, CalendarCheck, CalendarDays, CalendarHeart, CalendarRange, ChartNoAxesCombined, ChartPie, Check, CheckCheck, ChevronLeft, ChevronRight, ChevronsUpDown, Circle, CircleCheck, CircleDashed, CircleHelp, Clock3, Cloud, Code2, Coffee, Compass, Contact, Database, Download, FileUser, Flag, Flame, GitBranch, Globe2, GraduationCap, Heart, Info, LayoutDashboard, Lightbulb, ListChecks, Map, MapPin, Megaphone, Menu, MessageCircle, MessageSquare, MessageSquarePlus, Network, NotebookPen, PanelsTopLeft, PartyPopper, Pencil, Play, Plug, Plus, Rocket, RotateCcw, Route, Search, Send, Settings, Shuffle, SlidersHorizontal, Sparkles, Sprout, Sun, Target, Ticket, TrendingUp, Trophy, Users, X } from 'lucide-react';
const Icons = {
  ClipboardCheck,
  LogOut,
  Mail,
  MessagesSquare,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Upload,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  AudioLines,
  Award,
  BadgeCheck,
  Bell,
  Blocks,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Braces,
  Brain,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CalendarHeart,
  CalendarRange,
  ChartNoAxesCombined,
  ChartPie,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleHelp,
  Clock3,
  Cloud,
  Code2,
  Coffee,
  Compass,
  Contact,
  Database,
  Download,
  FileUser,
  Flag,
  Flame,
  GitBranch,
  Globe2,
  GraduationCap,
  Heart,
  Info,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Map,
  MapPin,
  Megaphone,
  Menu,
  MessageCircle,
  MessageSquare,
  MessageSquarePlus,
  Network,
  NotebookPen,
  PanelsTopLeft,
  PartyPopper,
  Pencil,
  Play,
  Plug,
  Plus,
  Rocket,
  RotateCcw,
  Route,
  Search,
  Send,
  Settings,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Ticket,
  TrendingUp,
  Trophy,
  Users,
  X
};
import { useStore, navigate, yearLabel } from '../lib/store.jsx';
import ActivityCalendar from './ActivityCalendar.jsx';
import { getPath } from '../../shared/paths.js';
export function Icon({
  name,
  size = 18,
  ...props
}) {
  const C = Icons[name] || Icons.Circle;
  return <C size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
}
export function Button({
  children,
  icon,
  variant = 'primary',
  className = '',
  ...props
}) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}{icon && <Icon name={icon} size={16} />}</button>;
}
export function IconButton({
  name,
  label,
  ...props
}) {
  return <button className="icon-btn" aria-label={label} title={label} {...props}><Icon name={name} /></button>;
}
export function Badge({
  children,
  color = 'purple',
  className = ''
}) {
  return <span className={`badge badge-${color} ${className}`}>{children}</span>;
}
export function Avatar({
  person,
  size = 'md',
  onClick
}) {
  const {
    state
  } = useStore();
  const p = person === 'me' ? state.profile : typeof person === 'string' ? (state.communityPeople || []).find(x => x.id === person) || state.catalog.people.find(x => x.id === person) : person;
  const me = p?.id === 'me' || p?.id === state.profile.id;
  const Tag = onClick ? 'button' : 'span';
  return <Tag className={`avatar avatar-${size} tone-${p?.color || 'purple'}`} onClick={onClick} aria-label={onClick ? `View ${me ? state.profile.name : p?.name || 'student'}'s profile` : undefined}>{me ? state.profile.name.split(' ').map(x => x[0]).slice(0, 2).join('') : p?.initials || 'SO'}<ProfileImage person={me ? state.profile : p} /></Tag>;
}
export function PersonName({
  person,
  compact = false
}) {
  const {
    state,
    setModal
  } = useStore();
  const p = typeof person === 'string' ? state.catalog.people.find(x => x.id === person) : person;
  if (!p) return null;
  return <div className="person-info"><button className="person-name" onClick={() => setModal({
      type: 'profile',
      id: p.id
    })}>{p.id === 'me' ? state.profile.name : p.name}<span className={`year-tag year-${p.id === 'me' ? state.profile.year : p.year}`}>{yearLabel(p.id === 'me' ? state.profile.year : p.year)}</span></button>{!compact && <small>@{p.id === 'me' ? state.profile.handle : p.handle}</small>}</div>;
}
export function Progress({
  value,
  color = 'purple'
}) {
  return <div className={`progress-track progress-${color}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><span style={{
      width: `${Math.min(100, Math.max(0, value))}%`
    }} /></div>;
}
export function Ring({
  value,
  size = 110,
  color = '#7e6bdf',
  label,
  children
}) {
  const r = 42,
    c = 2 * Math.PI * r;
  return <div className="ring" style={{
    width: size,
    height: size
  }}><svg viewBox="0 0 100 100" aria-label={label || `${value}%`}><circle cx="50" cy="50" r={r} fill="none" stroke="#eeedf5" strokeWidth="8" /><circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8" strokeDasharray={`${value / 100 * c} ${c}`} strokeLinecap="round" transform="rotate(-90 50 50)" /></svg><div>{children || <><strong>{value}<small>%</small></strong><span>readiness</span></>}</div></div>;
}
export function SectionHead({
  title,
  subtitle,
  action,
  onAction
}) {
  return <div className="section-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action && <button className="text-link" onClick={onAction}>{action}<Icon name="ArrowUpRight" size={15} /></button>}</div>;
}
export function PageHead({
  eyebrow,
  title,
  description,
  children
}) {
  return <div className="page-head"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div><div className="page-head-actions">{children}</div></div>;
}
export function Tabs({
  items,
  value,
  onChange
}) {
  return <div className="tabs" role="tablist">{items.map(item => {
      const x = typeof item === 'string' ? {
        id: item,
        label: item
      } : item;
      return <button role="tab" aria-selected={value === x.id} key={x.id} onClick={() => onChange(x.id)} className={value === x.id ? 'active' : ''}>{x.icon && <Icon name={x.icon} size={16} />} {x.label}{x.count !== undefined && <span>{x.count}</span>}</button>;
    })}</div>;
}
export function Empty({
  icon = 'Sprout',
  title,
  description,
  action,
  onAction
}) {
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={30} /></span><h3>{title}</h3><p>{description}</p>{action && <Button onClick={onAction}>{action}</Button>}</div>;
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  className = ''
}) {
  const ref = useRef(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = ref.current;
    const focusables = () => [...el.querySelectorAll('button:not([disabled]),a[href],input,textarea,select,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    focusables()[0]?.focus();
    const key = e => {
      if (e.key === 'Escape') close.current();
      if (e.key === 'Tab') {
        const items = focusables(),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, []);
  return <div className="modal-backdrop" onMouseDown={e => {
    if (e.target === e.currentTarget) onClose();
  }}><section ref={ref} className={`modal ${wide ? 'modal-wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-label={title}><header className="modal-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><IconButton name="X" label="Close dialog" onClick={onClose} /></header><div className="modal-body">{children}</div></section></div>;
}
export function CourseArt({
  type = 'react',
  small = false
}) {
  return <div className={`course-art subject-course-art art-${type} ${small ? "art-small" : ""}`} aria-hidden="true"><SubjectArt type={type} /></div>;
}
export function JourneyArt({
  large = false
}) {
  return <svg className={`journey-art ${large ? 'large' : ''}`} viewBox="0 0 420 240" fill="none" aria-label="A student travelling along a path toward a flag"><defs><linearGradient id="hill" x1="60" y1="180" x2="350" y2="80" gradientUnits="userSpaceOnUse"><stop stopColor="#c8c5f0" /><stop offset="1" stopColor="#e1dcfa" /></linearGradient><linearGradient id="road" x1="40" y1="210" x2="380" y2="80"><stop stopColor="#aca0e6" /><stop offset="1" stopColor="#d5cff4" /></linearGradient></defs><ellipse cx="233" cy="205" rx="169" ry="22" fill="#c5c1ed" opacity=".27" /><path d="M55 197L150 95Q173 75 195 103L223 137L272 60Q293 35 316 67L392 193Z" fill="url(#hill)" /><path d="M150 96L169 117L182 98L195 103Q173 75 150 96" fill="#f8f6ff" /><path d="M273 61L289 81L303 68L316 67Q293 35 273 61" fill="#fbfaff" /><path d="M81 208C117 170 216 210 232 173C244 145 195 149 218 124C236 103 285 138 301 99C306 88 299 82 297 75" stroke="#faf8ff" strokeWidth="23" strokeLinecap="round" /><path d="M81 208C117 170 216 210 232 173C244 145 195 149 218 124C236 103 285 138 301 99C306 88 299 82 297 75" stroke="url(#road)" strokeWidth="2" strokeDasharray="5 7" /><path d="M300 58V23" stroke="#8573cf" strokeWidth="3" strokeLinecap="round" /><path d="M302 22L335 30L302 42Z" fill="#f2ac81" /><circle cx="83" cy="58" r="19" fill="#fff" opacity=".65" /><path d="M73 59l7 7 13-15" stroke="#a59bdd" strokeWidth="3" strokeLinecap="round" /><path d="M352 107h10m-5-5v10M120 35h8m-4-4v8" stroke="#b4a9e8" strokeWidth="2" strokeLinecap="round" /><path d="M48 156c8-16 20-11 20-4 6-12 22-4 18 6H45" fill="#fff" opacity=".7" /><path d="M340 174l7-21 7 21Z" fill="#a6bba9" /><path d="M347 175v11" stroke="#829a88" strokeWidth="2" /><ellipse cx="196" cy="190" rx="24" ry="7" fill="#a99bda" opacity=".32" /><path d="M188 153l-6 31m17-31 7 30" stroke="#5d518e" strokeWidth="8" strokeLinecap="round" /><path d="M179 133c0-11 27-12 29 0l-3 26h-24Z" fill="#8273cb" /><path d="M180 137l-9 12m34-12 9 5" stroke="#e8ba9e" strokeWidth="7" strokeLinecap="round" /><rect x="193" y="127" width="17" height="24" rx="7" fill="#f0ab80" /><circle cx="191" cy="116" r="12" fill="#edc2a6" /><path d="M179 114c0-18 27-17 26 1l-9-2-3-7-5 6Z" fill="#4f4669" /><path d="M176 185h10m17 0h10" stroke="#4d426f" strokeWidth="6" strokeLinecap="round" /><circle cx="375" cy="42" r="3" fill="#b8a8e4" /><circle cx="137" cy="148" r="3" fill="#b8a8e4" /></svg>;
}
export function Heatmap(props) {
  return <ActivityCalendar {...props} />;
}
export function TaskRow({
  task,
  onOpen
}) {
  const {
    act
  } = useStore();
  return <div className={`task-row ${task.status === 'completed' ? 'task-done' : ''}`}><button aria-label={task.status === 'completed' ? `${task.title} completed` : `Complete ${task.title}`} className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => {
      if (task.status !== 'completed' && !['event', 'campus-event', 'manual'].includes(task.kind)) {
        onOpen?.(task);
        return;
      }
      if (task.status !== 'completed') act('task.complete', {
        id: task.id
      }, `Activity recorded. +${task.xp} XP`).catch(() => {});
    }}>{task.status === 'completed' && <Icon name="Check" size={13} />}</button><button className="task-main" onClick={() => onOpen?.(task)}><strong>{task.title}</strong><span><Badge color={task.category === 'DSA' ? 'purple' : task.category === 'Backend' ? 'peach' : task.category === 'Communication' ? 'mint' : 'blue'}>{task.category}</Badge><span><Icon name="Clock3" size={12} />{task.minutes} min</span></span></button><span className="task-xp">+{task.xp} XP</span><IconButton name="ArrowUpRight" label={`Open ${task.title}`} onClick={() => onOpen?.(task)} /></div>;
}
export function taskDestination(task, setModal) {
  const target = taskLocation(task);
  if (target.route) navigate(target.route);else setModal(target);
}
export function WeekStreak() {
  const {
    state
  } = useStore();
  const current = todayDate();
  const base = new Date(current + 'T12:00:00');
  const offset = (base.getDay() + 6) % 7;
  return <div className="week-streak">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((name, i) => {
      const date = new Date(base);
      date.setDate(date.getDate() - offset + i);
      const key = date.toLocaleDateString('en-CA');
      const active = state.activity.some(a => a.date === key && a.count > 0),
        isToday = key === current;
      return <div key={i}><span>{name}</span><i className={isToday ? 'week-today' : active ? 'week-checked' : ''}>{isToday ? <Icon name="Flame" size={12} /> : active ? <Icon name="Check" size={12} /> : <span />}</i></div>;
    })}</div>;
}
function todayDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}
