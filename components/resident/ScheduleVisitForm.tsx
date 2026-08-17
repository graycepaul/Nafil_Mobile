import { useState } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../lib/supabase';
import { titleCase } from '../../lib/format';
import { validatePhone } from '../../lib/validation';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Notice } from '../ui/Notice';
import { Card } from '../ui/Card';

/**
 * "I'm expecting someone at 6pm" without generating a code ahead of time.
 * Security matches the visitor by the name they give at the gate instead.
 *
 * @react-native-community/datetimepicker has no web build at all (iOS/
 * Android/Windows only) — real usage of this feature is on-device, so the
 * native picker is what matters there. Web (this app's dev/test surface,
 * not a realistic target for "schedule a gate visit") falls back to plain
 * date/time text inputs instead of pulling in a second picker library just
 * for parity on a platform this feature isn't really for.
 */
export function ScheduleVisitForm({
  residentId,
  estateId,
  onScheduled,
  onCancel,
}: {
  residentId: string;
  estateId: string;
  onScheduled: () => void;
  onCancel: () => void;
}) {
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string>();
  const [description, setDescription] = useState('');
  const [scheduledFor, setScheduledFor] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [webDate, setWebDate] = useState('');
  const [webTime, setWebTime] = useState('');
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();

  const isWeb = Platform.OS === 'web';

  function resolvedDate(): Date | null {
    if (!isWeb) return scheduledFor;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(webDate.trim());
    const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(webTime.trim());
    if (!match || !timeMatch) return null;
    const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return d;
  }

  async function handleSchedule() {
    const phoneErr = validatePhone(visitorPhone);
    setPhoneError(phoneErr);
    if (!visitorName.trim() || phoneErr || !description.trim()) return;
    const date = resolvedDate();
    if (!date) {
      setFormError(isWeb ? 'Enter a valid date (YYYY-MM-DD) and time (HH:MM).' : 'Choose a date and time.');
      return;
    }
    setFormError(undefined);
    setCreating(true);
    const { error } = await supabase.from('scheduled_visits').insert({
      estate_id: estateId,
      resident_id: residentId,
      visitor_name: titleCase(visitorName),
      visitor_phone: visitorPhone.trim(),
      description: description.trim(),
      scheduled_for: date.toISOString(),
    });
    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }
    onScheduled();
  }

  return (
    <Card className="mb-lg">
      <Text className="mb-xs text-base font-semibold text-paper-900 dark:text-ink-text">
        Schedule a visit
      </Text>
      <Text className="mb-md text-[13px] text-paper-500 dark:text-ink-textMuted">
        Let us know who to expect and when. At the gate, they just give their name instead of a
        code.
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
        label="Visitor phone"
        showLabel
        placeholder="e.g. 0803 123 4567"
        value={visitorPhone}
        onChangeText={(v) => {
          setVisitorPhone(v);
          if (phoneError) setPhoneError(undefined);
        }}
        error={phoneError}
        keyboardType="phone-pad"
      />
      <Input
        label="Description"
        showLabel
        placeholder="e.g. Plumber for the kitchen sink"
        value={description}
        onChangeText={setDescription}
      />

      {isWeb ? (
        <View className="mb-md flex-row gap-sm">
          <View className="flex-1">
            <Input
              label="Date"
              showLabel
              placeholder="YYYY-MM-DD"
              value={webDate}
              onChangeText={setWebDate}
            />
          </View>
          <View className="flex-1">
            <Input
              label="Time"
              showLabel
              placeholder="HH:MM"
              value={webTime}
              onChangeText={setWebTime}
            />
          </View>
        </View>
      ) : (
        <View className="mb-md flex-row gap-sm">
          <Pressable
            onPress={() => setPickerMode('date')}
            className="flex-1 rounded-md border border-paper-200 px-md py-md dark:border-ink-border"
          >
            <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Date</Text>
            <Text className="text-base text-paper-900 dark:text-ink-text">
              {scheduledFor.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPickerMode('time')}
            className="flex-1 rounded-md border border-paper-200 px-md py-md dark:border-ink-border"
          >
            <Text className="text-[13px] text-paper-500 dark:text-ink-textMuted">Time</Text>
            <Text className="text-base text-paper-900 dark:text-ink-text">
              {scheduledFor.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        </View>
      )}

      {pickerMode && (
        <DateTimePicker
          value={scheduledFor}
          mode={pickerMode}
          minimumDate={pickerMode === 'date' ? new Date() : undefined}
          onChange={(event, selected) => {
            setPickerMode(Platform.OS === 'ios' ? pickerMode : null);
            if (event.type === 'dismissed' || !selected) return;
            setScheduledFor((prev) => {
              const next = new Date(prev);
              if (pickerMode === 'date') {
                next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
              } else {
                next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
              }
              return next;
            });
          }}
        />
      )}

      <View className="flex-row gap-sm">
        <Button
          label="Schedule"
          onPress={handleSchedule}
          loading={creating}
          disabled={!visitorName.trim() || !visitorPhone.trim() || !description.trim()}
          className="flex-1"
        />
        <Button label="Cancel" variant="secondary" onPress={onCancel} className="flex-1" />
      </View>
    </Card>
  );
}
