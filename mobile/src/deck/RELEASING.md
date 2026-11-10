# Releasing Orcapad

DECK-R45/R46: the fork publishes its own signed APKs to `Theodagan/orcapad` GitHub Releases, under
the `orcapad-android-v*` prefix, from `.github/workflows/mobile-android-release.yml`.

## The key

One release key, kept for the life of the app. Losing it forces every user to uninstall and
reinstall: Android refuses an update signed by a different key.

- The keystore lives **outside this repository** — in the owner's password manager, one entry
  (`Orcapad release key`), holding the `.keystore` file and its two passwords.
- CI gets it as repository secrets and one variable:

| Name                              | Kind     | What it is                                   |
| --------------------------------- | -------- | -------------------------------------------- |
| `ORCA_ANDROID_KEYSTORE_BASE64`    | secret   | the keystore, base64-encoded                 |
| `ORCA_ANDROID_KEYSTORE_PASSWORD`  | secret   | the keystore password                        |
| `ORCA_ANDROID_KEY_ALIAS`          | secret   | the key alias inside it                      |
| `ORCA_ANDROID_KEY_PASSWORD`       | secret   | that key's password                          |
| `ORCA_ANDROID_RELEASE_CERT_SHA256`| variable | the certificate's SHA-256, as the workflow's check expects |

## What the workflow does

1. **Fails** when any of the five is missing. There is no debug-key fallback any more (DECK-R45):
   a release run either signs with the fork key or does not publish.
2. Tags `orcapad-android-v<version>` and creates the release on this repository.
3. Verifies the built APK's certificate against `ORCA_ANDROID_RELEASE_CERT_SHA256` and fails if the
   public Expo debug certificate is what came out.
4. Publishes the APK and its `.sha256` beside it — the deck's update check reads exactly those.

## What the owner does

Creating the key, filling the secrets and running the workflow are owner-only: no agent creates,
reads or commits signing material, and no agent runs `workflow_dispatch`. This document is the
runbook, not a script.
