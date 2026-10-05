import { useCallback } from 'react'
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native'
import { ChevronDown, ChevronRight, Pin } from 'lucide-react-native'
import { AuthFailedBanner } from '../components/AuthFailedBanner'
import { HostDiagnosticsLink } from '../components/HostDiagnosticsLink'
import { HostRouteNoticeBanner } from '../components/HostRouteNoticeBanner'
import { MobileRepoIcon } from '../components/MobileRepoIcon'
import { MobileSearchField } from '../components/MobileSearchField'
import { NewWorkspaceFab, FAB_SIZE } from '../components/NewWorkspaceFab'
import { WorktreeListRow } from '../components/WorktreeListRow'
import { useControllerListScroll } from '../gamepad/bindings/use-controller-list-scroll'
import { useSelectionReveal } from '../gamepad/bindings/use-selection-reveal'
import { useWorkspaceControllerBinding } from '../gamepad/bindings/use-workspace-controller-binding'
import { SECTION_HEADER_PREFIX, sectionHeaderId } from '../gamepad/bindings/workspace-list-order'
import { ControllerFocusRing } from '../gamepad/focus/ControllerFocusRing'
import { ZoneFrame } from '../gamepad/zones/ZoneFrame'
import { colors, spacing } from '../theme/mobile-theme'
import type { Worktree } from '../worktree/workspace-list-types'
import { getWorktreeRowIdentity } from '../worktree/worktree-host-row-identity'
import { HostWorkspaceListStates } from '../worktree/host-workspace-list-states'
import { getWorktreeStatus } from '../worktree/workspace-list-sections'
import { repoColor } from '../worktree/repo-color'
import { hostScreenStyles as styles } from './host-screen-styles'
import type { HostScreenController } from './use-host-screen-controller'

// The list's own row key: a pinned workspace also sits under its repo, and the cursor must be on one.
const rowKeyOf = (item: Worktree): string => item.sectionListKey ?? getWorktreeRowIdentity(item)

export function HostWorkspaceList({ controller }: { controller: HostScreenController }) {
  const {
    actions,
    activeWorktreeScroll,
    catalog,
    connState,
    contentMaxWidth,
    displayWorktrees,
    embedded,
    forceReconnectHost,
    hostId,
    insets,
    isReadOnly,
    isWideLayout,
    noticeParam,
    now,
    reconnectAttempts,
    relayRecovery,
    routeNotice,
    router,
    sectionsResult,
    setDismissedNotice,
    settings,
    state
  } = controller
  const { rawSections, sections, uniqueRepoColors } = sectionsResult

  const scrollWorkspaceListTo = useCallback(
    (offset: number) => {
      activeWorktreeScroll.sectionListRef.current
        ?.getScrollResponder()
        ?.scrollTo({ y: offset, animated: false })
    },
    [activeWorktreeScroll.sectionListRef]
  )
  const listScroll = useControllerListScroll(scrollWorkspaceListTo)

  // The controller's view of this list: the order it renders, the activation its rows use, and a
  // selected id it draws. No parallel catalog and no second ordering (BIND-R1, BIND-AC4).
  const selectedWorktreeId = useWorkspaceControllerBinding({
    sections,
    idOf: rowKeyOf,
    onOpen: actions.openWorktreeSession,
    onToggleSection: settings.toggleCollapsed,
    onBack: router.back,
    scrollBy: listScroll.scrollBy
  })

  // The cursor follows the list and the list follows the cursor: a selection that scrolls out of
  // view is brought back, centred, without touching the desktop-active row's own scroll.
  const scrollToWorktree = useCallback(
    (selectedId: string) => {
      const headerKey = selectedId.startsWith(SECTION_HEADER_PREFIX)
        ? selectedId.slice(SECTION_HEADER_PREFIX.length)
        : null
      for (const [sectionIndex, section] of sections.entries()) {
        // The list counts a section's header as its item 0, so the rows start at 1.
        const itemIndex =
          headerKey !== null
            ? section.key === headerKey
              ? 0
              : -1
            : section.data.findIndex((item) => rowKeyOf(item) === selectedId) + 1
        if (itemIndex > 0 || (headerKey !== null && itemIndex === 0)) {
          activeWorktreeScroll.sectionListRef.current?.scrollToLocation({
            sectionIndex,
            itemIndex,
            viewPosition: 0.5,
            animated: false
          })
          return
        }
      }
    },
    [sections, activeWorktreeScroll.sectionListRef]
  )
  const reveal = useSelectionReveal({
    selectedId: selectedWorktreeId,
    idOf: rowKeyOf,
    scrollToId: scrollToWorktree,
    scrollToOffset: scrollWorkspaceListTo,
    headerIdOf: (section) =>
      typeof section === 'object' &&
      section !== null &&
      'key' in section &&
      typeof section.key === 'string'
        ? sectionHeaderId(section.key)
        : null
  })

  return (
    <>
      {/* Auth failed: a latched relay rejection must reach the same re-pair affordance. */}
      {(connState === 'auth-failed' || relayRecovery.pairingRejected) && (
        <AuthFailedBanner
          canRetry={!!hostId}
          onRetry={() => hostId && void forceReconnectHost(hostId)}
          onRepair={() => router.push('/pair-scan')}
          onRemove={() => state.setConfirmRemoveHost(true)}
        />
      )}

      {connState !== 'connected' &&
      !relayRecovery.pairingRejected &&
      reconnectAttempts >= 3 &&
      hostId ? (
        <HostDiagnosticsLink
          onPress={() =>
            router.push({ pathname: '/connection-log', params: { hostId: String(hostId) } })
          }
        />
      ) : null}

      {/* Why a bounced route landed here (e.g. the workspace was deleted on the desktop). */}
      {routeNotice && (
        <HostRouteNoticeBanner
          message={routeNotice}
          onDismiss={() => setDismissedNotice(noticeParam ?? null)}
        />
      )}

      {/* Search bar */}
      {state.showSearch && (
        <View style={styles.searchBar}>
          <MobileSearchField
            value={state.search}
            onChangeText={state.setSearch}
            placeholder="Search worktrees…"
            autoFocus
            // Why: new key per open remounts the focus effect across rapid toggles so the keyboard reappears.
            focusKey={state.showSearch}
            accessibilityLabel="Search worktrees"
          />
        </View>
      )}

      <HostWorkspaceListStates
        connState={connState}
        worktreesLoaded={state.worktreesLoaded}
        displayCount={displayWorktrees.length}
        sectionCount={sections.length}
        catalogError={state.catalogError}
        search={state.search}
        activeFilterCount={settings.activeFilterCount}
      />

      {sections.length > 0 && (
        <View style={styles.listZone}>
          <SectionList
            {...listScroll.handlers}
            ref={activeWorktreeScroll.sectionListRef}
            sections={sections}
            keyExtractor={rowKeyOf}
            stickySectionHeadersEnabled={false}
            // Why: keep the search IME up while tapping clear / scrolling results.
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            viewabilityConfig={reveal.viewabilityConfig}
            onViewableItemsChanged={reveal.onViewableItemsChanged}
            onScrollToIndexFailed={(info) => {
              if (!reveal.onScrollToIndexFailed(info)) {
                activeWorktreeScroll.onScrollToIndexFailed(info)
              }
            }}
            // Why: edge-to-edge under the system nav bar; insets.bottom keeps the last row above it.
            contentContainerStyle={[
              styles.list,
              // Reserve room so the last row stays tappable above the phone's floating "+" (embedded uses the toolbar +).
              { paddingBottom: (embedded ? spacing.lg : FAB_SIZE + spacing.xl) + insets.bottom },
              isWideLayout &&
                !embedded && { maxWidth: contentMaxWidth, width: '100%', alignSelf: 'center' }
            ]}
            renderSectionHeader={({ section }) => {
              if (!section.title) {
                return null
              }
              const isCollapsed = state.collapsedGroups.has(section.key)
              const rawSection = rawSections.find((s) => s.key === section.key)
              const count = rawSection?.data.length ?? 0
              const repoSectionColor =
                state.groupMode === 'repo' ? uniqueRepoColors.get(section.title) : null
              const repoSectionIcon =
                state.groupMode === 'repo' ? state.repoIconsByName.get(section.title) : null
              return (
                <Pressable
                  style={styles.sectionHeader}
                  onPress={() => settings.toggleCollapsed(section.key)}
                >
                  {isCollapsed ? (
                    <ChevronRight size={12} color={colors.textMuted} style={styles.sectionIcon} />
                  ) : (
                    <ChevronDown size={12} color={colors.textMuted} style={styles.sectionIcon} />
                  )}
                  {section.icon === 'pin' && (
                    <Pin size={12} color={colors.textMuted} style={styles.sectionIcon} />
                  )}
                  {state.groupMode === 'repo' ? (
                    <View style={styles.sectionRepoIcon}>
                      <MobileRepoIcon
                        repoIcon={repoSectionIcon}
                        size={14}
                        color={repoSectionColor ?? colors.textSecondary}
                      />
                    </View>
                  ) : null}
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{count}</Text>
                  {selectedWorktreeId === sectionHeaderId(section.key) ? (
                    <ControllerFocusRing radius={6} />
                  ) : null}
                </Pressable>
              )
            }}
            ItemSeparatorComponent={ListSeparator}
            // Why (#8498): manual pull-to-refresh forces a fresh snapshot after a stale-cache reconnect.
            refreshControl={
              <RefreshControl
                refreshing={catalog.refreshing}
                onRefresh={catalog.onRefresh}
                tintColor={colors.textSecondary}
                colors={[colors.textSecondary]}
              />
            }
            renderItem={({ item }) => (
              <WorktreeListRow
                item={item}
                selected={rowKeyOf(item) === selectedWorktreeId}
                isReadOnly={isReadOnly}
                now={now}
                status={getWorktreeStatus(item)}
                repoColor={uniqueRepoColors.get(item.repo) ?? repoColor(item.repo)}
                repoIcon={state.repoIconsByName.get(item.repo) ?? null}
                hideRepo={state.groupMode === 'repo'}
                onPress={actions.openWorktreeSession}
                onLongPress={
                  item.workspaceKind === 'folder-workspace' ? undefined : state.setActionTarget
                }
                onToggleLineage={settings.toggleWorktreeLineage}
              />
            )}
          />
          <ZoneFrame zone="list" />
        </View>
      )}

      {/* Floating "new workspace" button — phone only; embedded sidebars keep the toolbar +. */}
      {!embedded && (
        <NewWorkspaceFab
          onPress={actions.openNewWorktreeModal}
          disabled={connState !== 'connected'}
        />
      )}
    </>
  )
}

function ListSeparator() {
  return <View style={styles.separator} />
}
