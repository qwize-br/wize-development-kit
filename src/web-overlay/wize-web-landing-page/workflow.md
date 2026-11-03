---

code: wize-web-landing-page
description: "Use quando o usuário for criar uma landing page (LP, página de vendas, captura, waitlist, evento): planeja e especifica objetivo, mensagem, estrutura, visual, medição e gate. Não gera código."
name: Landing Page Spec
overlay: web
owner: wize-agent-ux-designer   # Mantis owns the spec; Pepper feeds audience/triggers, Hawkeye owns the gate criteria
status: ready
---

# Landing Page Spec

**Goal.** Turn a landing-page request into a spec a developer can build and a reviewer can gate. **This workflow plans and specifies; it writes no page code.** Implementation lands through `wize-create-story` → `wize-dev-story` on the stack Fury approved in `wize-tech-vision` (options in `web-overlay/stack-catalog.md`).

A landing page converts on its message and its proof first, its visuals second. The spec is built in that order.

## Rules of the pass

- **One page, one conversion goal.** Secondary actions (log in, docs, contact) may exist but never compete with the primary CTA.
- **Never invent proof.** Testimonials, logos, ratings, user counts and metrics come from the user with a source. Missing proof is a `TODO(proof)` placeholder in the spec, and the gate fails while any remains. Do not draft "realistic" examples.
- **Urgency only when it is true.** Countdowns, "limited spots" and scarcity claims need a real deadline or limit the user confirms. Fake urgency is a misleading practice under consumer law (CDC in Brazil) and is out.
- **Brand first.** If the project or client has a design system (`.wize/solutioning/design-system/tokens.json` from `wize-design-system`, a brand guide, an existing site), the page follows it. A new visual direction is chosen only when there is none.
- **Stack-agnostic.** The spec names sections, content, behavior and budgets, never components of a specific library.
- Copy in the spec passes `wize-no-ai-slop` before hand-off.

## Inputs (read if they exist)

- `.wize/planning/brief.md`, `.wize/planning/ux/trigger-map.md` (Pepper), PRD sections about acquisition.
- `.wize/solutioning/design-system/tokens.json` (`wize-design-system`); `.wize/planning/ux/design-tokens.json` as a fallback.
- `.wize/planning/web/seo-strategy.md`, `.wize/planning/web/analytics-plan.md`.

## Output

- `.wize/planning/web/landing-pages/{slug}/spec.md` — one file per page, sections 1–7 below.
- A story stub for `wize-create-story` (step 8).

## Steps

### 1. Conversion brief

Ask only what the inputs do not answer, one round:

- **Goal:** the single action (sign up, buy, book a call, join waitlist, register, download).
- **Audience:** who arrives, what they already know, the job they want done.
- **Traffic source:** ads (which promise?), organic search (which query?), email, social, direct. The headline must match what the source promised.
- **Offer:** what they get, price or "free", what happens right after the CTA.
- **Proof available:** real testimonials, logos, numbers, press, case studies, guarantees — with source. "None yet" is a valid answer.
- **Brand:** existing design system or not; mandatory assets (logo, fonts, colors).
- **Constraints:** languages, legal (LGPD consent, regulated sector), deadline, where it is hosted.

### 2. Message

- **Promise:** headline (outcome for the audience, not a feature list) + subheadline (how, for whom). Write 3 headline options; recommend one and say why.
- **Benefits:** 3–6, each tied to a pain or trigger from the trigger map when it exists.
- **Objections:** list the real reasons this audience would not convert (price, trust, effort, switching cost, risk). Each objection maps to where the page answers it: a benefit, a proof item, the guarantee, or an FAQ entry.
- **CTA copy:** verb + outcome ("Start my free trial"), plus the micro-copy under it that removes the main fear ("No card required").
- Run `wize-no-ai-slop` detect mode on the copy; fix what it flags.

### 3. Structure by page type

Pick the type, then order sections by the questions a visitor asks in sequence (what is it → is it for me → does it work → what does it cost me → what now). Recommended sections per type, not a fixed list:

| Type | Core sections | Usually add |
|---|---|---|
| SaaS / product trial | hero + CTA, product visual, benefits, proof, how it works, pricing or plan hint, FAQ, final CTA | integrations, security/compliance |
| Waitlist / pre-launch | hero + email capture, the problem, what is coming, final capture | founder note, progress updates |
| Event / webinar | what, date/time/timezone, agenda, speakers, registration form | replay policy, calendar add |
| Mobile app | hero + store badges, screenshots in context, benefits, proof, final badges | ratings (real), platform notes |
| Service / agency | promise, cases with results, process, who does it, contact form | pricing range, guarantee |
| Sales page (info product) | promise, problem, mechanism, content, proof, offer + guarantee, FAQ, final CTA | bonus, comparison |

For each chosen section record: purpose (which question or objection it answers), content (final copy or `TODO(...)`), media needed (real screenshot, photo, video — never stock of "people at laptops"), and its CTA if any. Navigation is optional and never leaks the visitor away from the goal; a footer with contact, privacy policy and terms always exists.

### 4. Visual direction

- **With a design system:** list the tokens and components to reuse and any page-specific additions. Stop here.
- **Without one:** choose one intentional direction that fits the audience and sector, and record it as decisions, not adjectives:
  - type pairing (display + body), scale, and why it fits the brand;
  - palette with roles (dominant, accent for the CTA only, neutrals) and the contrast ratio of every text/background pair (WCAG AA: 4.5:1 body, 3:1 large text; 3:1 for CTA and input boundaries and focus rings);
  - layout rhythm per section (where it breaks symmetry, where it stays calm);
  - motion: one entrance sequence for the hero at most, scroll reveals optional, everything with a `prefers-reduced-motion` variant; nothing that delays the CTA or the LCP element.
- Distinctive comes from fitting this brand and this audience, not from a list of banned fonts. Avoid defaults chosen by inertia; state the reason for each choice.
- Fonts are self-hosted or loaded through the framework's font pipeline, never a third-party CSS import at runtime (render-blocking, and it transfers visitor personal data to a third party).

### 5. Measurement

- **Conversion event:** name, trigger, payload (e.g. `lp_signup_submitted {plan, utm_source}`), and where it lands (analytics, CRM, ads pixel). Add it to `.wize/planning/web/analytics-plan.md`.
- **Secondary events:** CTA clicks per section, scroll depth to the final CTA, form start vs submit.
- **UTM handling:** parameters captured and forwarded to the form/CRM.
- **Consent:** which tags need consent before firing (LGPD); the page works with all optional tags denied.
- **Experiment (optional):** one hypothesis, one variable (usually the headline or the offer), the success metric and minimum sample. No A/B test without a stated hypothesis.

### 6. Form and post-conversion

- Fields: only what the next step needs; each extra field has a reason.
- Validation and error messages in the page language; accessible labels.
- Spam protection (honeypot or provider challenge) and where submissions go.
- What the visitor sees next: thank-you state or page, confirmation email, calendar link — and its event.

### 7. Gate criteria (for Hawkeye)

Write these into the spec so `wize-tea-design` and `wize-tea-gate` can check them:

- [ ] Zero `TODO(proof)`, `TODO(copy)` or `TODO(media)` left in the built page.
- [ ] Every proof item traces to a source the user provided; every urgency claim to a real deadline or limit.
- [ ] One `h1`; headings in order; landmarks per `web-overlay/playbooks/semantic-html.md`.
- [ ] axe: zero violations at WCAG AA (`web-overlay/playbooks/wcag-aa.md`); keyboard reaches and activates every CTA and form field.
- [ ] Core Web Vitals within `web-overlay/playbooks/web-perf-budgets.md`: LCP and CLS in a lab run on a mid-range mobile profile, TBT as the lab proxy for INP (field INP after launch); hero image sized and prioritized.
- [ ] Conversion event fires once per submission with the agreed payload; no optional tag fires before consent.
- [ ] Title, meta description, canonical, OG/Twitter image and structured data where it applies (`wize-web-seo-audit` checks).
- [ ] Reduced-motion variant verified; nothing animates before the CTA is usable.
- [ ] Privacy policy and terms linked; contact present.
- [ ] Renders at 360 px, 768 px and 1280 px per `web-overlay/playbooks/responsive-breakpoints.md` with the CTA visible in the first viewport on mobile.

### 8. Hand-off

- Draft one story stub for `wize-create-story`: the page as the unit, ACs taken from section 7, the spec path as the source of truth, assets still pending listed as blockers.
- If the stack is not chosen yet, route to Fury (`wize-tech-vision`) before the story; for a static marketing page, say so in the stub so the stack decision can weigh it.
- Report: spec path, open `TODO`s by type (proof, copy, media), and the decisions the user still owes.

## Anti-patterns

- Generating page code in this pass.
- A fixed section list regardless of page type.
- Animations that delay the LCP element or the CTA.
