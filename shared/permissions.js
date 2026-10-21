export const staffRoles = ['teacher', 'placement', 'support', 'admin'];
export const roleLabels = {
  student: 'Student',
  teacher: 'Teacher',
  placement: 'Placement team',
  support: 'Academic support',
  admin: 'College administrator'
};
const permissions = {
  student: ['learning.read', 'learning.write', 'community.participate'],
  teacher: ['academic.read', 'content.publish', 'submission.review', 'mentor.write', 'community.participate'],
  placement: ['academic.read', 'content.publish', 'submission.review', 'mentor.write', 'placement.manage', 'community.participate'],
  support: ['academic.read', 'mentor.write', 'community.moderate', 'community.participate'],
  admin: ['*']
};
export const can = (profile, permission) => (permissions[profile?.role] || permissions.student).some(p => p === '*' || p === permission);
export function requirePermission(profile, permission) {
  if (!can(profile, permission)) {
    const error = new Error('Your college role does not allow this action.');
    error.status = 403;
    throw error;
  }
}
