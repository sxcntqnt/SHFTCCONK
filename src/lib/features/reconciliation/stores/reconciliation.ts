// src/stores/reconciliation.ts
import { writable, type Writable } from 'svelte/store';
import { supabase } from '$lib/supabaseClient';
import type { User } from './user';
import { userStore } from './user';

export interface ReconciliationEvent {
  id: string;
  organization_id: string;
  reference: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  metadata?: Record<string, any>;
}

export const reconciliationStore: Writable<ReconciliationEvent[]> = writable([]);
export const loadingReconciliation: Writable<boolean> = writable(true);

let initialized = false;

export async function initReconciliation() {
  if (initialized) return;
  initialized = true;

  const user: User = $userStore;
  if (!user) throw new Error('User not available for reconciliation store');

  // Fetch historical events (latest-first)
  const { data } = await supabase
    .from<ReconciliationEvent>('reconciliation_events')
    .select('*')
    .eq('organization_id', user.organizationId)
    .order('timestamp', { ascending: false });

  reconciliationStore.set(data || []);
  loadingReconciliation.set(false);

  // Subscribe to real-time inserts
  supabase
    .channel(`realtime-reconciliation-${user.organizationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'reconciliation_events',
      filter: `organization_id=eq.${user.organizationId}`
    }, payload => {
      const newEvent: ReconciliationEvent = payload.new;
      reconciliationStore.update(events => [newEvent, ...events]);
    })
    .subscribe();
}