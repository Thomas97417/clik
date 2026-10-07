import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { DayPicker, type ChevronProps } from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import "react-day-picker/style.css";
// Calendar dates are local civil dates; no UTC conversion can shift the chosen day.
const civil = (day: string) =>
  new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
    12,
  );

function CalendarChevron({ orientation, className }: ChevronProps) {
  const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
  return <Icon className={className} size={18} aria-hidden="true" />;
}

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
  const selectedDay = civil(day);
  const firstDay = civil(first);
  const today = civil(last);
  const select = (date: Date) => {
    onChange(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
    );
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger className="challenge-date-trigger">
        <span className="challenge-date-icon">
          <CalendarDays size={17} aria-hidden="true" />
        </span>
        <span className="challenge-date-label">{formatChallengeDay(day)}</span>
        <ChevronDown
          className="challenge-date-chevron"
          size={15}
          aria-hidden="true"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          align="start"
          sideOffset={10}
          collisionPadding={12}
          collisionAvoidance={{
            side: "flip",
            align: "shift",
            fallbackAxisSide: "none",
          }}
          className="challenge-calendar-positioner"
        >
          <Popover.Popup className="challenge-calendar" initialFocus={false}>
            <div className="challenge-calendar-header">
              <div>
                <Popover.Title className="challenge-calendar-title">
                  Choisir la date du défi
                </Popover.Title>
                <Popover.Description className="challenge-calendar-description">
                  Retrouvez les créations de chaque jour.
                </Popover.Description>
              </div>
            </div>
            <div className="challenge-calendar-body">
              <DayPicker
                locale={fr}
                mode="single"
                required
                autoFocus
                showOutsideDays
                navLayout="around"
                components={{ Chevron: CalendarChevron }}
                selected={selectedDay}
                today={today}
                defaultMonth={selectedDay}
                startMonth={firstDay}
                endMonth={today}
                disabled={[{ before: firstDay }, { after: today }]}
                onSelect={select}
              />
            </div>
            <div className="challenge-calendar-footer">
              <span className="challenge-calendar-legend">
                <span aria-hidden="true" /> Aujourd’hui
              </span>
              <button
                type="button"
                className="challenge-calendar-today"
                onClick={() => select(today)}
              >
                Défi du jour <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
