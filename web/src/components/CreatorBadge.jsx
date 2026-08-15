/** Shows who created/reported an item and their role (admin / moderator / citizen). */
export default function CreatorBadge({ name, role, label = 'By', className = '' }) {
  const displayName = name || 'Unknown';
  const displayRole = (role || 'citizen').toLowerCase();

  const roleStyle =
    displayRole === 'admin'
      ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/25'
      : displayRole === 'moderator'
        ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/25'
        : 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';

  const roleLabel =
    displayRole === 'admin' ? 'Admin' : displayRole === 'moderator' ? 'Moderator' : 'Citizen';

  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      <span className="text-slate-400 text-[10px]">{label}</span>
      <span className="font-semibold text-slate-600 dark:text-slate-300 text-[11px]">{displayName}</span>
      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${roleStyle}`}>
        {roleLabel}
      </span>
    </span>
  );
}

/** Confirm delete with creator identity in the message. */
export function confirmDeleteWithCreator(itemLabel, person) {
  const name = person?.name || 'Unknown';
  const role = (person?.role || 'citizen').toLowerCase();
  const roleLabel = role === 'admin' ? 'Admin' : role === 'moderator' ? 'Moderator' : 'Citizen';
  return window.confirm(
    `Delete this ${itemLabel}?\n\nCreated by: ${name} (${roleLabel})\n\nThis cannot be undone.`
  );
}
