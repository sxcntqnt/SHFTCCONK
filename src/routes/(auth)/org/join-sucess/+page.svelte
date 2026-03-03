<script lang="ts">
  export let data; // from load: { saccoName, joinCode, message, status }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
  <div class="card bg-white rounded-3xl shadow-2xl p-12 max-w-md text-center animate-in zoom-in">
    <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
      <span class="text-green-600 text-4xl">✓</span>
    </div>

    <h1 class="text-3xl font-bold text-green-800 mb-4">Registration Successful!</h1>

    <p class="text-lg text-gray-700 mb-8">
      Welcome to <strong>{data.saccoName}</strong><br/>
      Your owner profile has been created and is pending admin approval (usually 24-48 hours).
    </p>

    <div class="bg-gray-50 p-6 rounded-2xl mb-8">
      <p class="text-sm text-gray-600">Your SACCO Join Code (for reference):</p>
      <div class="text-2xl font-mono font-bold text-blue-700 mt-2">{data.joinCode}</div>
    </div>

    <p class="text-sm text-gray-600 mb-3">Next steps:</p>
    <ul class="list-disc list-inside mb-6 text-left text-sm text-gray-600">
      <li>Check email/SMS for verification &amp; approval notification</li>
      <li>Log in at mobilityos.co.ke/login to add vehicles, invite drivers</li>
      <li>Contact your SACCO admin if approval takes &gt;48h</li>
    </ul>

    <a href='' class="btn bg-green-600 hover:bg-green-700 text-white rounded-full h-14 px-10 text-lg inline-block">
      Go to Dashboard
    </a>
  </div>
</div>
