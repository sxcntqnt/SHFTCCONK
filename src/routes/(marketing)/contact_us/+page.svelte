<script lang="ts">
  import { enhance, applyAction } from "$app/forms"
  import type { SubmitFunction } from "@sveltejs/kit"
  import type { FullAutoFill } from "svelte/elements"

  let errors: { [fieldName: string]: string } = $state({})
  let loading = $state(false)
  let showSuccess = $state(false)

  interface FormField {
    id: string
    label: string
    inputType: string
    autocomplete: FullAutoFill
  }

  const formFields: FormField[] = [
    {
      id: "first_name",
      label: "First Name *",
      inputType: "text",
      autocomplete: "given-name",
    },
    {
      id: "last_name",
      label: "Last Name *",
      inputType: "text",
      autocomplete: "family-name",
    },
    {
      id: "email",
      label: "Email *",
      inputType: "email",
      autocomplete: "email",
    },
    {
      id: "phone",
      label: "Phone Number",
      inputType: "tel",
      autocomplete: "tel",
    },
    {
      id: "company",
      label: "Company Name",
      inputType: "text",
      autocomplete: "organization",
    },
    {
      id: "message",
      label: "Message",
      inputType: "textarea",
      autocomplete: "off",
    },
  ]

  const handleSubmit: SubmitFunction = () => {
    loading = true
    errors = {}
    return async ({ update, result }) => {
      await update({ reset: false })
      await applyAction(result)
      loading = false
      if (result.type === "success") {
        showSuccess = true
      } else if (result.type === "failure") {
        errors = result.data?.errors ?? {}
      } else if (result.type === "error") {
        errors = { _: "An error occurred. Please check inputs and try again." }
      }
    }
  }
</script>

<div
  class="flex flex-col lg:flex-row mx-auto my-4 min-h-[70vh] place-items-center lg:place-items-start place-content-center"
>
  <div
    class="max-w-[400px] lg:max-w-[500px] flex flex-col place-content-center p-4 lg:mr-8 lg:mb-8 lg:min-h-[70vh]"
  >
    <div class="px-6">
      <h1 class="text-2xl lg:text-4xl font-bold mb-4">Contact Us</h1>
      <p class="text-lg">Talk to one of our service professionals to:</p>
      <ul class="list-disc list-outside pl-6 py-4 space-y-1">
        <li class="">Get a live demo</li>
        <li class="">Discuss your specific needs</li>
        <li>Get a quote</li>
        <li>Answer any technical questions you have</li>
      </ul>
      <p>Once you complete the form, we'll reach out to you! *</p>
      <p class="text-sm pt-8">
        *Not really for this demo page, but you should say something like that
        😉
      </p>
    </div>
  </div>

  <div
    class="flex flex-col grow m-4 lg:ml-10 min-w-[300px] stdphone:min-w-[360px] max-w-[400px] place-content-center lg:min-h-[70vh]"
  >
    {#if showSuccess}
      <div class="flex flex-col place-content-center lg:min-h-[70vh]">
        <div
          class="card card-bordered shadow-lg py-6 px-6 mx-2 lg:mx-0 lg:p-6 mb-10"
        >
          <div class="text-2xl font-bold mb-4">Thank you!</div>
          <p class="">We've received your message and will be in touch soon.</p>
        </div>
      </div>
    {:else}
      <div class="card card-bordered shadow-lg p-4 pt-6 mx-2 lg:mx-0 lg:p-6">
        <form
          class="form-widget flex flex-col"
          method="POST"
          action="?/submitContactUs"
          use:enhance={handleSubmit}
        >
          {#each formFields as field}
            <label for={field.id}>
              <div class="flex flex-row">
                <div class="text-base font-bold">{field.label}</div>
                {#if errors[field.id]}
                  <div class="text-red-600 grow text-sm ml-2 text-right">
                    {errors[field.id]}
                  </div>
                {/if}
              </div>
              {#if field.inputType === "textarea"}
                <textarea
                  id={field.id}
                  name={field.id}
                  autocomplete={field.autocomplete}
                  rows={4}
                  class="{errors[field.id]
                    ? 'input-error'
                    : ''} h-24 input-sm mt-1 input input-bordered w-full mb-3 text-base py-4"
                ></textarea>
              {:else}
                <input
                  id={field.id}
                  name={field.id}
                  type={field.inputType}
                  autocomplete={field.autocomplete}
                  class="{errors[field.id]
                    ? 'input-error'
                    : ''} input-sm mt-1 input input-bordered w-full mb-3 text-base py-4"
                />
              {/if}
            </label>
          {/each}

          {#if Object.keys(errors).length > 0}
            <p class="text-red-600 text-sm mb-2">
              Please resolve above issues.
            </p>
          {/if}

          <button class="btn btn-primary {loading ? 'btn-disabled' : ''}"
            >{loading ? "Submitting" : "Submit"}</button
          >
        </form>
      </div>
    {/if}
  </div>
</div>
\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
<svelte:head>
  <title>Contact — Matatu Pulse | Get in Touch</title>
  <meta name="description" content="Contact the Matatu Pulse team. Reach us for operator demos, partnership enquiries, press, technical support, or general questions about our Nairobi matatu tracking platform." />
</svelte:head>

<style>
  .page { background: var(--ink); }

  .hero {
    padding: 100px 2rem 88px; text-align: center;
    position: relative; overflow: hidden; border-bottom: 1px solid var(--rim);
  }
  .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 55% 65% at 50% -5%, rgba(242,101,34,0.11), transparent 60%); pointer-events: none; }
  .hero-inner { position: relative; max-width: 640px; margin: 0 auto; }
  .eyebrow { display: inline-block; margin-bottom: 24px; padding: 5px 14px; border-radius: 100px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--orange); background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.22); }
  h1 { font-family: var(--font-display); font-size: clamp(2.2rem,5.5vw,3.6rem); font-weight: 800; letter-spacing: -0.04em; color: var(--text-1); line-height: 1.1; margin-bottom: 18px; }
  h1 em { font-style: normal; color: var(--orange); }
  .hero-sub { font-size: 1.05rem; color: var(--text-2); line-height: 1.7; max-width: 520px; margin: 0 auto; }

  .section { padding: 88px 2rem; }
  .inner { max-width: 1100px; margin: 0 auto; }

  /* ── CONTACT GRID ── */
  .contact-layout { display: grid; grid-template-columns: 1fr 1.5fr; gap: 64px; align-items: start; }

  .contact-sidebar {}
  .sidebar-heading { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: var(--text-1); margin-bottom: 20px; letter-spacing: -0.02em; }
  .contact-option { display: flex; gap: 14px; align-items: flex-start; padding: 18px 0; border-bottom: 1px solid var(--rim); }
  .contact-option:last-child { border-bottom: none; }
  .contact-icon { width: 38px; height: 38px; border-radius: 10px; background: rgba(242,101,34,0.1); border: 1px solid rgba(242,101,34,0.2); display: flex; align-items: center; justify-content: center; color: var(--orange); flex-shrink: 0; }
  .contact-opt-title { font-size: 0.875rem; font-weight: 600; color: var(--text-1); margin-bottom: 3px; }
  .contact-opt-desc { font-size: 0.78rem; color: var(--text-3); line-height: 1.5; margin-bottom: 6px; }
  .contact-opt-link { font-size: 0.8rem; font-weight: 600; color: var(--orange); text-decoration: none; }
  .contact-opt-link:hover { text-decoration: underline; }

  /* ── FORM ── */
  .contact-form-wrap { background: var(--surface); border: 1px solid var(--rim); border-radius: 20px; padding: 40px 36px; position: relative; overflow: hidden; }
  .contact-form-wrap::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--rim-2), transparent); }

  .form-title { font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--text-1); margin-bottom: 6px; letter-spacing: -0.02em; }
  .form-sub { font-size: 0.85rem; color: var(--text-2); margin-bottom: 28px; }

  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-group.full { grid-column: span 2; }
  label { font-size: 0.78rem; font-weight: 600; color: var(--text-2); letter-spacing: 0.03em; }
  input, select, textarea {
    background: var(--ink-2); border: 1px solid var(--rim-2); border-radius: 10px;
    padding: 11px 14px; font-size: 0.875rem; color: var(--text-1);
    font-family: var(--font-body); width: 100%;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none; resize: vertical;
  }
  input:focus, select:focus, textarea:focus { border-color: rgba(242,101,34,0.5); box-shadow: 0 0 0 3px rgba(242,101,34,0.08); }
  input::placeholder, textarea::placeholder { color: var(--text-3); }
  select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236B6880' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
  textarea { min-height: 120px; }

  .submit-btn {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; margin-top: 8px; padding: 13px;
    background: var(--orange); color: #fff; font-family: var(--font-body);
    font-size: 0.9rem; font-weight: 700; border: none; border-radius: 12px; cursor: pointer;
    box-shadow: 0 4px 20px rgba(242,101,34,0.3);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .submit-btn:hover { background: #d95618; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(242,101,34,0.4); }
  .form-note { font-size: 0.72rem; color: var(--text-3); text-align: center; margin-top: 12px; }

  /* ── OFFICES ── */
  .offices-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-top: 48px; }
  .office-card { background: var(--surface); border: 1px solid var(--rim); border-radius: 18px; padding: 28px 24px; }
  .office-city { font-family: var(--font-display); font-size: 1rem; font-weight: 700; color: var(--text-1); margin-bottom: 4px; }
  .office-label { font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--orange); margin-bottom: 14px; }
  .office-address { font-size: 0.845rem; color: var(--text-2); line-height: 1.65; }

  @media (max-width: 900px) { .contact-layout { grid-template-columns: 1fr; gap: 48px; } .offices-grid { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } .offices-grid { grid-template-columns: 1fr; } .contact-form-wrap { padding: 28px 20px; } .section { padding: 64px 1.25rem; } .hero { padding: 72px 1.25rem 64px; } }
</style>

<div class="page">

  <section class="hero">
    <div class="hero-inner">
      <div class="eyebrow">Contact</div>
      <h1>Let's Talk About<br/><em>What You Need</em></h1>
      <p class="hero-sub">Whether you're a commuter with a question, a sacco manager exploring a pilot, or a journalist on deadline — we respond to everything.</p>
    </div>
  </section>

  <section class="section">
    <div class="inner">
      <div class="contact-layout">

        <!-- Sidebar -->
        <div class="contact-sidebar">
          <div class="sidebar-heading">How can we help?</div>

          {#each [
            { title:"Operator Demo", desc:"See the fleet dashboard live on your routes. Demos take 30 minutes via video call.", link:"Schedule a Demo", href:"/contact?type=demo", icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/></svg>` },
            { title:"Partnerships & Saccos", desc:"Join our partner network. We'll assess your fleet size and routes and design a deployment plan.", link:"Enquire Now", href:"/contact?type=partnership", icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>` },
            { title:"Press & Media", desc:"We respond to media enquiries within 4 hours on business days. Data, spokespeople, and imagery available.", link:"Contact Press Team", href:"/press", icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/></svg>` },
            { title:"Technical Support", desc:"Existing partner or API user? Reach our technical team directly at support@matatupulse.co.ke.", link:"support@matatupulse.co.ke", href:"mailto:support@matatupulse.co.ke", icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
            { title:"General Enquiries", desc:"Anything else? Use the form or email us directly at hello@matatupulse.co.ke.", link:"hello@matatupulse.co.ke", href:"mailto:hello@matatupulse.co.ke", icon:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>` },
          ] as o}
            <div class="contact-option">
              <div class="contact-icon">{@html o.icon}</div>
              <div>
                <div class="contact-opt-title">{o.title}</div>
                <p class="contact-opt-desc">{o.desc}</p>
                <a href={o.href} class="contact-opt-link">{o.link} →</a>
              </div>
            </div>
          {/each}
        </div>

        <!-- Form -->
        <div class="contact-form-wrap">
          <div class="form-title">Send Us a Message</div>
          <p class="form-sub">We read and respond to every message. Typical response time is under 4 hours on business days.</p>

          <form action="/contact" method="POST">
            <div class="form-grid">
              <div class="form-group">
                <label for="first">First Name</label>
                <input id="first" name="first" type="text" placeholder="Amara" required />
              </div>
              <div class="form-group">
                <label for="last">Last Name</label>
                <input id="last" name="last" type="text" placeholder="Odhiambo" required />
              </div>
              <div class="form-group">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" placeholder="amara@example.com" required />
              </div>
              <div class="form-group">
                <label for="phone">Phone (optional)</label>
                <input id="phone" name="phone" type="tel" placeholder="+254 7XX XXX XXX" />
              </div>
              <div class="form-group full">
                <label for="type">What's this about?</label>
                <select id="type" name="type">
                  <option value="">Select a topic</option>
                  <option>Operator / Sacco Demo</option>
                  <option>Partnership Enquiry</option>
                  <option>Press / Media</option>
                  <option>Technical Support</option>
                  <option>API / Developer Access</option>
                  <option>Rider Question</option>
                  <option>Other</option>
                </select>
              </div>
              <div class="form-group full">
                <label for="org">Organisation (optional)</label>
                <input id="org" name="org" type="text" placeholder="Sacco name, company, or publication" />
              </div>
              <div class="form-group full">
                <label for="message">Message</label>
                <textarea id="message" name="message" placeholder="Tell us what you're working on or what you need..." required></textarea>
              </div>
            </div>

            <button type="submit" class="submit-btn">
              Send Message
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <p class="form-note">We'll never share your information with third parties.</p>
          </form>
        </div>
      </div>

      <!-- Offices -->
      <div>
        <h3 style="font-family:var(--font-display);font-size:1rem;font-weight:700;color:var(--text-3);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0;margin-top:64px;">Find Us</h3>
        <div class="offices-grid">
          {#each [
            { city:"Nairobi", label:"Headquarters", addr:"Westlands Business Park\n2nd Floor, Ring Road Westlands\nNairobi, Kenya\n\nhello@matatupulse.co.ke" },
            { city:"Operations", label:"Hardware & Fleet", addr:"Industrial Area\nEnterprise Road\nNairobi, Kenya\n\nops@matatupulse.co.ke" },
            { city:"Remote", label:"Distributed Team", addr:"Engineering and data team members work remotely across Nairobi, Mombasa, and Kisumu.\n\nAll enquiries via hello@matatupulse.co.ke" },
          ] as o}
            <div class="office-card">
              <div class="office-city">{o.city}</div>
              <div class="office-label">{o.label}</div>
              <p class="office-address" style="white-space:pre-line;">{o.addr}</p>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </section>

</div>