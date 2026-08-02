export function formatPrice(price: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(price);
}

export function formatDate(date: string | Date, style: 'short' | 'long' | 'relative' = 'short'): string {
  const d = new Date(date);
  if (style === 'relative') {
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }
  return d.toLocaleDateString('en-US', style === 'long'
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

export function getLevelBadge(level: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    BEGINNER: { label: 'Beginner', color: 'emerald' },
    INTERMEDIATE: { label: 'Intermediate', color: 'blue' },
    ADVANCED: { label: 'Advanced', color: 'purple' },
    ALL_LEVELS: { label: 'All Levels', color: 'amber' },
  };
  return map[level] || { label: level, color: 'gray' };
}

export function getStatusBadge(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Draft', color: 'gray' },
    PENDING_REVIEW: { label: 'Pending Review', color: 'amber' },
    APPROVED: { label: 'Approved', color: 'emerald' },
    REJECTED: { label: 'Rejected', color: 'red' },
  };
  return map[status] || { label: status, color: 'gray' };
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function truncate(str: string, len = 40): string {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

export function courseCategoryLabel(course: any, locale: string): string {
  if (course.customFieldAr || course.customFieldEn) {
    return locale === 'ar' ? (course.customFieldAr || course.customFieldEn) : (course.customFieldEn || course.customFieldAr);
  }
  const c = course.category;
  if (!c) return '';
  return locale === 'ar' ? (c.nameAr || c.name) : c.name;
}
