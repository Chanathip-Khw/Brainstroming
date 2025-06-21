/**
 * Formats a date to a readable string
 */
export const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formats a date with time
 */
export const formatDateTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats a date as relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(d);
};

/**
 * Formats a number with thousands separators
 */
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

/**
 * Formats a file size in bytes to human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Truncates text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Formats a name to display format (first name + last initial)
 */
export const formatDisplayName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0] ?? 'User';

  const firstName = parts[0] ?? 'User';
  const lastName = parts[parts.length - 1];
  const lastInitial = lastName && lastName[0] ? lastName[0] : '';

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
};

/**
 * Formats coordinates for display
 */
export const formatCoordinates = (x: number, y: number): string => {
  return `${Math.round(x)}, ${Math.round(y)}`;
};

/**
 * Formats a percentage
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
};

/**
 * Capitalizes first letter of each word
 */
export const toTitleCase = (str: string): string => {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Converts camelCase to Title Case
 */
export const camelToTitle = (str: string): string => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
};
