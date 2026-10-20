import { useState } from 'react';
import { Text, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { apiDelete, ApiError } from '../lib/api';
import { afterFailedDelete } from '../lib/delete-account';
import { friendlyDbError } from '../lib/db-errors';
import { useAuthStore } from '../store/auth-store';
import { Card } from './ui/Card';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Notice } from './ui/Notice';

/** "Delete my account", shared by Settings and the access-revoked screen (a revoked member must be able to delete their account too). */
export function DeleteAccountSection() {
  const signOut = useAuthStore((s) => s.signOut);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function handleDelete() {
    setDeleting(true);
    setError(undefined);
    try {
      await apiDelete('/account');
    } catch (err) {
      // The request can fail after the account was already deleted (response
      // lost). Ask the server: sign out only if the account is really gone;
      // otherwise stay signed in and show the error, so the message is seen
      // and a retry is possible.
      const { error: userCheckError } = await supabase.auth.getUser();
      setDeleting(false);
      setConfirming(false);
      if (afterFailedDelete(userCheckError) === 'signOut') {
        await signOut();
        return;
      }
      setError(
        err instanceof ApiError ? err.message || friendlyDbError(err) : 'Something went wrong. Please try again.'
      );
      return;
    }
    setDeleting(false);
    await signOut();
  }

  return (
    <>
      <Text className="mb-sm mt-xl text-sm font-medium text-paper-500 dark:text-ink-textMuted">DANGER ZONE</Text>
      {error && <Notice message={error} />}
      <Card className="items-start shadow-sm">
        <Pressable onPress={() => setConfirming(true)} accessibilityRole="button" className="p-sm">
          <Text className="font-semibold text-danger">Delete my account</Text>
        </Pressable>
        <Text className="px-sm pb-sm text-[13px] text-paper-500 dark:text-ink-textMuted">
          Permanently deletes your profile, visitor passes, issues, and all other data tied to your account.
          This can&apos;t be undone.
        </Text>
      </Card>

      <ConfirmDialog
        visible={confirming}
        title="Delete your account?"
        message="This permanently deletes your profile, visitor passes, issues, and all other data tied to your account. This can't be undone."
        confirmLabel="Delete account"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
