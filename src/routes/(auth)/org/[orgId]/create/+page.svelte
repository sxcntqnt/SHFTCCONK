<script lang="ts">
  import { enhance } from '$app/forms';
  import { Truck, ShieldCheck, Plus, Car, UserCheck, ChevronRight, Users, Lock } from '@lucide/svelte';
  
  let isLoading = false;
  let step = 0; // 0: Choice, 1: SACCO Details (create), 2: Admin Setup
  let mode: 'create' | 'join' | null = null;

  let formData = {
    saccoName: '',
    sasraNumber: '',
    primaryRoutes: '',
    county: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    password: '',
    confirmPassword: '',
    agreed: false
  };

  const counties = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Uasin Gishu', 'Machakos',
    'Kilifi', 'Kwale', 'Makueni', 'Nyeri', 'Murang\'a', 'Meru', 'Embu', 'Kirinyaga',
    'Kakamega', 'Bungoma', 'Busia', 'Siaya', 'Homa Bay', 'Migori', 'Kisii', 'Nyamira',
    'Turkana', 'West Pokot', 'Trans Nzoia', 'Baringo', 'Elgeyo-Marakwet', 'Nandi'
    // Add more as needed – these cover major matatu/SACCO areas
  ];

  function selectMode(selected: 'create' | 'join') {
    mode = selected;
    if (selected === 'create') step = 1;
    else {
      // For 'join': in real app → redirect to /join or show input for SACCO code
      alert('Join flow: Please enter your SACCO invitation code or contact your SACCO admin.');
      // Or navigate('/join-sacco')
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] text-[#1D1D1F] p-6 flex items-center justify-center font-sans">
  <div class="w-full max-w-2xl transition-all duration-700">
    {#if step > 0}
      <div class="flex justify-center gap-3 mb-10">
        <div class="h-1.5 w-16 rounded-full {step >= 1 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-300"></div>
        <div class="h-1.5 w-16 rounded-full {step >= 2 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors duration-300"></div>
      </div>
    {/if}

    <header class="text-center mb-12">
      <h1 class="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Mobility OS</h1>
      <p class="text-[#6E6E73] mt-3 text-xl font-medium">Secure Matatu SACCO Fleet Management</p>
    </header>

    {#if step === 0}
      <div class="card bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-black/10 rounded-3xl overflow-hidden p-10 animate-in fade-in zoom-in-95">
        <h2 class="text-3xl font-semibold text-center mb-8">Get Started</h2>
        <p class="text-center text-gray-600 mb-10">Are you setting up a new SACCO or joining an existing one?</p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            type="button"
            on:click={() => selectMode('create')}
            class="group relative bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 {mode === 'create' ? 'border-blue-600 shadow-lg shadow-blue-200/50' : 'border-gray-200 hover:border-blue-400'} rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <div class="absolute top-6 right-6">
              <Plus class="text-blue-600" size={32} />
            </div>
            <h3 class="font-bold text-2xl mb-3">Create New SACCO</h3>
            <p class="text-gray-700">I'm a SACCO official/founder. I'll manage the umbrella and invite owners/drivers later.</p>
          </button>

          <button 
            type="button"
            on:click={() => selectMode('join')}
            class="group relative bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 {mode === 'join' ? 'border-green-600 shadow-lg shadow-green-200/50' : 'border-gray-200 hover:border-green-400'} rounded-3xl p-8 text-left transition-all duration-300 hover:scale-[1.02]"
          >
            <div class="absolute top-6 right-6">
              <Users class="text-green-600" size={32} />
            </div>
            <h3 class="font-bold text-2xl mb-3">Join Existing SACCO</h3>
            <p class="text-gray-700">I'm a matatu owner or already part of a SACCO. Register under my group.</p>
          </button>
        </div>
      </div>
    {/if}

    {#if step === 1 && mode === 'create'}
      <div class="card bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-black/10 rounded-3xl overflow-hidden animate-in slide-in-from-right">
        <form
          method="POST"
          use:enhance={() => {
            isLoading = true;
            return async ({ result }) => {
              isLoading = false;
              if (result.type === 'success') {
                // In real app: show success with SACCO code, e.g. SUPER-2026-AB12
                alert('SACCO created! Check your email. Next: Invite owners.');
              }
            };
          }}
          class="p-10 space-y-8"
        >
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-lg">
            <h3 class="text-xl font-bold flex items-center gap-3">
              <Lock size={24} /> Privacy-First Design
            </h3>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div class="bg-white/20 backdrop-blur p-4 rounded-xl">
                <strong>SACCO Admin</strong><br/><span class="opacity-90">Full fleet, compliance, analytics</span>
              </div>
              <div class="bg-white/20 backdrop-blur p-4 rounded-xl">
                <strong>Vehicle Owner</strong><br/><span class="opacity-90">Only own matatus, revenue, drivers</span>
              </div>
              <div class="bg-white/20 backdrop-blur p-4 rounded-xl">
                <strong>Driver</strong><br/><span class="opacity-90">Assigned vehicle & shift only</span>
              </div>
            </div>
            <p class="text-xs mt-4 opacity-90 italic">Hierarchical RBAC – owners never see others' data. NTSA-ready isolation.</p>
          </div>

          <div class="space-y-6">
            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">SACCO Name *</label>
              <input bind:value={formData.saccoName} type="text" placeholder="e.g. Super Metro SACCO" required class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">SASRA Registration No. (if licensed)</label>
              <input bind:value={formData.sasraNumber} type="text" placeholder="e.g. CS/1234 or pending" class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Primary Route Code(s)</label>
                <input bind:value={formData.primaryRoutes} type="text" placeholder="e.g. 105, 111, 237" class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
              </div>
              <div>
                <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">County / HQ</label>
                <select bind:value={formData.county} class="select w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5">
                  <option value="">Select County</option>
                  {#each counties as county}
                    <option>{county}</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-4 pt-6">
            <button type="button" on:click={() => step = 0} class="btn btn-ghost rounded-full h-14 px-10 text-lg">Back</button>
            <button type="button" on:click={() => step = 2} disabled={!formData.saccoName.trim()} class="btn flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full h-14 text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2">
              Next: Admin Account
              <ChevronRight size={20} />
            </button>
          </div>
        </form>
      </div>
    {/if}

    {#if step === 2 && mode === 'create'}
      <div class="card bg-white/90 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-black/10 rounded-3xl overflow-hidden animate-in slide-in-from-right">
        <form
          method="POST"
          use:enhance
          class="p-10 space-y-8"
        >
          <div class="text-center mb-6">
            <h2 class="text-3xl font-bold">Create SACCO Admin Account</h2>
            <p class="text-gray-600 mt-2">This will be the main admin for {formData.saccoName || 'your SACCO'}</p>
          </div>

          <div class="space-y-6">
            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Full Name *</label>
              <input bind:value={formData.adminName} type="text" placeholder="e.g. John Mwangi" required class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Email Address *</label>
              <input bind:value={formData.adminEmail} type="email" placeholder="admin@sacco.co.ke" required class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Phone Number (for OTP & alerts)</label>
              <input bind:value={formData.adminPhone} type="tel" placeholder="+254 7XX XXX XXX" class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Password *</label>
              <input bind:value={formData.password} type="password" required class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <div>
              <label class="label-text font-bold uppercase text-sm tracking-wider text-gray-600 mb-2 block">Confirm Password *</label>
              <input bind:value={formData.confirmPassword} type="password" required class="input w-full bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-2xl h-14 text-lg px-5" />
            </div>

            <label class="flex items-start gap-3 cursor-pointer mt-4">
              <input bind:checked={formData.agreed} type="checkbox" class="checkbox checkbox-lg checkbox-primary mt-1" required />
              <span class="text-sm text-gray-700">
                I agree to the <a href='' class="text-blue-600 hover:underline">Terms of Service</a>, <a href='' class="text-blue-600 hover:underline">Privacy Policy</a>, and confirm this is a legitimate SACCO registration for NTSA/SASRA compliance.
              </span>
            </label>
          </div>

          <div class="flex gap-4 pt-8">
            <button type="button" on:click={() => step = 1} class="btn btn-ghost rounded-full h-14 px-10 text-lg">Back</button>
            <button 
              type="submit" 
              disabled={isLoading || !formData.agreed || formData.password !== formData.confirmPassword}
              class="btn flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full h-14 text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-3"
            >
              {#if isLoading}
                <span class="loading loading-spinner loading-md"></span>
                Creating SACCO...
              {:else}
                Complete Registration
              {/if}
            </button>
          </div>
        </form>
      </div>
    {/if}

    <footer class="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6 text-center">
      <div class="bg-white/50 border border-white p-5 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
        <Car class="text-blue-500" size={28} />
        <span class="text-sm font-medium text-gray-700">Owner Data Isolation</span>
      </div>
      <div class="bg-white/50 border border-white p-5 rounded-2xl flex flex-col items-center gap-2 shadow-sm">
        <ShieldCheck class="text-green-500" size={28} />
        <span class="text-sm font-medium text-gray-700">NTSA / SASRA Ready</span>
      </div>
      <div class="bg-white/50 border border-white p-5 rounded-2xl flex flex-col items-center gap-2 shadow-sm col-span-2 sm:col-span-1">
        <Truck class="text-indigo-500" size={28} />
        <span class="text-sm font-medium text-gray-700">Fleet Compliance Tools</span>
      </div>
    </footer>
  </div>
</div>

<style>
  /* Optional: extra polish */
  .card:hover {
    transform: translateY(-4px);
    transition: transform 0.3s ease;
  }
</style>