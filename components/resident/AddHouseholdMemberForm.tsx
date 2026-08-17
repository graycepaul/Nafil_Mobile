import { useState } from "react";
import { View, Text } from "react-native";
import { supabase } from "../../lib/supabase";
import { pickAndUploadHouseholdAvatar } from "../../lib/avatar";
import { validatePhone } from "../../lib/validation";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import type { HouseholdMember, HouseholdReviewFrequency } from "../../types/database";

const REVIEW_OPTIONS: { key: HouseholdReviewFrequency; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "semiannual", label: "Every 6 months" },
  { key: "yearly", label: "Yearly" },
];

/**
 * Adds a standing allow-list entry — a family member, a nanny, a regular
 * driver — someone who shouldn't need a fresh visitor pass every time they
 * come. Creates the record first (name/relationship/phone only), then offers
 * a photo as a second step once the row — and its id, needed for the avatar
 * upload path — actually exists. Mirrors InviteStaffForm's create → share
 * two-step shape.
 */
export function AddHouseholdMemberForm({
  residentId,
  estateId,
  onCreated,
}: {
  residentId: string;
  estateId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [reviewFrequency, setReviewFrequency] = useState<HouseholdReviewFrequency>("quarterly");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [created, setCreated] = useState<HouseholdMember | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  function reset() {
    setOpen(false);
    setFullName("");
    setRelationship("");
    setPhone("");
    setPhoneError(undefined);
    setReviewFrequency("quarterly");
    setFormError(undefined);
    setCreated(null);
  }

  function finish() {
    reset();
    onCreated();
  }

  async function handleCreate() {
    const phoneErr = validatePhone(phone);
    setPhoneError(phoneErr);
    if (!fullName.trim() || !relationship.trim() || phoneErr) return;
    setFormError(undefined);
    setCreating(true);
    const { data, error } = await supabase
      .from("household_members")
      .insert({
        estate_id: estateId,
        resident_id: residentId,
        full_name: fullName.trim(),
        relationship: relationship.trim(),
        phone: phone.trim(),
        review_frequency: reviewFrequency,
      })
      .select()
      .single();
    setCreating(false);

    if (error) {
      setFormError(error.message);
      return;
    }
    setCreated(data as HouseholdMember);
  }

  async function addPhoto() {
    if (!created) return;
    setUploadingPhoto(true);
    const result = await pickAndUploadHouseholdAvatar(residentId, created.id);
    setUploadingPhoto(false);
    if ("error" in result && result.error) {
      setFormError(result.error);
      return;
    }
    if ("cancelled" in result) return;
    await supabase
      .from("household_members")
      .update({ avatar_url: result.url })
      .eq("id", created.id);
    setCreated({ ...created, avatar_url: result.url! });
  }

  if (!open) {
    return (
      <Button
        label="+ Add household member"
        variant="secondary"
        onPress={() => setOpen(true)}
        className="mb-xl"
      />
    );
  }

  if (created) {
    return (
      <Card className="mb-xl">
        <Text className="text-base font-semibold text-paper-900 dark:text-ink-text">
          {created.full_name} added
        </Text>
        <Text className="mb-md mt-xs text-[13px] text-paper-500 dark:text-ink-textMuted">
          {created.avatar_url
            ? `Code: ${created.code}. Their card is ready.`
            : `Code: ${created.code}. A photo is required for proper identification a the gate.`}
        </Text>
        <View className="mb-md items-center">
          <Avatar uri={created.avatar_url} name={created.full_name} size={64} />
        </View>
        <View className="flex-row gap-sm">
          <Button
            label={created.avatar_url ? "Change photo" : "Add photo"}
            variant="secondary"
            onPress={addPhoto}
            loading={uploadingPhoto}
            className="flex-1"
          />
          <Button
            label="Done"
            onPress={finish}
            disabled={!created.avatar_url}
            className="flex-1"
          />
        </View>
      </Card>
    );
  }

  return (
    <Card className="mb-xl">
      <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">
        Add to your household
      </Text>
      {formError && <Notice message={formError} />}
      <Input
        label="Full name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
      <Input
        label="Relationship"
        placeholder="Relationship (e.g. Spouse, Nanny, Driver)"
        value={relationship}
        onChangeText={setRelationship}
      />
      <Input
        label="Phone"
        placeholder="Phone"
        value={phone}
        onChangeText={(v) => {
          setPhone(v);
          if (phoneError) setPhoneError(undefined);
        }}
        error={phoneError}
        keyboardType="phone-pad"
      />

      <Text className="mb-xs text-[13px] font-medium text-paper-500 dark:text-ink-textMuted">
        Review this card
      </Text>
      <Text className="mb-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
        The card deactivates automatically on this schedule until you review and reactivate it.
        A safety net in case you forget to revoke access yourself.
      </Text>
      <View className="mb-md flex-row flex-wrap gap-sm">
        {REVIEW_OPTIONS.map((opt) => {
          const active = reviewFrequency === opt.key;
          return (
            <Text
              key={opt.key}
              onPress={() => setReviewFrequency(opt.key)}
              className={`rounded-full border px-md py-xs text-[13px] font-medium ${
                active
                  ? "border-brand-800 bg-brand-800 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-ink-bg"
                  : "border-paper-200 text-paper-500 dark:border-ink-border dark:text-ink-textMuted"
              }`}
            >
              {opt.label}
            </Text>
          );
        })}
      </View>

      <View className="flex-row gap-sm">
        <Button
          label="Add"
          onPress={handleCreate}
          loading={creating}
          disabled={!fullName.trim() || !relationship.trim() || !phone.trim()}
          className="flex-1"
        />
        <Button
          label="Cancel"
          variant="secondary"
          onPress={reset}
          className="flex-1"
        />
      </View>
    </Card>
  );
}
