import { Contact } from 'expo-contacts';

interface PickPhoneResult {
  phone?: string;
  cancelled?: boolean;
  error?: string;
}

/**
 * Opens the OS contact picker and returns the first phone number on whatever
 * contact was chosen. `Contact.presentPicker()` is a system UI — it needs no
 * app-level contacts permission of its own (see expo-contacts docs for the
 * current SDK), so this is safe to offer without a separate permission gate.
 */
export async function pickVisitorPhone(): Promise<PickPhoneResult> {
  try {
    const contact = await Contact.presentPicker();
    if (!contact) return { cancelled: true } as const;

    const phones = await contact.getPhones();
    const first = phones.find((p) => p.number?.trim());
    if (!first?.number) {
      return { error: 'That contact doesn’t have a phone number saved.' } as const;
    }
    return { phone: first.number } as const;
  } catch {
    return { error: 'Couldn’t open contacts. Try entering the number instead.' } as const;
  }
}
