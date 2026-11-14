# TODO

Items deferred from current iteration. Add as you think of them.

---

## ✅ Set up TestFlight automation — code shipped

Code-side: done. Follow the one-time Apple + GitHub setup checklist in [`IOS_RELEASE_SETUP.md`](./IOS_RELEASE_SETUP.md) (~5 minutes of clicking through Apple's UI + adding 6 GitHub secrets). After that, releases happen by:

```bash
git tag ios-v1.2 && git push --tags
# ~12 min later, TestFlight has the new build
```

Files in this repo that drive it:
- `ios/App/Gemfile` — fastlane Ruby dep
- `ios/App/fastlane/Fastfile` — `beta` lane: bump versions → archive → upload
- `ios/App/fastlane/Appfile` — bundle ID config
- `.github/workflows/ios-release.yml` — CI trigger on `git tag ios-v*` + manual dispatch

---

## (Add new items below)
