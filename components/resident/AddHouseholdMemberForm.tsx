import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { supabase } from "../../lib/supabase";
import { pickHouseholdAvatarPhoto, uploadHouseholdAvatar } from "../../lib/avatar";
import { validatePhone } from "../../lib/validation";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Notice } from "../ui/Notice";
import { Card } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import type { HouseholdReviewFrequency } from "../../types/database";

const REVIEW_OPTIONS: { key: HouseholdReviewFrequency; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "semiannual", label: "Every 6 months" },
  { key: "yearly", label: "Yearly" },
];

/**
 * Adds a standing allow-list entry — a family member, a nanny, a regular
 * driver — someone who shouldn't need a fresh visitor pass every time they
 * come. The photo is picked up front, in the form itself, rather than as a
 * second step after creation: that two-step shape (create the row, then
 * separately prompt for a photo) was the source of a real bug — abandoning
 * or failing partway through the second step left a member with no photo in
 * a state this form had no way back into, despite a photo being required for
 * gate identification. Picking first means "Add" either succeeds with a
 * photo already attached, or doesn't create anything at all.
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
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string | null | undefined }>();
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [fullName, setFullName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string>();
  const [reviewFrequency, setReviewFrequency] = useState<HouseholdReviewFrequency>("quarterly");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string>();
  // Set once the row itself is created, so a retry after a failed photo
  // upload re-attempts just the upload instead of inserting a duplicate row.
  const [pendingId, setPendingId] = useState<string>();

  function reset() {
    setOpen(false);
    setPhoto(undefined);
    setFullName("");
    setRelationship("");
    setPhone("");
    setPhoneError(undefined);
    setReviewFrequency("quarterly");
    setFormError(undefined);
    setPendingId(undefined);
  }

  async function pickPhoto() {
    setFormError(undefined);
    setPickingPhoto(true);
    const result = await pickHouseholdAvatarPhoto();
    setPickingPhoto(false);
    if ("error" in result) {
      setFormError(result.error);
      return;
    }
    if ("cancelled" in result) return;
    setPhoto({ uri: result.asset.uri, mimeType: result.asset.mimeType });
  }

  async function handleCreate() {
    const phoneErr = validatePhone(phone);
    setPhoneError(phoneErr);
    if (!fullName.trim() || !relationship.trim() || phoneErr || !photo) return;
    setFormError(undefined);
    setCreating(true);

    let memberId = pendingId;
    if (!memberId) {
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

      if (error) {
        setCreating(false);
        setFormError(error.message);
        return;
      }
      memberId = data.id as string;
      setPendingId(memberId);
    }

    const uploadResult = await uploadHouseholdAvatar(residentId, memberId, photo);
    if ("error" in uploadResult && uploadResult.error) {
      // The record already exists (memberId/pendingId is set) — only the
      // photo failed, so retrying "Add" now skips straight to re-uploading
      // instead of inserting a duplicate row.
      setCreating(false);
      setFormError(`${fullName.trim()} was added, but the photo failed to upload: ${uploadResult.error}`);
      return;
    }

    await supabase
      .from("household_members")
      .update({ avatar_url: uploadResult.url })
      .eq("id", memberId);

    setCreating(false);
    reset();
    onCreated();
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

  return (
    <Card className="mb-xl">
      <Text className="mb-md text-base font-semibold text-paper-900 dark:text-ink-text">
        Add to your household
      </Text>
      {formError && <Notice message={formError} />}

      <View className="mb-md items-center">
        <Pressable onPress={pickPhoto} accessibilityRole="button" accessibilityLabel="Add photo" className="items-center">
          <View className="relative">
            <Avatar uri={photo?.uri} name={fullName || undefined} size={72} />
            <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full bg-brand-800 dark:bg-brand-500">
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </View>
          <Text className="mt-sm text-[13px] font-semibold text-brand-800 dark:text-brand-300">
            {pickingPhoto ? "Opening…" : photo ? "Change photo" : "Add photo"}
          </Text>
        </Pressable>
        <Text className="mt-xs text-center text-[12px] text-paper-500 dark:text-ink-textMuted">
          Required for identification at the gate.
        </Text>
      </View>

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
          disabled={!fullName.trim() || !relationship.trim() || !phone.trim() || !photo}
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
