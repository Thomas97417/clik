// Public timestamps use the same French time zone during SSR and hydration.
const timeZone = "Europe/Paris";
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone,
});
const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone,
});
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone,
});

export function formatDate(
  timestamp: number,
  month: "short" | "long" = "short",
) {
  return (month === "long" ? longDate : shortDate).format(timestamp);
}

export function formatDateTime(timestamp: number) {
  return dateTime.format(timestamp);
}
