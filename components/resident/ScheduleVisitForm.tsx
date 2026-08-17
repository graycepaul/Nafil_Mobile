import { useState } from 'react';
import { View, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { titleCase } from '../../lib/format';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function nextDays(count: number): { label: string; date: Date }[] {
  const out: { label: string; date: Date }[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    out.push({ label, date });
  }
  return out;
}

const DAY_OPTIONS = nextDays(7);

/**
 * "I'm expecting someone at 6pm" without generating a code ahead of time.
 * Security matches the visitor by the name they give at the gate instead.
 * No date-picker native module: a week of day chips plus a plain HH:MM
 * field covers the real use case (same-day or next-few-days expectations)
 * without a dependency that would need a fresh native build to test.
 */
export function ScheduleVisitForm({
  residentId,
  estateId,
  onScheduled,
}: {
  residentId: string;
  estateId: string;
  onScheduled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [description, setDescription] = useState('');
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState('');
  const [timeError, setTimeError] = useState<string>();
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();

  function reset() {
    setOpen(false);
    setVisitorName('');
    setDescription('');
    setDayIndex(0);
    setTime('');
    setTimeError(undefined);
    setFormError(undefined);
  }

  async function handleSchedule() {
    if (!visitorName.trim()) return;
    const match = TIME_RE.exec(time.trim());
    if (!match) {
      setTimeError('Enter a time as HH:MM, e.g. 18:00.');
      return;
    }
    setTimeError(undefined);
    setFormError(undefined);

    const scheduledFor = new Date(DAY_OPTIONS[dayIndex].date);
    scheduledFor.setHours(Number(match[1]), Number(match[2]), 0, 0);

    setCreating(true);
    const { error } = await supabase.from('scheduled_visits').insert({
      estate_id: estateId,
      resident_id: residentId,
      visitor_name: titleCase(visitorName),
      description: description.trim() || null,
      scheduled_for: scheduledFor.toISOString(),
    });
    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }
    reset();
    onScheduled();
  }

  if (!open) {
    return (
      <Button
        label="+ Schedule a visit"
        variant="secondary"
        onPress={() => setOpen(true)}
        className="mb-xl"
      />
    );
  }

  return (
    <Card className="mb-xl">
      <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">
        Schedule a visit
      </Text>
      <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
        Tell us who to expect. At the gate they just give their name, no code needed.
      </Text>
      {formError && <Notice message={formError} />}
      <Input
        label="Visitor name"
        showLabel
        placeholder="e.g. Ade Johnson"
        value={visitorName}
        onChangeText={setVisitorName}
      />
      <Input
        label="Description (optional)"
        showLabel
        placeholder="e.g. Plumber for the kitchen sink"
        value={description}
        onChangeText={setDescription}
      />

      <Text className="mb-xs text-[13px] font-medium text-paper-500 dark:text-ink-textMuted">Day</Text>
      <View className="mb-md flex-row flex-wrap gap-sm">
        {DAY_OPTIONS.map((opt, index) => {
          const active = dayIndex === index;
          return (
            <Text
              key={opt.label}
              onPress={() => setDayIndex(index)}
              className={`rounded-full border px-md py-xs text-[13px] font-medium ${
                active
                  ? 'border-brand-800 bg-brand-800 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-ink-bg'
                  : 'border-paper-200 text-paper-500 dark:border-ink-border dark:text-ink-textMuted'
              }`}
            >
              {opt.label}
            </Text>
          );
        })}
      </View>

      <Input
        label="Time"
        showLabel
        placeholder="e.g. 18:00"
        value={time}
        onChangeText={(v) => {
          setTime(v);
          if (timeError) setTimeError(undefined);
        }}
        error={timeError}
        hint="24-hour format, e.g. 18:00 for 6pm"
        keyboardType="numbers-and-punctuation"
      />

      <View className="flex-row gap-sm">
        <Button
          label="Schedule"
          onPress={handleSchedule}
          loading={creating}
          disabled={!visitorName.trim() || !time.trim()}
          className="flex-1"
        />
        <Button label="Cancel" variant="secondary" onPress={reset} className="flex-1" />
      </View>
    </Card>
  );
}
