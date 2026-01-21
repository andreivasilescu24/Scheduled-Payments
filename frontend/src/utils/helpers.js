export function truncateAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatInterval(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks`;
  return `${Math.floor(seconds / 2592000)} months`;
}

export function formatDate(date) {
  const now = new Date();
  const diff = date - now;

  if (diff < 0) return 'Overdue';
  if (diff < 60000) return 'In less than a minute';
  if (diff < 3600000) return `In ${Math.floor(diff / 60000)} min`;
  if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hours`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format date to local datetime-local input format (YYYY-MM-DDTHH:mm)
function toLocalDateTimeString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getDefaultStartTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5);
  return toLocalDateTimeString(now);
}

export function getMinDateTime() {
  return toLocalDateTimeString(new Date());
}
