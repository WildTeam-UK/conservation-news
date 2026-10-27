type AutomatedWork = { automation_attempt_count: number };
type RevisionWork = AutomatedWork & { created_by: string | null };

export function coverageUpdateNeedsAttention(update: AutomatedWork, automationEnabled: boolean) {
  return !automationEnabled || update.automation_attempt_count >= 3;
}

export function coverageRevisionNeedsAttention(revision: RevisionWork, automationEnabled: boolean) {
  return Boolean(revision.created_by) || coverageUpdateNeedsAttention(revision, automationEnabled);
}
