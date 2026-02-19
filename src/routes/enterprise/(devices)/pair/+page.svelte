<script lang="ts">
  import { enhance } from '$app/forms';
  import { Cpu, Radio, CheckCircle2, Search, Info, Link as LinkIcon, QrCode, ShieldAlert, Lock } from 'lucide-svelte';
  
  let step = 1;
  let isScanning = false;
  let deviceId = "";
  let plateNumber = "";
  let qrScanned = false;
  let error = "";

  function simulateScan(method: 'qr' | 'ble') {
    isScanning = true;
    setTimeout(() => {
      isScanning = false;
      deviceId = method === 'qr' ? "TRK-9920-X8 (via QR)" : "TRK-9920-X8 (BLE)";
      qrScanned = method === 'qr';
      step = 2;
    }, 1800);
  }

  function linkDevice() {
    if (!plateNumber.trim().match(/^[A-Z]{3}\s?\d{3}[A-Z]$/i)) { // Rough Kenyan plate regex
      error = "Invalid plate format (e.g. KDG 123X)";
      return;
    }
    step = 3;
    // In real: POST to /api/pair → verify cert/attestation → bind in DB
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] p-6 flex items-center justify-center font-sans">
  <div class="w-full max-w-md">
    <div class="card bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden">
      <div class="p-8 space-y-6">
        {#if step === 1}
          <div class="text-center space-y-6">
            <div class="relative inline-block mx-auto">
              <div class="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center">
                <Radio class="text-blue-600 {isScanning ? 'animate-pulse' : ''}" size={56} />
              </div>
              {#if isScanning}
                <div class="absolute inset-0 border-4 border-blue-300 rounded-full animate-ping"></div>
              {/if}
            </div>

            <h2 class="text-3xl font-bold">Pair GPS Tracker</h2>
            <p class="text-gray-600">Securely link tracker to matatu — anti-spoofing & tamper-protected.</p>

            <div class="grid grid-cols-2 gap-4 pt-4">
              <button
                on:click={() => simulateScan('ble')}
                disabled={isScanning}
                class="btn bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-16 text-base shadow-lg flex flex-col items-center justify-center gap-1"
              >
                <Search size={24} />
                {isScanning ? 'Scanning...' : 'BLE Scan'}
              </button>

              <button
                on:click={() => simulateScan('qr')}
                disabled={isScanning}
                class="btn bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-16 text-base shadow-lg flex flex-col items-center justify-center gap-1"
              >
                <QrCode size={24} />
                Scan QR Code
              </button>
            </div>

            <div class="bg-green-50 p-4 rounded-2xl text-sm text-green-800 flex items-start gap-3">
              <Lock size={20} class="mt-1 shrink-0" />
              <div>
                <strong>Secure by Design</strong><br/>
                TLS 1.3 + device certificate • Tamper alerts on unplug/jam
              </div>
            </div>
          </div>
        {:else if step === 2}
          <div class="space-y-6">
            <header class="text-center">
              <CheckCircle2 class="text-green-600 mx-auto mb-4" size={64} />
              <h2 class="text-2xl font-bold">Tracker Detected</h2>
              <p class="text-gray-600 mt-1">ID: <span class="font-mono font-bold">{deviceId}</span></p>
              {#if qrScanned}
                <p class="text-xs text-indigo-600 mt-1">Secure QR attestation verified</p>
              {/if}
            </header>

            <div>
              <label class="block uppercase text-xs font-bold text-gray-600 mb-2 tracking-wider">Matatu Plate Number *</label>
              <input
                bind:value={plateNumber}
                placeholder="e.g. KDG 123X"
                class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 rounded-2xl h-14 text-xl uppercase font-bold text-center"
                maxlength={10}
              />
              {#if error}<p class="text-red-600 text-sm mt-2">{error}</p>{/if}
            </div>

            <div class="bg-amber-50 p-5 rounded-2xl text-sm space-y-3">
              <div class="flex items-start gap-3">
                <ShieldAlert class="text-amber-600 mt-1" size={20} />
                <p><strong>Important:</strong> Linking enables real-time tracking. Owner owns detailed data; SACCO sees only compliance views.</p>
              </div>
              <div class="flex items-start gap-3">
                <Info class="text-blue-600 mt-1" size={20} />
                <p>Unplug/jamming → instant alert to you & SACCO admin.</p>
              </div>
            </div>

            <div class="flex gap-4">
              <button on:click={() => step = 1} class="btn btn-ghost flex-1 rounded-full h-14">Back</button>
              <button
                on:click={linkDevice}
                disabled={!plateNumber.trim()}
                class="btn flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full h-14 shadow-lg"
              >
                Securely Link Tracker
              </button>
            </div>
          </div>
        {:else}
          <div class="text-center py-10 space-y-6">
            <div class="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 class="text-green-600" size={48} />
            </div>
            <h2 class="text-3xl font-bold">Successfully Paired!</h2>
            <p class="text-gray-700 px-4">
              Tracker <span class="font-mono font-bold">{deviceId}</span> is now secured to <span class="font-bold uppercase">{plateNumber}</span>.
            </p>
            <p class="text-sm text-gray-600">
              Real-time telemetry active • Tamper monitoring enabled • MQTT/TLS secured
            </p>

            <button
              on:click={() => { step = 1; deviceId = ""; plateNumber = ""; qrScanned = false; }}
              class="btn btn-outline border-blue-500 text-blue-600 hover:bg-blue-50 rounded-full h-14 px-8 mt-4"
            >
              Pair Another Tracker
            </button>
          </div>
        {/if}
      </div>
    </div>

    <footer class="mt-8 text-center text-sm text-gray-500">
      Powered by secure MQTT + certificate auth • NTSA-compliant tamper logging
    </footer>
  </div>
</div>