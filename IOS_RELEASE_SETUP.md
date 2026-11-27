# iOS Release Automation — Setup Guide

One-time Apple + GitHub setup so future TestFlight releases happen via `git tag` instead of opening Xcode. After this, the workflow is:

```bash
git tag ios-v1.2
git push --tags
# ~12 minutes later, TestFlight has the new build
```

You can also kick it off from the iPad: GitHub mobile app → repo → Releases → "Draft a new release" → tag `ios-v1.2` → Publish.

---

## Overview

Three GitHub Actions secrets handle authentication. Two handle code signing. One locks the temp keychain on the build runner. Seven total. Apple-side: one API key + one certificate export.

## Step 1 — Create an App Store Connect API key (~3 min)

1. Sign in at [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. **Users and Access** → **Integrations** tab → **App Store Connect API** subsection → **+** to generate a new key
3. **Name:** `GitHub Actions — LOTO Collector` (any name works)
4. **Access:** `App Manager` (sufficient for TestFlight uploads; do not pick `Admin`)
5. Click **Generate**
6. Click **Download API Key** — saves a `.p8` file. **You can only download this once.** Save it somewhere durable (1Password, encrypted note, etc.). If you lose it, revoke and regenerate.
7. Record from the row that appears in the table:
   - **Issuer ID** (UUID, top of the page)
   - **Key ID** (10-char alphanumeric)

## Step 2 — Export your iOS Distribution certificate (~2 min)

You already have an iOS Distribution certificate in your Mac's Keychain (used by Xcode for the manual archives). Export it for the CI runner.

1. Open **Keychain Access** (⌘+Space → "Keychain Access")
2. Left sidebar: **login** keychain → **My Certificates** category
3. Find a certificate named like **"Apple Distribution: HGS Engineering Inc (TEAMID)"** with a disclosure triangle showing a private key beneath it
4. Right-click the certificate → **Export "Apple Distribution: ..."**
5. **File format:** Personal Information Exchange (.p12)
6. Save as `loto-dist.p12` somewhere temporary
7. When prompted, set a **password** — record this; you'll add it as a secret
8. When the system prompts for your Mac login password to unlock the keychain, enter it

> If you don't see an "Apple Distribution" cert (only "Apple Development"), that means Xcode has been auto-managing distribution signing in-memory. In that case, sign in at [developer.apple.com](https://developer.apple.com/account/resources/certificates/list), create a new **Apple Distribution** certificate, download it, double-click to install in Keychain, then come back to step 1.

## Step 3 — Add the 7 GitHub Actions secrets (~3 min)

Open the repo on GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**. Add each:

| Secret Name | Value | Source |
|---|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | The 10-char Key ID | Step 1 |
| `APP_STORE_CONNECT_API_KEY_ISSUER_ID` | The UUID Issuer ID | Step 1 |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | Base64 of the .p8 file (see one-liner below) | Step 1 |
| `IOS_DIST_CERTIFICATE_BASE64` | Base64 of `loto-dist.p12` (see one-liner below) | Step 2 |
| `IOS_DIST_CERTIFICATE_PASSWORD` | The password you set when exporting the .p12 | Step 2 |
| `KEYCHAIN_PASSWORD` | Any random string (used to lock the runner's temp keychain) | Generate fresh, e.g. `openssl rand -hex 16` |

**Base64-encoding the files** — on macOS, in Terminal:

```bash
# .p8 → paste this output into APP_STORE_CONNECT_API_KEY_CONTENT
base64 -i ~/Downloads/AuthKey_XXXXXXXXXX.p8 | pbcopy

# .p12 → paste this output into IOS_DIST_CERTIFICATE_BASE64
base64 -i ~/Downloads/loto-dist.p12 | pbcopy
```

`pbcopy` puts the output on your clipboard so you can paste straight into the GitHub secret field.

After adding all 6 secrets, you'll have 7 entries in the secrets list (the `KEYCHAIN_PASSWORD` doesn't need any external source — just pick any random value).

## Step 4 — Test the workflow (~5 min)

The fastest sanity check is the manual trigger (no tag needed, no version bump):

1. Repo on GitHub → **Actions** tab → **iOS Release to TestFlight** (left sidebar)
2. **Run workflow** button (right side) → branch: `main` (or whichever branch is current) → **Run workflow**
3. Watch the run. ~12 minutes if everything works.
4. If it fails, expand the failing step in the GitHub UI — the error message will point you to the broken secret or step.

If the manual run succeeds, the next real release becomes:

```bash
git tag ios-v1.2 && git push --tags
```

The tag value (`ios-v1.2`) sets `MARKETING_VERSION` to `1.2`. The build number auto-increments to one more than whatever the latest TestFlight build is. If you only want to bump the build (no marketing-version change), use `workflow_dispatch` instead of a tag.

---

## What's in the repo

| Path | Purpose |
|---|---|
| `ios/App/Gemfile` | Ruby dependency: `fastlane` gem |
| `ios/App/fastlane/Fastfile` | The `beta` lane: bump versions → archive → upload |
| `ios/App/fastlane/Appfile` | Bundle ID config |
| `.github/workflows/ios-release.yml` | The CI workflow triggered by tags |

## Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| "No signing certificate 'iOS Distribution' found" | `.p12` didn't import, or exported the wrong cert | Re-export from Keychain Access; confirm it's "Apple Distribution" not "Development" |
| "Authentication credentials are missing or invalid" | API key secrets wrong, or `.p8` not base64'd | Re-base64 the .p8, double-check Key ID + Issuer ID |
| "Provisioning profile doesn't include signing certificate" | Cert is fine but provisioning profile predates this cert | The workflow uses `-allowProvisioningUpdates` so this should auto-resolve on retry. If it persists, regenerate the cert in developer.apple.com and re-export |
| Workflow hangs on "Build and upload" for 30+ min | Xcode is waiting for an interactive prompt (rare) | Cancel run, check logs for any prompt strings, often a permission-list addition needed in `set-key-partition-list` |
| TestFlight build never appears | Build is being processed by Apple — can take 5–20 min after upload completes | Check App Store Connect → My Apps → LOTO Collector → TestFlight tab; processing errors show up here as emails |

## Maintenance

- **API key:** Apple lets it live as long as you want; no rotation required unless you suspect compromise. Revoke at App Store Connect → Users and Access → Integrations.
- **Certificate:** Apple iOS Distribution certs expire after 1 year. When the cert is ~30 days from expiry, Apple emails you. Regenerate, re-export, re-set the `IOS_DIST_CERTIFICATE_BASE64` and `IOS_DIST_CERTIFICATE_PASSWORD` secrets. The provisioning profile is auto-managed so nothing else to update.
- **Build numbers:** `latest_testflight_build_number + 1` is computed at run time, so you can mix manual (Xcode → Organizer) and automated (tag) uploads freely without bookkeeping. The numbers stay monotonic.
