import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    // Badge is kept in sync with the real unread-notifications count instead
    // (see useBadgeSync in app/_layout.tsx) — letting the OS auto-increment
    // per push received would drift from that the moment something gets
    // marked read in-app rather than tapped from the notification shade.
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission, registers this device with Expo's push service, and
 * upserts the token against the signed-in profile so the backend's
 * /alerts/broadcast can look it up later. Silently no-ops (returns null)
 * rather than throwing when push isn't set up yet for this build — no EAS
 * project configured, no physical device/simulator support, permission
 * denied — since none of those should block using the rest of the app.
 */
export async function registerForPushNotifications(profileId: string): Promise<string | null> {
  // Expo's push-token flow (getExpoPushTokenAsync, native permission
  // prompts) is built for iOS/Android device push, not the browser — the
  // equivalent on web is Web Push/VAPID, a different mechanism entirely.
  // Skipping outright here rather than letting it fail attempting native
  // APIs that don't exist in a browser context.
  if (Platform.OS === 'web') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Emergency alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'emergency_alert.wav',
      vibrationPattern: [0, 250, 250, 250],
      // Lets a security/admin broadcast ring through even when the resident's
      // phone is in Do Not Disturb — Android still requires the resident to
      // grant this app "Do Not Disturb access" by hand in system settings
      // (see requestDndAccess below); this flag just tells the OS to use that
      // access once granted, rather than muting the channel regardless.
      bypassDnd: true,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    // Expected until `eas init`/`eas build:configure` has been run once —
    // that's what writes extra.eas.projectId into app.json.
    console.warn('registerForPushNotifications: no EAS project configured yet, skipping.');
    return null;
  }

  let token: string;
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (error) {
    console.warn('registerForPushNotifications: failed to get a push token.', error);
    return null;
  }

  const saved = await saveToken(profileId, token);
  return saved ? token : null;
}

async function saveToken(profileId: string, token: string): Promise<boolean> {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ profile_id: profileId, token, platform: Platform.OS }, { onConflict: 'token' });

  if (error) {
    console.warn('push-notifications: failed to save token.', error.message);
    return false;
  }
  return true;
}

/**
 * Expo push tokens can rotate underneath an already-signed-in session (app
 * reinstall, restored backup, credential change) — a token saved once at
 * sign-in and never revisited goes stale, and every future push to it just
 * silently fails forever. `addPushTokenListener` fires when that happens,
 * but with the *native* device token (APNs/FCM), not the Expo token this
 * app actually stores and Expo's push API expects — so the fix on a
 * rotation event is to re-derive the Expo token via getExpoPushTokenAsync
 * and re-upsert that, not to save whatever the listener handed us directly.
 */
export function subscribeToPushTokenChanges(profileId: string) {
  if (Platform.OS === 'web') return { remove() {} };

  return Notifications.addPushTokenListener(async () => {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;
    try {
      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await saveToken(profileId, token);
    } catch (error) {
      console.warn('subscribeToPushTokenChanges: failed to refresh rotated token.', error);
    }
  });
}

/**
 * Android only. "Do Not Disturb access" is a system-level permission Android
 * won't let any app request via a prompt — the user has to flip it on
 * themselves in Settings, per-app, because it's powerful (it also lets an app
 * silence *other* apps' notifications). This just opens that settings screen
 * directly instead of leaving the resident to hunt for it, so the emergency
 * channel's `bypassDnd` flag (set above) actually has something to bypass
 * with. No iOS equivalent exists; iOS's version of this is the Critical
 * Alerts entitlement, which only Apple can grant, not the user.
 */
export function requestDndAccess() {
  if (Platform.OS !== 'android') return;
  Linking.sendIntent?.('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
}
