import { useState } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  DayPicker,
  type ClassNames,
  type ChevronProps,
} from "react-day-picker";
import { fr } from "react-day-picker/locale";
import { formatChallengeDay } from "@/lib/clik/challenge-date";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
// DayPicker exposes the calendar structure and modifiers through classNames.
// Keep its markers for consumers; every visual rule belongs to a utility.
const calendarClassNames = {
  root: "rdp-root relative select-none text-[13px]",
  months: "rdp-months relative flex w-full max-w-none flex-wrap gap-8",
  month: "rdp-month relative w-full max-w-none",
  month_grid: "rdp-month_grid w-full table-fixed border-collapse",
  month_caption:
    "rdp-month_caption relative mx-9 flex h-9 content-center justify-center text-[15px] font-bold tracking-[-0.35px] text-[#263b58] capitalize",
  caption_label:
    "rdp-caption_label relative z-1 inline-flex items-center whitespace-nowrap border-0",
  button_previous:
    "rdp-button_previous cursor-pointer outline-offset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] [transition:background_0.15s,color_0.15s,box-shadow_0.15s] absolute top-0 inset-s-0 inline-flex appearance-none items-center justify-center rounded-[9px] border border-[#e0e7f2] bg-white p-0 m-0 text-[#536f97] disabled:cursor-default disabled:opacity-35 aria-disabled:cursor-default aria-disabled:opacity-35 [&:hover:not(:disabled):not([aria-disabled=true])]:bg-[#edf3ff] [&:hover:not(:disabled):not([aria-disabled=true])]:text-[#356ae6] size-9",
  button_next:
    "rdp-button_next cursor-pointer outline-offset-3 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] [transition:background_0.15s,color_0.15s,box-shadow_0.15s] absolute top-0 inset-e-0 inline-flex appearance-none items-center justify-center rounded-[9px] border border-[#e0e7f2] bg-white p-0 m-0 text-[#536f97] disabled:cursor-default disabled:opacity-35 aria-disabled:cursor-default aria-disabled:opacity-35 [&:hover:not(:disabled):not([aria-disabled=true])]:bg-[#edf3ff] [&:hover:not(:disabled):not([aria-disabled=true])]:text-[#356ae6] size-9",
  chevron: "rdp-chevron inline-block fill-none text-inherit",
  weekday:
    "rdp-weekday pt-3.5 pb-2 px-0 text-center text-[10px] font-[650] tracking-[0.4px] text-[#8a98ae] uppercase opacity-100",
  day: "rdp-day h-11 w-[calc(100%/7)] text-center group/day",
  day_button:
    "rdp-day_button cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] [transition:background_0.15s,color_0.15s,box-shadow_0.15s] relative mx-auto my-0 flex h-10 w-[calc(100%-4px)] items-center justify-center rounded-[10px] border border-transparent bg-transparent p-0 font-[550] text-inherit outline-offset-1 disabled:cursor-not-allowed disabled:opacity-100 hover:enabled:bg-[#edf3ff] hover:enabled:text-[#2458ce] group-[[data-today]:not([data-selected])]/day:bg-[#edf3ff] group-[[data-today]:not([data-selected])]/day:font-bold group-[[data-today]:not([data-selected])]/day:text-[#356ae6] group-data-[today]/day:after:absolute group-data-[today]/day:after:bottom-1 group-data-[today]/day:after:left-[calc(50%-2px)] group-data-[today]/day:after:size-1 group-data-[today]/day:after:rounded-full group-data-[today]/day:after:bg-[#356ae6] group-data-[today]/day:after:content-[''] group-data-[selected]/day:border-[#356ae6] group-data-[selected]/day:bg-[#356ae6] group-data-[selected]/day:font-bold group-data-[selected]/day:text-white group-data-[selected]/day:[box-shadow:0_3px_8px_#356ae625] group-data-[selected]/day:hover:enabled:bg-[#285abd] group-data-[selected]/day:hover:enabled:text-white group-data-[selected]/day:focus-visible:outline-[#203b65] group-data-[today]/day:group-data-[selected]/day:after:bg-white group-[[data-outside]:not([data-selected])]/day:text-[#8a98ae]",
  today: "rdp-today not-data-[outside]:text-[#356ae6]",
  selected: "rdp-selected text-[13px] font-bold",
  outside: "rdp-outside opacity-100",
  disabled: "rdp-disabled [&:not([data-selected])]:opacity-35",
  hidden: "rdp-hidden invisible text-white",
} satisfies Partial<ClassNames>;

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
      <Popover.Trigger className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 challenge-date-trigger group/challenge-date-trigger group/challenge-date-trigger py-1.5 gap-2.5 border-[#d9e3f3] min-h-11 pr-3 pl-1.75 rounded-[11px] text-[#344964] font-[650] max-xs-wide:px-1.5 max-xs-wide:gap-1.5 max-xs-wide:text-xs max-xs-wide:leading-[inherit] hover:border-[#adc5f0] hover:bg-[#f5f8ff] hover:text-[#285abd] data-popup-open:border-[#adc5f0] data-popup-open:bg-[#f5f8ff] data-popup-open:text-[#285abd] border border-solid inline-flex items-center justify-center bg-white text-[13px] leading-normal">
        <span className="challenge-date-icon grid place-items-center shrink-0 rounded-[8px] bg-[#eaf0fc] text-[#356ae6] max-xs-wide:w-6 max-xs-wide:h-7 size-7.5">
          <CalendarDays className="shrink-0" size={17} aria-hidden="true" />
        </span>
        <span className="challenge-date-label min-w-0 whitespace-nowrap max-xs-wide:overflow-hidden max-xs-wide:text-ellipsis block">
          {formatChallengeDay(day)}
        </span>
        <ChevronDown
          className="shrink-0 challenge-date-chevron group/challenge-date-chevron text-[#7d8da5] [transition:transform_0.15s] motion-reduce:transition-none group-data-[popup-open]/challenge-date-trigger:transform-[rotate(180deg)] group-data-[popup-open]/challenge-date-trigger:text-[#356ae6] motion-reduce:duration-0"
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
          className="challenge-calendar-positioner z-60"
        >
          <Popover.Popup
            className="challenge-calendar border border-solid border-[#dce5f4] w-86 max-w-[calc(100vw-24px)] max-h-(--available-height) overflow-y-auto bg-white rounded-[18px] [box-shadow:0_18px_50px_#20396220,0_3px_10px_#20396208] text-[#344964] font-sans origin-(--transform-origin) [transition:opacity_0.15s,transform_0.15s] data-starting-style:opacity-0 data-starting-style:transform-[scale(0.97)] data-ending-style:opacity-0 data-ending-style:transform-[scale(0.97)] motion-reduce:transition-none motion-reduce:duration-0"
            initialFocus={false}
          >
            <div className="challenge-calendar-header px-4 py-4.5 gap-3 flex items-center border-b border-solid border-b-[#edf1f7] bg-[#fbfcff]">
              <div>
                <Popover.Title className="challenge-calendar-title text-[#263b58] text-[15px] font-[750] tracking-[-0.35px] leading-[1.4]">
                  Choisir la date du défi
                </Popover.Title>
                <Popover.Description className="challenge-calendar-description mt-1 text-[#71839c] text-[11px] leading-[1.6]">
                  Retrouvez les créations de chaque jour.
                </Popover.Description>
              </div>
            </div>
            <div className="challenge-calendar-body p-4">
              <DayPicker
                classNames={calendarClassNames}
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
            <div className="challenge-calendar-footer px-4 py-3 gap-3 flex items-center justify-between border-t border-solid border-t-[#e8eef7] bg-[#f7faff]">
              <span className="challenge-calendar-legend gap-1.75 inline-flex items-center text-[#71839c] text-[11px]">
                <span
                  className="rounded-full bg-[#356ae6] size-1.25"
                  aria-hidden="true"
                />{" "}
                Aujourd’hui
              </span>
              <button
                type="button"
                className="cursor-pointer [transition:background_0.15s,color_0.15s,box-shadow_0.15s] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#356ae6] outline-offset-3 challenge-calendar-today px-2.75 py-2 gap-1.75 border border-solid border-[#dce6f7] inline-flex items-center min-h-9 rounded-[9px] bg-white text-[#356ae6] text-[11px] font-[650] hover:border-[#b8cef2] hover:bg-[#edf3ff] disabled:cursor-not-allowed disabled:opacity-100"
                onClick={() => select(today)}
              >
                Défi du jour{" "}
                <ArrowUpRight
                  className="shrink-0"
                  size={15}
                  aria-hidden="true"
                />
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
