<script lang="ts">
  import { enhance } from '$app/forms';
  import { ChevronRight, Users, ShieldCheck, Car, AlertCircle } from '@lucide/svelte';
  
  let isLoading = false;
  let step = 1; // 1: Enter code & basic info, 2: Vehicle (optional), 3: Confirmation
  let error = '';
  let successData: { saccoName: string; joinCode: string; ownerId?: string } | null = null;

  let formData = {
    joinCode: '',
    fullName: '',
    nationalId: '',
    phone: '',
    email: '',
    vehicleReg: '',
    vehicleCapacity: '',
    agreed: false
  };

  async function verifyCode() {
    // In real app: call server action or API to validate code & fetch SACCO name
    // For demo:
    if (formData.joinCode.trim() === '') {
      error = 'Please enter a valid SACCO join code';
      return;
    }
    // Simulate success
    successData = { saccoName: 'Super Metro SACCO', joinCode: formData.joinCode };
    step = 2;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] p-6 flex items-center justify-center">
  <div class="w-full max-w-lg">
    <header class="text-center mb-10">
      <h1 class="text-4xl font-bold text-blue-600">Join SACCO</h1>
      <p class="text-gray-600 mt-2">Register as a Matatu Owner under an existing SACCO</p>
    </header>

    <div class="card bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-in fade-in">
      {#if step === 1}
        <div class="space-y-6">
          <div class="bg-blue-50 p-5 rounded-2xl border border-blue-100">
            <div class="flex items-start gap-3">
              <ShieldCheck class="text-blue-600 mt-1" size={24} />
              <div>
                <h3 class="font-bold">Privacy Assured</h3>
                <p class="text-sm text-gray-700 mt-1">Your revenue, vehicles & driver data stays private — only visible to you and SACCO admin for compliance.</p>
              </div>
            </div>
          </div>

          <div>
            <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">SACCO Join Code *</label>
            <input 
              bind:value={formData.joinCode} 
              type="text" 
              placeholder="e.g. SUPMETRO-AB12 or 2NK-2026" 
              class="input w-full rounded-2xl h-14 px-5 text-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              required 
            />
            <p class="text-xs text-gray-500 mt-2">Ask your SACCO admin or check invitation SMS/WhatsApp</p>
          </div>

          <div class="space-y-5">
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">Full Name *</label>
              <input bind:value={formData.fullName} type="text" placeholder="e.g. Jane Wanjiku" required class="input w-full rounded-2xl h-14 px-5 text-lg" />
            </div>
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">National ID Number *</label>
              <input bind:value={formData.nationalId} type="text" placeholder="12345678" required class="input w-full rounded-2xl h-14 px-5 text-lg" />
            </div>
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">Phone Number *</label>
              <input bind:value={formData.phone} type="tel" placeholder="+254712345678" required class="input w-full rounded-2xl h-14 px-5 text-lg" />
            </div>
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">Email</label>
              <input bind:value={formData.email} type="email" placeholder="you@example.com" class="input w-full rounded-2xl h-14 px-5 text-lg" />
            </div>
          </div>

          <label class="flex items-start gap-3 mt-4">
            <input bind:checked={formData.agreed} type="checkbox" class="checkbox checkbox-primary checkbox-lg" required />
            <span class="text-sm text-gray-700">
              I agree to the SACCO by-laws, NTSA regulations, and confirm I am a legitimate matatu owner/operator.
            </span>
          </label>

          {#if error}<p class="text-red-600 text-sm mt-4 flex items-center gap-2"><AlertCircle size={18} /> {error}</p>{/if}

          <button 
            type="button" 
            on:click={verifyCode}
            disabled={!formData.joinCode.trim() || !formData.fullName.trim() || !formData.nationalId.trim() || !formData.phone.trim() || !formData.agreed}
            class="btn w-full bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 text-lg shadow-lg flex items-center justify-center gap-2"
          >
            Verify & Continue
            <ChevronRight size={20} />
          </button>
        </div>
      {/if}

      {#if step === 2}
        <div class="space-y-6">
          <h2 class="text-2xl font-bold text-center">Add Your Matatu (Optional now)</h2>
          <p class="text-center text-gray-600">You can add vehicles later from your dashboard.</p>

          <div class="space-y-5">
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">Vehicle Registration Number</label>
              <input bind:value={formData.vehicleReg} type="text" placeholder="e.g. KAA 123B" class="input w-full rounded-2xl h-14 px-5 text-lg" />
            </div>
            <div>
              <label class="block uppercase text-sm font-bold text-gray-600 mb-2 tracking-wide">Seating Capacity</label>
              <select bind:value={formData.vehicleCapacity} class="select w-full rounded-2xl h-14 text-lg">
                <option value="">Select</option>
                <option>14</option>
                <option>25</option>
                <option>33</option>
                <option>Other</option>
              </select>
            </div>
            <p class="text-sm text-gray-500 italic">Upload logbook photo / proof of ownership later in dashboard for verification.</p>
          </div>

          <div class="flex gap-4 pt-6">
            <button type="button" on:click={() => step = 1} class="btn btn-ghost rounded-full h-14 px-10">Back</button>
            <button 
              type="button" 
              on:click={() => step = 3}
              class="btn flex-1 bg-green-600 hover:bg-green-700 text-white rounded-full h-14 text-lg shadow-lg"
            >
              Submit Registration
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>