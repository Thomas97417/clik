import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { CalendarDays } from "lucide-react";
import "react-day-picker/style.css";
// Calendar dates are local civil dates; no UTC conversion can shift the chosen day.
const civil = (day: string) =>
  new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
    12,
  );
export function ChallengeDatePicker({
  day,
  first,
  last,
  onChange,
}: {
  day: string;
  first: string;
  last: string;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="challenge-date-trigger">
        <CalendarDays size={17} aria-hidden="true" />
        {civil(day).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={8}
          className="challenge-calendar-positioner"
        >
          <Popover.Popup
            className="challenge-calendar"
            aria-label="Choisir la date du défi"
          >
            <DayPicker
              locale={fr}
              mode="single"
              selected={civil(day)}
              defaultMonth={civil(day)}
              startMonth={civil(first)}
              endMonth={civil(last)}
              disabled={[{ before: civil(first) }, { after: civil(last) }]}
              onSelect={(date) => {
                if (!date) return;
                onChange(
                  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
                );
                setOpen(false);
              }}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
