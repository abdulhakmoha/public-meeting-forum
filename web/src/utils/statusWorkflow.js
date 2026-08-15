/** Sequential (audit) status workflows — mirror of backend rules. */

export const ISSUE_FLOW = ['Pending', 'Under Review', 'Resolved'];
export const ISSUE_AUDIT_STEPS = [...ISSUE_FLOW, 'Rejected'];

export const PROJECT_FLOW = ['Planning', 'In Progress', 'Completed'];

export function nextIssueStatus(current) {
  const i = ISSUE_FLOW.indexOf(current);
  if (i < 0 || i >= ISSUE_FLOW.length - 1) return null;
  return ISSUE_FLOW[i + 1];
}

export function canRejectIssue(current) {
  return current === 'Pending' || current === 'Under Review';
}

export function nextProjectStatus(current) {
  const i = PROJECT_FLOW.indexOf(current);
  if (i < 0 || i >= PROJECT_FLOW.length - 1) return null;
  return PROJECT_FLOW[i + 1];
}

export function autoProgress(status) {
  if (status === 'In Progress') return 50;
  if (status === 'Completed') return 100;
  return 0;
}
