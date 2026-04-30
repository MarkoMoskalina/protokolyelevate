"use client";

import {
  DatePicker,
  DateInput,
  DateSegment,
  Button,
  Popover,
  Dialog,
  Calendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Heading,
  Group,
} from "react-aria-components";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { CalendarDateTime } from "@internationalized/date";

import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  label?: string;
  value: string;
  onChange: (isoString: string) => void;
  error?: string;
  granularity?: "day" | "hour" | "minute" | "second";
}

function toCalendarValue(isoString: string): CalendarDateTime | undefined {
  if (!isoString) return undefined;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return undefined;
    return new CalendarDateTime(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate(),
      d.getHours(),
      d.getMinutes(),
      d.getSeconds(),
    );
  } catch {
    return undefined;
  }
}

export function DateTimePicker({
  label,
  value,
  onChange,
  error,
  granularity = "minute",
}: DateTimePickerProps) {
  const calendarValue = toCalendarValue(value);

  function handleChange(val: CalendarDateTime | null) {
    if (!val) return;
    const month = String(val.month).padStart(2, "0");
    const day = String(val.day).padStart(2, "0");
    const hour = String(val.hour).padStart(2, "0");
    const minute = String(val.minute).padStart(2, "0");
    onChange(`${val.year}-${month}-${day}T${hour}:${minute}`);
  }

  return (
    <DatePicker
      value={calendarValue ?? null}
      onChange={handleChange}
      granularity={granularity}
      hourCycle={24}
    >
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-secondary">
          {label}
        </label>
      )}
      <Group
        className={cn(
          "flex items-center rounded-lg border bg-primary px-3 py-2.5 text-sm transition-colors",
          "focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
          error ? "border-error" : "border-primary",
        )}
      >
        <DateInput className="flex flex-1 items-center">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 text-primary tabular-nums outline-none focus:bg-brand-50 focus:text-brand-700 data-[placeholder]:text-placeholder"
            />
          )}
        </DateInput>
        <Button className="ml-2 rounded p-1 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary outline-none focus:ring-2 focus:ring-brand/20">
          <CalendarIcon className="h-4 w-4" />
        </Button>
      </Group>

      <Popover
        className="z-[100] rounded-xl border border-secondary bg-primary p-3 shadow-lg data-[entering]:animate-in data-[entering]:fade-in-0 data-[entering]:zoom-in-95 data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[exiting]:zoom-out-95"
      >
        <Dialog className="outline-none">
          <Calendar className="w-full">
            <header className="flex items-center justify-between pb-3">
              <Button
                slot="previous"
                className="rounded-lg p-1.5 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary outline-none focus:ring-2 focus:ring-brand/20"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Heading className="text-sm font-semibold text-primary" />
              <Button
                slot="next"
                className="rounded-lg p-1.5 text-tertiary transition-colors hover:bg-secondary_hover hover:text-primary outline-none focus:ring-2 focus:ring-brand/20"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </header>
            <CalendarGrid className="w-full border-collapse">
              <CalendarGridHeader>
                {(day) => (
                  <CalendarHeaderCell className="pb-2 text-xs font-medium text-tertiary">
                    {day}
                  </CalendarHeaderCell>
                )}
              </CalendarGridHeader>
              <CalendarGridBody>
                {(date) => (
                  <CalendarCell
                    date={date}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm outline-none transition-colors hover:bg-secondary_hover data-[selected]:bg-brand-solid data-[selected]:text-white data-[disabled]:text-quaternary data-[outside-month]:text-quaternary data-[focused]:ring-2 data-[focused]:ring-brand/30 cursor-default"
                  />
                )}
              </CalendarGridBody>
            </CalendarGrid>
          </Calendar>
        </Dialog>
      </Popover>

      {error && <p className="mt-1 text-xs text-error-primary">{error}</p>}
    </DatePicker>
  );
}
