/** Sequential (audit) status workflows — no free jumps. */

const ISSUE_FLOW = ['Pending', 'Under Review', 'Resolved'];
const PROJECT_FLOW = ['Planning', 'In Progress', 'Completed'];

function nextInFlow(flow, current) {
  const i = flow.indexOf(current);
  if (i < 0 || i >= flow.length - 1) return null;
  return flow[i + 1];
}

function isTerminalIssue(status) {
  return status === 'Resolved' || status === 'Rejected';
}

/**
 * Issues happy path: Pending → Under Review → Resolved
 * Rejected is a terminal branch from Pending or Under Review only.
 */
function resolveIssueTransition(current, requested) {
  if (isTerminalIssue(current)) {
    return { ok: false, message: 'Cannot modify status of a resolved or rejected issue' };
  }

  if (requested === 'Rejected') {
    if (current === 'Pending' || current === 'Under Review') {
      return { ok: true, next: 'Rejected' };
    }
    return { ok: false, message: 'Issue can only be rejected from Pending or Under Review' };
  }

  const expected = nextInFlow(ISSUE_FLOW, current);
  if (!expected) {
    return { ok: false, message: 'Issue is already at the final status' };
  }

  // Advance without specifying status, or must equal the next step only
  if (!requested || requested === expected || requested === 'advance') {
    return { ok: true, next: expected };
  }

  return {
    ok: false,
    message: `Invalid status jump. Next step must be "${expected}" (audit order).`
  };
}

/**
 * Projects: Planning → In Progress → Completed (no skipping).
 */
function resolveProjectTransition(current, requested) {
  if (current === 'Completed') {
    return { ok: false, message: 'Completed projects cannot change status' };
  }

  const expected = nextInFlow(PROJECT_FLOW, current);
  if (!expected) {
    return { ok: false, message: 'Project is already at the final status' };
  }

  if (!requested || requested === expected || requested === 'advance') {
    return { ok: true, next: expected };
  }

  return {
    ok: false,
    message: `Invalid status jump. Next step must be "${expected}" (audit order).`
  };
}

function progressForProjectStatus(status) {
  if (status === 'In Progress') return 50;
  if (status === 'Completed') return 100;
  return 0;
}

module.exports = {
  ISSUE_FLOW,
  PROJECT_FLOW,
  nextInFlow,
  isTerminalIssue,
  resolveIssueTransition,
  resolveProjectTransition,
  progressForProjectStatus
};
