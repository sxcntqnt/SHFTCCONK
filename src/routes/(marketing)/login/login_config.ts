import { ThemeSupa } from "@supabase/auth-ui-shared"
import type { Provider } from "@supabase/supabase-js"

export const oauthProviders = ["github"] as Provider[]

/**
 * Supabase Auth UI appearance — Matatu Pulse design system.
 *
 * Base: ThemeSupa (structural defaults & component layout).
 * Overrides: Design system hex tokens replace DaisyUI oklch() variables.
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-helpers/auth-ui
 */
export const sharedAppearance = {
  theme: ThemeSupa,

  variables: {
    default: {
      colors: {
        // ── Brand ─────────────────────────────────────────────────
        brand:                          "#F26522",              // --orange
        brandAccent:                    "#d95618",              // --orange hover
        brandButtonText:                "#ffffff",

        // ── Buttons ───────────────────────────────────────────────
        defaultButtonBackground:        "#1a1a20",              // --surface
        defaultButtonBackgroundHover:   "#222230",              // --rim
        defaultButtonText:              "#e8e8f0",              // --text-1

        // ── Inputs ────────────────────────────────────────────────
        inputBackground:                "#13131a",              // --ink-2
        inputBorder:                    "#2a2a38",              // --rim-2
        inputBorderHover:               "#3a3a50",              // --rim
        inputBorderFocus:               "rgba(242,101,34,0.5)",
        inputText:                      "#e8e8f0",              // --text-1
        inputLabelText:                 "#9090aa",              // --text-2
        inputPlaceholder:               "#5a5a72",              // --text-3

        // ── Dividers & links ──────────────────────────────────────
        dividerBackground:              "#2a2a38",              // --rim
        anchorTextColor:                "#F26522",              // --orange
        anchorTextHoverColor:           "#d95618",

        // ── Messages ──────────────────────────────────────────────
        messageText:                    "#9090aa",              // --text-2
        messageTextDanger:              "#f87171",
        messageBackground:              "#1a1a20",              // --surface
        messageBackgroundDanger:        "rgba(248,113,113,0.08)",
        messageBorderDanger:            "rgba(248,113,113,0.25)",
      },

      // ── Typography ──────────────────────────────────────────────
      fonts: {
        bodyFontFamily:   `"DM Sans", system-ui, sans-serif`,
        buttonFontFamily: `"Syne", system-ui, sans-serif`,
        labelFontFamily:  `"DM Sans", system-ui, sans-serif`,
        inputFontFamily:  `"DM Sans", system-ui, sans-serif`,
      },
      fontSizes: {
        baseBodySize:   "0.875rem",
        baseInputSize:  "16px",     // 16px — prevents iOS Safari auto-zoom
        baseLabelSize:  "0.78rem",
        baseButtonSize: "0.9rem",
      },

      // ── Radii & spacing ─────────────────────────────────────────
      radii: {
        borderRadiusButton: "12px",
        buttonBorderRadius: "12px",
        inputBorderRadius:  "10px",
      },
      space: {
        spaceSmall:        "6px",
        spaceMedium:       "12px",
        spaceLarge:        "18px",
        labelBottomMargin: "6px",
        anchorBottomMargin:"8px",
        emailInputSpacing: "10px",
        socialAuthSpacing: "10px",
        buttonPadding:     "12px 16px",
        inputPadding:      "11px 14px",
      },

      // ── Borders ─────────────────────────────────────────────────
      borderWidths: {
        buttonBorderWidth: "0px",
        inputBorderWidth:  "1px",
      },
    },
  },

  // ── Class name hooks ────────────────────────────────────────────
  // "authBtn" retained for any existing CSS that already targets it.
  // "mp-auth-*" hooks are used by authOverrideCSS below.
  className: {
    container: "mp-auth-container",
    button:    "authBtn mp-auth-btn",
    label:     "mp-auth-label",
    input:     "mp-auth-input",
    divider:   "mp-auth-divider",
    message:   "mp-auth-message",
    anchor:    "mp-auth-anchor",
  },
}

/**
 * Paste this block into app.css (or a dedicated auth-overrides.css).
 * Extends the Auth component beyond what variable tokens alone allow.
 *
 * @example  In app.css:
 *   @import "./auth-overrides.css";
 */
export const authOverrideCSS = `
/* ── Matatu Pulse · Supabase Auth UI overrides ── */

.mp-auth-container {
  width: 100%;
}

/* Primary submit button */
.mp-auth-btn[type="submit"],
.authBtn[type="submit"] {
  width: 100%;
  font-weight: 700;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 20px rgba(242,101,34,0.25);
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
}
.mp-auth-btn[type="submit"]:hover,
.authBtn[type="submit"]:hover {
  box-shadow: 0 8px 32px rgba(242,101,34,0.4);
  transform: translateY(-1px);
}

/* Social / OAuth buttons (GitHub, Google, etc.) */
.mp-auth-btn:not([type="submit"]),
.authBtn:not([type="submit"]) {
  border: 1px solid #2a2a38 !important;
  transition: background 0.15s, border-color 0.15s;
}
.mp-auth-btn:not([type="submit"]):hover,
.authBtn:not([type="submit"]):hover {
  border-color: #3a3a50 !important;
}

/* Labels */
.mp-auth-label {
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* Input focus ring */
.mp-auth-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(242,101,34,0.08);
}

/* Divider ("or continue with") */
.mp-auth-divider {
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #5a5a72;
}

/* Anchor links */
.mp-auth-anchor {
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

/* Info and error message banners */
.mp-auth-message {
  border-radius: 10px;
  font-size: 0.82rem;
  line-height: 1.55;
  padding: 12px 14px;
}
`