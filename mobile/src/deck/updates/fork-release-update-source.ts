/**
 * The fork's update channel lives in Orca's own `app-update/` folder: Orca's screens ask it too,
 * and nothing outside the deck may import the deck (DECK-R40). The deck reads it from here.
 */
export {
  createForkReleaseUpdateSource,
  FORK_REPO,
  FORK_TAG_PREFIX,
  forkReleaseUpdateSource,
  installableRelease,
  parseForkTagVersions,
  type DeckReleaseAsset,
  type DeckReleaseCheck,
  type ForkReleaseUpdateSource
} from '../../app-update/fork-release-update-source'
