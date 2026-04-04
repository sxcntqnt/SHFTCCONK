// src/lib/server/fabric/writeTripEvent.ts
// Hyperledger Fabric writer used by background workers to persist important trip events.
// NOTE: The request path (API) enqueues into `fabric_queue` instead of calling this
// function directly for every ping. A worker process should call `writeTripEvent`
// for queued jobs.

import { Wallets, Gateway } from 'fabric-network'
import fs from 'fs'
import path from 'path'

export type WriteTripEventPayload = {
  trip_event_id: string
  vehicle_id?: string | null
  org_id: string
  route_corridor?: string | null
  latitude: number
  longitude: number
  accuracy: number
  accuracy_flag: boolean
  timestamp: string
  cell_tower_fallback?: boolean
}

/*
  Implementation notes / decisions (inline comments):
  - Uses MSP identity files on disk (cert, key, connection profile).
  - Keeps function pure: throws on Fabric errors so calling job queue can retry.
  - Does not swallow errors — worker should catch and implement retry/backoff.
  - accuracy_flag: true when accuracy >= 50m (cell-tower fallback behaviour)
*/

export async function writeTripEvent(payload: WriteTripEventPayload): Promise<{ tx_id: string }> {
  // Basic input assertions — keep minimal to avoid duplicating validation library
  if (!payload.trip_event_id || !payload.org_id) throw new Error('missing required fields')

  // Load wallet and connection profile from environment-configured path.
  // These environment variables must be set in the worker runtime.
  const MSP_ID = process.env.FABRIC_MSP_ID
  const IDENTITY_LABEL = process.env.FABRIC_IDENTITY_LABEL
  const CONNECTION_PROFILE = process.env.FABRIC_CONNECTION_PROFILE_PATH

  if (!MSP_ID || !IDENTITY_LABEL || !CONNECTION_PROFILE) {
    throw new Error('Fabric environment configuration incomplete')
  }

  const ccp = JSON.parse(fs.readFileSync(path.resolve(CONNECTION_PROFILE), 'utf8'))
  const wallet = await Wallets.newFileSystemWallet(process.env.FABRIC_WALLET_PATH || './wallet')

  const gateway = new Gateway()
  try {
    await gateway.connect(ccp, { wallet, identity: IDENTITY_LABEL, discovery: { enabled: true, asLocalhost: false } })
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'mychannel')
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'TripEventContract')

    const tx = contract.createTransaction('SubmitTripEvent')
    const txPayload = JSON.stringify({
      trip_event_id: payload.trip_event_id,
      vehicle_id: payload.vehicle_id,
      org_id: payload.org_id,
      route_corridor: payload.route_corridor,
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      accuracy_flag: payload.accuracy_flag,
      timestamp: payload.timestamp,
      cell_tower_fallback: !!payload.cell_tower_fallback,
    })

    // Submit transaction to the chaincode.
    const response = await tx.submit(txPayload)
    const txId = tx.getTransactionId()
    return { tx_id: txId }
  } finally {
    try { gateway.disconnect() } catch (_) {}
  }
}

export default writeTripEvent
