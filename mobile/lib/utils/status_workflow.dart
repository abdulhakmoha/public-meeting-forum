/// Sequential (audit) status workflows — mirror of backend rules.

class StatusWorkflow {
  static const issueFlow = ['Pending', 'Under Review', 'Resolved'];
  static const projectFlow = ['Planning', 'In Progress', 'Completed'];

  static String? nextIssueStatus(String? current) {
    final i = issueFlow.indexOf(current ?? '');
    if (i < 0 || i >= issueFlow.length - 1) return null;
    return issueFlow[i + 1];
  }

  static bool canRejectIssue(String? current) {
    return current == 'Pending' || current == 'Under Review';
  }

  static String? nextProjectStatus(String? current) {
    final i = projectFlow.indexOf(current ?? '');
    if (i < 0 || i >= projectFlow.length - 1) return null;
    return projectFlow[i + 1];
  }

  static int autoProgress(String? status) {
    if (status == 'In Progress') return 50;
    if (status == 'Completed') return 100;
    return 0;
  }
}
