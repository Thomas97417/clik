export const FIRST_CREATION_TITLE = "Ma première création";
export const NEW_CREATION_TITLE = "Nouvelle création";

export function creationNameNumber(title: string): number | undefined {
  const match = /^Nouvelle création(?: ([1-9]\d*))?$/i.exec(title.trim());
  if (!match) return undefined;
  const number = match[1] ? Number(match[1]) : 1;
  return Number.isSafeInteger(number) ? number : undefined;
}

export function nextCreationName(titles: Iterable<string>, previous = -1) {
  let highest = Number.isSafeInteger(previous) ? Math.max(-1, previous) : -1;
  for (const title of titles)
    highest = Math.max(highest, creationNameNumber(title) ?? 0);
  const number = highest + 1;
  if (!Number.isSafeInteger(number))
    throw Error("La limite de numérotation des créations est atteinte.");
  return {
    number,
    title:
      number === 0
        ? FIRST_CREATION_TITLE
        : number === 1
          ? NEW_CREATION_TITLE
          : `${NEW_CREATION_TITLE} ${number}`,
  };
}
