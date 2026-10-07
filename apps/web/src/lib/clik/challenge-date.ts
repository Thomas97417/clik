const challengeDateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatChallengeDay(day: string) {
  return challengeDateFormat.format(new Date(`${day}T00:00:00Z`));
}
