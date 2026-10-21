import SubjectArt from '../components/SubjectArt.jsx';
import React, { useState, useMemo, useEffect } from 'react';
import { useStore, navigate, today } from '../lib/store.jsx';
import { PageHead, Button, Icon, Badge, Tabs, Progress, Empty } from '../components/ui.jsx';
import AssessmentLab from './AssessmentLab.jsx';
import TrustedPractice from '../components/TrustedPractice.jsx';
import CollegeChallenges from '../components/CollegeChallenges.jsx';
import InterviewStudio from '../components/InterviewStudio.jsx';
import CompanyLogo from '../components/CompanyLogo.jsx';
import { practiceRoles, recommendedRole, practiceScope, matchesPracticeProblem, matchesPracticeQuiz } from '../../shared/practice-roles.js';
const validTabs = ['coding', 'assessments', 'judged', 'quizzes', 'companies', 'challenges', 'interview'];
export default function Practice() {
  const {
    state,
    setModal,
    act
  } = useStore();
  const params = new URLSearchParams(location.search);
  const [tab, setTab] = useState(validTabs.includes(params.get('tab')) ? params.get('tab') : 'coding');
  const [selection, setSelection] = useState(() => ({
    ...{
      roleId: recommendedRole(state.profile).id,
      level: 'auto',
      focus: 'recommended'
    },
    ...state.practicePreferences,
    ...(params.get('role') === 'all' || practiceRoles.some(r => r.id === params.get('role')) ? {
      roleId: params.get('role')
    } : {})
  }));
  const [query, setQuery] = useState(''),
    [difficulty, setDifficulty] = useState('All difficulties'),
    [topic, setTopic] = useState('All topics'),
    [page, setPage] = useState(0),
    [onlyUnsolved, setOnlyUnsolved] = useState(false),
    [error, setError] = useState(''),
    [saving, setSaving] = useState(false);
  const scope = practiceScope(state, selection);
  const completed = new Set([...state.solved, ...(state.practiceCompleted || [])]);
  const roleProblems = useMemo(() => state.catalog.problems.filter(p => matchesPracticeProblem(p, scope)), [state.catalog, selection.roleId, selection.level, selection.focus, state.profile.year, state.metrics]);
  const topics = [...new Set(roleProblems.flatMap(p => p.topics))].sort();
  const problems = roleProblems.filter(p => (p.title + ' ' + p.number).toLowerCase().includes(query.toLowerCase()) && (difficulty === 'All difficulties' || p.difficulty === difficulty) && (topic === 'All topics' || p.topics.includes(topic)) && (!onlyUnsolved || !completed.has(p.id)));
  const quizzes = state.catalog.quizzes.filter(q => matchesPracticeQuiz(q, scope)).toSorted((a, b) => Number(Boolean(b.roleId)) - Number(Boolean(a.roleId)));
  const [companyQuery, setCompanyQuery] = useState('');
  const companies = state.catalog.companies.filter(c => (scope.all || scope.role.companies.includes(c.id) || c.roleIds?.includes(scope.role.id)) && [c.name, c.sector, c.focus].join(' ').toLowerCase().includes(companyQuery.toLowerCase()));
  const rows = problems.slice(page * 25, page * 25 + 25),
    pages = Math.ceil(problems.length / 25);
  useEffect(() => {
    const next = new URLSearchParams(location.search).get('tab');
    if (validTabs.includes(next)) setTab(next);
  }, [location.search]);
  useEffect(() => setPage(0), [query, difficulty, topic, onlyUnsolved, selection.roleId, selection.level]);
  function changeTab(value) {
    setTab(value);
    navigate('/practice?tab=' + value + '&role=' + selection.roleId);
  }
  function filter(key, value) {
    const next = {
      ...selection,
      [key]: value
    };
    setSelection(next);
    setTopic('All topics');
    setDifficulty('All difficulties');
    setError('');
    setSaving(true);
    act('practice.preferences', next).catch(e => setError(e.message)).finally(() => setSaving(false));
  }
  const open = p => setModal({
    type: p.external ? 'external-problem' : 'coding',
    id: p.id
  });
  const noMatches = <Empty title="No practice matches this combination." description="Choose All levels or All practice to widen this view." />;
  return <>
    <PageHead eyebrow="YOUR PRACTICE, WITH A PURPOSE" title="Build the skills for your next role." description="A focused place to solve, investigate, explain and get interview ready."><Badge color="mint"><Icon name="Flame" size={14} />{state.metrics.streak}-day streak</Badge></PageHead>
    <section className="practice-personalization card" aria-label="Personalize practice">
      <div className="practice-role-heading"><span className="role-icon"><Icon name="Compass" size={24} /></span><div><h2>Your practice lens</h2><p>Year {state.profile.year} · {scope.level} · {scope.all ? 'Explore every role' : scope.role.focus}</p></div><Badge color="blue">15 career profiles</Badge></div>
      <div className="practice-role-filters"><label>Target role<select aria-label="Practice target role" disabled={saving} value={selection.roleId} onChange={e => filter('roleId', e.target.value)}><option value="all">All practice · every role</option>{practiceRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Level<select aria-label="Practice level" disabled={saving} value={selection.level} onChange={e => filter('level', e.target.value)}><option value="auto">Auto · Year {state.profile.year}</option>{['All levels', 'Foundation', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}</select></label><label>Focus<select aria-label="Practice focus" disabled={saving} value={selection.focus} onChange={e => filter('focus', e.target.value)}><option value="recommended">Role essentials</option><option value="gaps">My skill gaps</option></select></label></div>
      <div className="practice-focus-row"><span><Icon name="Target" size={14} />{scope.all ? 'All preparation topics' : selection.focus === 'gaps' ? 'Focus next: ' + scope.weak.join(' + ') : scope.role.skills.join(' · ')}</span><small role="status">{saving ? 'Saving practice preferences…' : error ? 'Practice preferences were not saved.' : 'Saved to your profile · your main journey stays available'}</small></div>{error && <p role="alert">{error}</p>}
    </section>
    <Tabs items={[{
      id: 'coding',
      label: 'Problems',
      count: roleProblems.length
    }, {
      id: 'assessments',
      label: 'Assessment lab'
    }, {
      id: 'quizzes',
      label: 'Role quizzes',
      count: quizzes.length
    }, {
      id: 'interview',
      label: 'AI interview',
      icon: 'AudioLines'
    }, {
      id: 'judged',
      label: 'Server coding'
    }, {
      id: 'companies',
      label: 'Company prep',
      count: companies.length
    }, {
      id: 'challenges',
      label: 'College challenges'
    }]} value={tab} onChange={changeTab} />
    {!['interview', 'assessments', 'challenges'].includes(tab) && <section className="practice-role-hero"><div><span className="eyebrow">{scope.all ? 'BUILD YOUR FOUNDATIONS' : scope.role.name.toUpperCase() + ' · YOUR NEXT CHECKPOINT'}</span><h2>{scope.all ? 'Turn practice into a useful skill.' : scope.role.focus}</h2><p>{scope.all ? 'Choose a role above for relevant questions, labs, company resources and interview prompts.' : scope.role.interview}</p><div><Button onClick={() => setModal({
            type: 'quiz',
            id: scope.role.quizId
          })} icon="ArrowUpRight">Start role check</Button><Button variant="secondary" onClick={() => changeTab('interview')} icon="AudioLines">Practise an interview</Button></div></div><div className="practice-role-orbit" aria-hidden="true"><SubjectArt type={scope.role.courses[0] || "dsa"} /><span className="so-practice-caption">LEARN. BUILD. EXPLAIN.</span></div></section>}
    {tab === 'interview' ? <InterviewStudio initialRole={scope.role.name} /> : tab === 'assessments' ? <AssessmentLab scope={scope} /> : tab === 'judged' ? <TrustedPractice scope={scope} /> : tab === 'challenges' ? <CollegeChallenges scope={scope} /> : tab === 'coding' ? <div className="practice-layout"><section className="card problem-bank"><div className="section-head"><div><h2>Problem library</h2><p>{scope.all ? 'All practice topics' : scope.role.name + ' foundations'} · attributed LeetCode metadata and local exercises</p></div><Badge color="mint">{completed.size} practiced</Badge></div><div className="problem-filters"><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Find a problem" placeholder="Search title or number…" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Filter difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['All difficulties', 'Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}</select><select aria-label="Filter topic" value={topic} onChange={e => setTopic(e.target.value)}><option>All topics</option>{topics.map(t => <option key={t}>{t}</option>)}</select><label className="checkbox-filter"><input type="checkbox" checked={onlyUnsolved} onChange={e => setOnlyUnsolved(e.target.checked)} />To practice</label></div><div className="table-scroll"><table className="problem-table"><thead><tr><th aria-label="Status" /><th>Title</th><th>Difficulty</th><th>Acceptance</th><th>Practice</th></tr></thead><tbody>{rows.map(p => <tr key={p.id}><td><span className={'problem-status ' + (completed.has(p.id) ? 'solved' : '')}><Icon name={completed.has(p.id) ? 'CircleCheck' : 'Circle'} size={17} /></span></td><td><button onClick={() => open(p)}><strong>{p.number}. {p.title}</strong><small>{p.topics.slice(0, 3).join(' · ')}</small></button></td><td><Badge color={p.difficulty === 'Easy' ? 'mint' : p.difficulty === 'Medium' ? 'peach' : 'pink'}>{p.difficulty}</Badge></td><td>{p.acceptance}%</td><td><button className="problem-source" onClick={() => open(p)}>{p.external ? 'LeetCode' : 'Local editor'}<Icon name="ArrowUpRight" size={13} /></button></td></tr>)}</tbody></table></div>{!rows.length && noMatches}<div className="problem-pagination"><span>{problems.length ? `${page * 25 + 1}–${Math.min((page + 1) * 25, problems.length)} of ${problems.length.toLocaleString()}` : '0 results'}</span><div><Button variant="ghost" disabled={!page} onClick={() => setPage(page - 1)} aria-label="Previous problems"><Icon name="ChevronLeft" size={16} /></Button><span>Page {page + 1} / {Math.max(1, pages)}</span><Button variant="ghost" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next problems"><Icon name="ChevronRight" size={16} /></Button></div></div><p className="source-caption">Metadata checked {state.catalog.verifiedAt}. <a href="https://leetcode.com/problemset/" target="_blank" rel="noreferrer">Original library ↗</a> · External completions are self-reported.</p></section><aside className="practice-aside"><section className="card practice-role-study"><Badge color="blue">FOR YOUR ROLE</Badge><h3>Build the foundations</h3>{state.catalog.courses.filter(c => scope.all || scope.role.courses.includes(c.id)).slice(0, 4).map(c => <button key={c.id} onClick={() => setModal({
            type: 'course',
            id: c.id
          })}><span><strong>{c.title}</strong><small>{state.courseProgress[c.id] || 0} / {c.lessons} lessons</small></span><Icon name="ArrowUpRight" size={16} /></button>)}</section><section className="card practice-study"><h3>Keep it connected</h3><button onClick={() => changeTab('interview')}>AI interview practice<Icon name="ArrowUpRight" size={14} /></button><button onClick={() => navigate('/journey')}>My preparation journey<Icon name="ArrowUpRight" size={14} /></button></section></aside></div> : tab === 'quizzes' ? <><div className="section-head"><div><h2>Test what you understand.</h2><p>Original role scenarios, topic checks and explanations after submission.</p></div><Button variant="secondary" icon="Shuffle" disabled={!quizzes.length} onClick={() => setModal({
          type: 'quiz',
          id: quizzes[Math.floor(Math.random() * quizzes.length)].id
        })}>Random matching quiz</Button></div><div className="quiz-grid">{quizzes.map((q, i) => <section className="card quiz-card" key={q.id}><span className={'quiz-art tone-' + ['purple', 'blue', 'peach', 'mint'][i % 4]}><Icon name={q.roleId ? 'Target' : q.topic === 'Databases' ? 'Database' : 'Brain'} size={30} /></span><Badge color={q.roleId ? 'blue' : 'purple'}>{q.roleId ? 'Role scenario' : q.topic}</Badge><h3>{q.title}</h3><p>{q.questions.length} questions · {q.difficulty || 'Topic practice'}</p><Button variant="secondary" icon="ArrowUpRight" onClick={() => setModal({
            type: 'quiz',
            id: q.id
          })}>Start quiz</Button></section>)}</div>{!quizzes.length && noMatches}</> : <><div className="section-head"><div><h2>Prepare with a company in mind.</h2><p>Official hiring resources for {scope.all ? 'your exploration' : scope.role.name.toLowerCase() + ' preparation'}. General preparation suggestions, not claims about past interview questions.</p></div></div><div className="company-directory-filters"><label className="search-field"><Icon name="Search" size={16} /><input aria-label="Find a company" value={companyQuery} onChange={e => setCompanyQuery(e.target.value)} placeholder="Search company, sector or skill…" /></label><Badge color="blue">{companies.length} matching companies · {state.catalog.companies.length} in directory</Badge></div><div className="company-grid">{companies.map(c => <section className="card company-card" key={c.id}><CompanyLogo name={c.name} /><h2>{c.name}</h2>{c.sector && <small>{c.sector}</small>}<p>{c.focus}</p><Button variant="secondary" icon="ArrowUpRight" onClick={() => setModal({
            type: 'company-guide',
            id: c.id
          })}>{c.guideKind === 'careers' ? 'Explore company' : 'Explore preparation'}</Button></section>)}</div>{!companies.length && noMatches}</>}
  </>;
}
