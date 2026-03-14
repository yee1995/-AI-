/**
 * 個案編號 & V編號生成器
 */

export function generateCaseId(): string {
  const prefix = Math.floor(Math.random() * 9) + 1; // 1-9
  const digits = Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join('');
  return `${prefix}-${digits}`;
}

export function generateVNumber(): string {
  const digits = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return `V${digits}`;
}

/**
 * Format a Date to work order date string: DD/MM/YYYY  HH:MM:SS (two spaces between date and time)
 */
export function formatWorkOrderDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${day}/${month}/${year}  ${hours}:${minutes}:${seconds}`;
}

/**
 * Generate a ref date 3-10 minutes after open date
 */
export function generateRefDate(openDate: Date): Date {
  const minOffset = 3 * 60 * 1000;
  const maxOffset = 10 * 60 * 1000;
  const offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  return new Date(openDate.getTime() + offset);
}
