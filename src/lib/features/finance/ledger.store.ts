// lib/finance/ledger.ts
import { v4 as uuidv4 } from 'uuid';

export type LedgerEntryType =
  | 'COLLECTION'
  | 'TARGET_SETTLEMENT'
  | 'SACCO_LEVY'
  | 'OWNER_SHARE'
  | 'DRIVER_INCENTIVE'
  | 'FUEL_DEDUCTION';

/* ============================================================
   LEDGER ENTRY MODEL
   Strict typing with optional reference and notes
============================================================ */
export interface LedgerEntry {
  id: string;
  vehicleId: string;
  driverId: string;
  date: string; // ISO 8601
  type: LedgerEntryType;
  amount: number;
  reference?: string;       // External reference (e.g., transaction id)
  notes?: string;           // Optional internal notes
}

/* ============================================================
   DISTRIBUTION CALCULATION
   Computes how total collections are split among stakeholders
============================================================ */
export interface DistributionResult {
  baseSettlement: number;
  excess: number;
  saccoLevy: number;
  ownerAmount: number;
  driverIncentive: number;
}

/**
 * Calculate revenue distribution per vehicle for the day
 * @param totalCollected Total cash collected by the vehicle
 * @param target Expected target collection
 * @param saccoPercentage % of base settlement owed to SACCO
 * @returns Detailed distribution breakdown
 */
export function calculateDistribution(
  totalCollected: number,
  target: number,
  saccoPercentage: number
): DistributionResult {
  // Defensive numeric safety
  totalCollected = Math.max(0, totalCollected);
  target = Math.max(0, target);
  saccoPercentage = Math.min(Math.max(0, saccoPercentage), 1);

  const baseSettlement = Math.min(totalCollected, target);
  const excess = Math.max(totalCollected - target, 0);

  const saccoLevy = baseSettlement * saccoPercentage;
  const ownerAmount = baseSettlement - saccoLevy;
  const driverIncentive = excess * 0.5; // 50% of excess goes to driver

  return {
    baseSettlement,
    excess,
    saccoLevy,
    ownerAmount,
    driverIncentive
  };
}

/* ============================================================
   FACTORY / UTILITIES
============================================================ */

/**
 * Create a new ledger entry with auto-generated ID
 */
export function createLedgerEntry(
  vehicleId: string,
  driverId: string,
  type: LedgerEntryType,
  amount: number,
  reference?: string,
  notes?: string,
  date?: string
): LedgerEntry {
  return {
    id: uuidv4(),
    vehicleId,
    driverId,
    type,
    amount,
    reference,
    notes,
    date: date ?? new Date().toISOString()
  };
}

/**
 * Aggregate ledger entries by type or vehicle
 */
export function aggregateLedger(
  entries: LedgerEntry[],
  by: 'type' | 'vehicleId' = 'type'
): Record<string, number> {
  return entries.reduce((acc, entry) => {
    const key = entry[by];
    if (!acc[key]) acc[key] = 0;
    acc[key] += entry.amount;
    return acc;
  }, {} as Record<string, number>);
}