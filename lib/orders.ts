import type { SupabaseClient } from '@supabase/supabase-js';
import { friendlyDbError } from './db-errors';

/**
 * Cancels an order that is still awaiting transfer (the buyer or the seller may
 * do this; the database enforces both the parties and the status, see
 * cancel_order in 0065). Returns a user-facing message on failure, undefined on
 * success. A reserved good goes back on sale server-side.
 */
export async function cancelOrder(client: SupabaseClient, orderId: string): Promise<string | undefined> {
  const { error } = await client.rpc('cancel_order', { p_order_id: orderId });
  return error ? friendlyDbError(error) : undefined;
}
