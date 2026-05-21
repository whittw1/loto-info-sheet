# TODO

Items deferred from current iteration. Add as you think of them.

---

## Set up TestFlight automation (one-time, ~2 hours)

**Goal:** ship a new TestFlight build from anywhere — including the iPad in the field via the GitHub mobile app — by tagging a commit. No Xcode, no Mac required at ship time.

**Pieces to add:**
- `fastlane/Fastfile` with a `pilot upload` lane that runs `gym` (Xcode build) → uploads `.ipa` to App Store Connect via the official Apple API
- Apple API key (issued from App Store Connect → Users and Access → Integrations → App Store Connect API) — stored as a GitHub Action secret
- `.github/workflows/ios-release.yml` triggered on `git tag ios-v*`:
  1. macOS runner
  2. Checkout
  3. `npm install` + `npm run sync`
  4. Bump `CURRENT_PROJECT_VERSION` in `project.pbxproj` automatically (e.g. from the tag or from `GITHUB_RUN_NUMBER`)
  5. `fastlane pilot upload`
  6. (Optional) bump `MARKETING_VERSION` if the tag is `ios-v1.2` style

**End-state workflow:**
```bash
git tag ios-v1.2 && git push --tags
# ~12 min later TestFlight shows the new build
```

From the iPad: GitHub mobile app → repo → Releases → "Draft a new release" → tag name `ios-v1.2` → Publish. Same outcome.

**Cost:** ~2 hours setup, $0 ongoing (Apple API key is free, GitHub Actions macOS minutes are free up to 2000/month on private repos — way more than needed).

**When to do it:** after the field-workflow pain becomes annoying — meaning, after a couple of times wishing you could ship a quick fix without driving back to the Mac.

---

## (Add new items below)
