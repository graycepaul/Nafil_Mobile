interface PickPhoneResult {
  phone?: string;
  /** The contact's saved name, if it had one - callers pre-fill a name field
   * with this, but the resident can still edit it before submitting. */
  name?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Opens the OS contact picker and returns the first phone number on whatever
 * contact was chosen. `Contact.presentPicker()` is a system UI - it needs no
 * app-level contacts permission of its own (see expo-contacts docs for the
 * current SDK), so this is safe to offer without a separate permission gate.
 *
 * `expo-contacts` is required lazily, inside the try block, rather than as a
 * top-level import: on a dev client built before this dependency was added,
 * the native module doesn't exist yet, and a static import throws at module
 * *evaluation* time - before this function is ever called - which would take
 * down the whole screen that imports this file, not just this button. A
 * lazy require keeps that failure contained to an actual tap, until the
 * client is rebuilt with the module compiled in.
 */
export async function pickVisitorPhone(): Promise<PickPhoneResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Contact, ContactField } = require('expo-contacts') as typeof import('expo-contacts');
    const contact = await Contact.presentPicker();
    if (!contact) return { cancelled: true } as const;

    const phones = await contact.getPhones();
    const first = phones.find((p) => p.number?.trim());
    if (!first?.number) {
      return { error: 'That contact doesn’t have a phone number saved.' } as const;
    }

    // Best-effort: a contact with no name at all (rare, but some SIM-imported
    // ones are number-only) just leaves the name field for the resident to
    // fill in themselves, same as before this existed.
    const { fullName } = await contact.getDetails([ContactField.FULL_NAME]);
    return { phone: first.number, name: fullName?.trim() || undefined } as const;
  } catch {
    return { error: 'Couldn’t open contacts. Try entering the number instead.' } as const;
  }
}
