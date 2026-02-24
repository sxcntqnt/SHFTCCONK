import { json } from '@sveltejs/kit';
import { contracts, requireContractAccess, getContractById } from '$lib/stores/contracts.store';
import { get } from 'svelte/store';

export async function POST({ request }) {
  try {
    const { contractId } = await request.json();

    if (!contractId) {
      return json({ error: 'contractId is required' }, { status: 400 });
    }

    const contract = getContractById(contractId);

    if (!contract) {
      return json({ error: 'Contract not found' }, { status: 404 });
    }

    // Enforce multi-tenant access
    requireContractAccess(contract);

    return json({
      status: 'OK',
      contract
    });
  } catch (err) {
    console.error('Contracts API error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
}