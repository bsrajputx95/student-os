export const staffKinds = ['Assignment', 'Quiz', 'Project', 'Event', 'Announcement', 'Message', 'Feedback', 'Opportunity'];
export const pipelineStages = ['Invited', 'Applied', 'Assessment', 'Interview', 'Offered', 'Not selected'];
export const departmentOptions = ['Computer Science', 'Information Technology', 'Electronics'];
export function jobScore(student, job) {
  return {
    score: Math.round(job.skills.reduce((sum, s) => sum + ((student.verifiedSkills || student.skills)[s] || 0), 0) / job.skills.length),
    yearMatch: job.years.includes(Number(student.year)),
    gaps: job.skills.filter(s => ((student.verifiedSkills || student.skills)[s] || 0) < 70).map(skill => ({
      skill,
      value: (student.verifiedSkills || student.skills)[skill] || 0,
      target: 70
    }))
  };
}
export function campusKey(profile) {
  return profile.collegeId || String(profile.college || 'Independent student').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function matchesStudent(student, filters = {}) {
  return (!filters.query || `${student.name} ${student.handle} ${student.studentId}`.toLowerCase().includes(filters.query.toLowerCase())) && (!filters.year || Number(student.year) === Number(filters.year)) && (!filters.track || student.track === filters.track) && (!filters.department || student.department === filters.department) && (!filters.section || student.section === filters.section) && (!filters.readiness || student.readiness >= Number(filters.readiness)) && (!filters.company || (student.targetCompanies || []).includes(filters.company) || (student.companyApplications || []).includes(filters.company)) && (!filters.support || student.needsSupport);
}
export function csvExport(rows) {
  const cell = value => {
    let s = String(value ?? '');
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
