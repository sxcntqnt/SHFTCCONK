/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

type Timestamp = number; // unix seconds

type DateFormatOptions = Intl.DateTimeFormatOptions;

/* -------------------------------------------------------------------------- */
/*                              CORE FORMATTER                                */
/* -------------------------------------------------------------------------- */

const DEFAULT_OPTIONS: DateFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  day: 'numeric',
  month: 'short'
};

function isValidTimestamp(ts: unknown): ts is Timestamp {
  return typeof ts === 'number' && Number.isFinite(ts) && ts > 0;
}

/**
 * Formats unix seconds into a localized readable string
 */
export function formatChatTimestamp(
  unixSeconds: Timestamp,
  options: DateFormatOptions = {}
): string {
  if (!isValidTimestamp(unixSeconds)) return '';

  const date = new Date(unixSeconds * 1000);

  const merged: DateFormatOptions = {
    ...DEFAULT_OPTIONS,
    ...options
  };

  return new Intl.DateTimeFormat(undefined, merged).format(date);
}

/* -------------------------------------------------------------------------- */
/*                           LAST ACTIVITY FORMAT                             */
/* -------------------------------------------------------------------------- */

export function formatLastActivity(unixSeconds: Timestamp): string {
  return formatChatTimestamp(unixSeconds, {
    hour: undefined,
    minute: undefined
  });
}
