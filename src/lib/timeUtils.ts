/**
 * Convert a date to relative time format (e.g., "2h", "3m", "5d")
 * Similar to Twitter's time display
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  // Less than a minute
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  // Less than an hour
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  // Less than a day
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  // Less than a week
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  // More than a week - show actual date
  const month = postDate.toLocaleDateString("en-US", { month: "short" });
  const day = String(postDate.getDate()).padStart(2, "0");
  const year = postDate.getFullYear();
  const currentYear = now.getFullYear();

  // If same year, don't show year
  if (year === currentYear) {
    return `${day} ${month}`;
  }

  return `${month} ${day}, ${year}`;
}

/**
 * Format date as DD/MM/YYYY
 * Enforces consistent date format across all users regardless of locale
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format date and time as DD/MM/YYYY HH:MM
 * Enforces consistent format across all users regardless of locale
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format date with optional weekday: "DD MMM YYYY" or "Weekday, DD MMM YYYY"
 * Enforces consistent format across all users
 */
export function formatDateWithOptions(
  date: string | Date,
  options?: { weekday?: boolean; includeTime?: boolean },
): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  let result = `${day} ${month} ${year}`;

  if (options?.weekday) {
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    result = `${weekday}, ${result}`;
  }

  if (options?.includeTime) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    result = `${result} ${hours}:${minutes}`;
  }

  return result;
}
