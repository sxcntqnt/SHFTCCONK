// lib/finance/reconciliation.ts

export interface PaymentTransaction {
  reference: string;
  amount: number;
  phone: string;
  timestamp: string; // ISO string
  vehicleId?: string; // optional if linked
}

export interface RemittanceRecord {
  vehicleId: string;
  expectedAmount: number;
}

export interface ReconciliationResult {
  vehicleId: string;
  status: 'MATCHED' | 'PARTIAL' | 'UNMATCHED';
  expectedAmount: number;
  collectedAmount: number;
  variance: number;
  transactionRefs: string[];
}

/**
 * Reconciles payments against expected remittances per vehicle.
 * Supports:
 * - Exact matches
 * - Partial matches (over/underpayment)
 * - Multiple payments per vehicle
 */
export function reconcilePayments(
  payments: PaymentTransaction[],
  remittances: RemittanceRecord[]
): ReconciliationResult[] {
  return remittances.map(remit => {
    // Gather all payments matching this vehicle
    const vehiclePayments = payments.filter(p => p.vehicleId === remit.vehicleId);

    const collectedAmount = vehiclePayments.reduce((sum, p) => sum + p.amount, 0);
    const variance = collectedAmount - remit.expectedAmount;

    let status: ReconciliationResult['status'] = 'UNMATCHED';
    if (collectedAmount === remit.expectedAmount) {
      status = 'MATCHED';
    } else if (collectedAmount > 0) {
      status = 'PARTIAL';
    }

    return {
      vehicleId: remit.vehicleId,
      status,
      expectedAmount: remit.expectedAmount,
      collectedAmount,
      variance,
      transactionRefs: vehiclePayments.map(p => p.reference),
    };
  });
}

/**
 * Generates a revenue trend array for charting.
 * Each element is the total collected amount for a vehicle per day.
 */
export function getRevenueTrend(remittances: RemittanceRecord[]): number[] {
  // Example: simple daily sequence assuming remittances is ordered
  return remittances.map(r => r.expectedAmount);
}

/**
 * Calculates overall operator metrics:
 * - Total collected
 * - Total expected
 * - Total variance
 */
export function summarizeReconciliation(results: ReconciliationResult[]) {
  const totalExpected = results.reduce((sum, r) => sum + r.expectedAmount, 0);
  const totalCollected = results.reduce((sum, r) => sum + r.collectedAmount, 0);
  const totalVariance = totalCollected - totalExpected;

  return {
    totalExpected,
    totalCollected,
    totalVariance,
  };
}