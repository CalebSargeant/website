# Open requests — session of 2026-09-04/05

Working checklist so nothing from a long session is lost. Delete a line when it
is merged and confirmed, not when the PR is opened.

## Done, in review
- [x] Rebuild calebsargeant.com as a static site that generates the CV — PR #1, merged
- [x] CI: explain a failed custom-domain attach; skip preview on Dependabot — PR #3, #4, merged
- [x] Note that /user/tokens/verify 401s for account-owned tokens — PR #5, open
- [x] Drop the cursor spotlight (only the spotlight) — PR #6, open
- [x] Restore magnetic buttons + hero canvas lean after over-applying the ADR — PR #6
- [x] Profile photo from the Google Sites version, EXIF stripped — PR #6
- [x] Profile photo larger (96px hero / 168px CV / 44mm print) — PR #6
- [x] Favicon is the portrait, face-cropped — PR #6
- [x] Ethernet-style activity lamp, bounded and driven by real events — PR #7, open
- [x] Magnetic buttons on magmamoose + ADR scope clarified — MagmaMoose PR #53, open

## Done, in review
- [x] i18n calebsargeant.com: English + Dutch. Nav switcher, dismissible
      suggestion banner in the offered language, hreflang + x-default, a sitemap
      listing every locale with alternates, localised month names and durations,
      and six PDFs (3 documents x 2 locales). PR #8.

## Logged as issues, deliberately not built
- [x] i18n magmamoose.com in ten languages (en, nl, de, fr, zh, hi, es, ar, af,
      pt-BR) — MagmaMoose/website#54. Scoped, including the templating conversion
      it needs first, the Arabic RTL work, the CJK/Devanagari/Arabic fonts, and
      the translation-review risk on zh/hi/ar.
- [x] i18n the Dun Mir Pro operator console, same ten languages —
      MagmaMoose/dunmir#129. Separate job from the website: React SPA, ~100
      inline strings, and no Intl.* anywhere today so every timestamp and number
      is currently formatted one way for everyone.

## Waiting on Caleb
- [ ] **Delete the `www.calebsargeant.com` DNS record** in Cloudflare, then re-run
      the deploy. Confirmed by the probe in PR #4 to be the only thing blocking
      the site going live; the token is correctly scoped. This is the cutover:
      the Google Sites version goes off `www` at that moment.
- [ ] Add an apex -> www redirect rule afterwards; the apex still serves Google Sites.
- [ ] **Rotate the Cloudflare token** in the 1Password item "Cloudflare MagmaMoose
      GitHub Actions Worker Deploy". Its value was printed into a session
      transcript on 2026-09-04. Move it to a concealed field, not the note.
- [ ] Fill in the PinkRoccade role in `data/experience.yml`: the highlights are
      placeholders marked TODO and `duties: []` is empty, so that role is absent
      from the JDs & Duties document.
- [ ] Merge PRs #5, #6, #7 here and MagmaMoose #53.
