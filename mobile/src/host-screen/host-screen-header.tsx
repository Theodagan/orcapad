import { Text, View } from 'react-native'
import {
  ChevronLeft,
  Filter,
  Layers,
  List,
  PanelLeftClose,
  Plus,
  Search,
  SlidersHorizontal,
  SquareTerminal,
  UserCircle,
  X
} from 'lucide-react-native'
import { StatusDot } from '../components/StatusDot'
import { ZoneFrame } from '../gamepad/zones/ZoneFrame'
import { classifyConnection, type ConnectionVerdict } from '../transport/connection-health'
import { colors } from '../theme/mobile-theme'
import { HostHeaderControl } from './HostHeaderControl'
import { hostScreenStyles as styles } from './host-screen-styles'
import type { HostScreenController } from './use-host-screen-controller'

function isErrorVerdict(v: ConnectionVerdict): boolean {
  return v.kind === 'warning' || v.kind === 'unreachable' || v.kind === 'auth-failed'
}

export function HostScreenHeader({ controller }: { controller: HostScreenController }) {
  const {
    actions,
    connState,
    embedded,
    floatingWorkspaceEnabled,
    forceReconnectHost,
    hostId,
    lastConnectedAt,
    onHideSidebar,
    reconnectAttempts,
    relayRecovery,
    settings,
    state
  } = controller

  return (
    <View style={styles.topChrome}>
      <View style={styles.statusBar}>
        <HostHeaderControl
          id="back"
          order={0}
          style={styles.backButton}
          onPress={actions.leaveHost}
          accessibilityLabel="Back to hosts"
          hitSlop={8}
        >
          <ChevronLeft size={22} color={colors.textPrimary} />
        </HostHeaderControl>
        {(() => {
          const headerVerdict = classifyConnection({
            state: connState,
            reconnectAttempts,
            lastConnectedAt,
            ...relayRecovery
          })
          return (
            <>
              <View style={styles.hostIdentity}>
                <StatusDot state={connState} verdict={headerVerdict} />
                <Text style={styles.hostNameText} numberOfLines={1}>
                  {state.hostName || 'Host'}
                </Text>
              </View>
              {connState !== 'connected' &&
                (() => {
                  // Why: auth-failed has its own banner, so suppress the Reconnect button for that verdict.
                  const verdict = headerVerdict
                  const isError = isErrorVerdict(verdict)
                  const showReconnectButton = isError && hostId && verdict.kind !== 'auth-failed'
                  if (!showReconnectButton) {
                    return null
                  }
                  return (
                    <HostHeaderControl
                      id="reconnect"
                      order={1}
                      style={styles.reconnectButton}
                      onPress={() => void forceReconnectHost(hostId!)}
                      hitSlop={8}
                    >
                      <Text style={styles.reconnectButtonText}>Reconnect</Text>
                    </HostHeaderControl>
                  )
                })()}
            </>
          )
        })()}
        {!embedded && floatingWorkspaceEnabled ? (
          <HostHeaderControl
            id="floating-workspace"
            order={2}
            style={[
              styles.floatingWorkspaceHeaderButton,
              connState !== 'connected' && styles.toolbarIconDisabled
            ]}
            onPress={actions.openFloatingWorkspace}
            disabled={connState !== 'connected'}
            accessibilityLabel="Floating Workspace"
            hitSlop={8}
          >
            <SquareTerminal
              size={18}
              color={connState === 'connected' ? colors.textPrimary : colors.textMuted}
            />
          </HostHeaderControl>
        ) : null}
        {embedded && onHideSidebar ? (
          <HostHeaderControl
            id="hide-sidebar"
            order={3}
            style={styles.sidebarCollapseButton}
            onPress={onHideSidebar}
            accessibilityLabel="Hide sidebar"
            hitSlop={8}
          >
            <PanelLeftClose size={14} color={colors.textSecondary} />
          </HostHeaderControl>
        ) : null}
      </View>

      {/* Filter/sort/group toolbar */}
      {embedded ? (
        <View style={styles.embeddedToolbar}>
          <View style={styles.embeddedToolbarRow}>
            <HostHeaderControl
              id="filter"
              order={0}
              row={1}
              home
              ringRadius={12}
              style={[
                styles.filterChip,
                styles.embeddedFilterChip,
                settings.activeFilterCount > 0 && styles.filterChipActive
              ]}
              onPress={() => state.setShowFilterModal(true)}
              accessibilityLabel={`Filter workspaces${settings.activeFilterCount > 0 ? `, ${settings.activeFilterCount} active` : ''}`}
            >
              <Filter
                size={12}
                color={settings.activeFilterCount > 0 ? colors.textPrimary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterChipText,
                  settings.activeFilterCount > 0 && styles.filterChipTextActive
                ]}
                numberOfLines={1}
              >
                Filter{settings.activeFilterCount > 0 ? ` ${settings.activeFilterCount}` : ''}
              </Text>
            </HostHeaderControl>

            <HostHeaderControl
              id="sort"
              order={1}
              row={1}
              style={[styles.modeButton, styles.embeddedModeButton]}
              onPress={() => state.setShowSortPicker(true)}
              accessibilityLabel={`Sort by ${settings.selectedSortLabel}`}
            >
              <SlidersHorizontal size={14} color={colors.textSecondary} />
              <Text style={styles.sortLabel} numberOfLines={1}>
                {settings.selectedSortLabel}
              </Text>
            </HostHeaderControl>

            <HostHeaderControl
              id="group"
              order={2}
              row={1}
              style={[styles.modeButton, styles.embeddedModeButton]}
              onPress={() => state.setShowGroupPicker(true)}
              accessibilityLabel="Group workspaces"
            >
              <Layers size={14} color={colors.textSecondary} />
              <Text style={styles.sortLabel} numberOfLines={1}>
                {state.groupMode === 'none'
                  ? 'Group'
                  : state.groupMode === 'workspaceStatus'
                    ? 'Status'
                    : state.groupMode === 'repo'
                      ? 'Repo'
                      : 'PR'}
              </Text>
            </HostHeaderControl>
          </View>

          <View style={styles.embeddedToolbarRow}>
            <HostHeaderControl
              id="accounts"
              order={0}
              row={2}
              style={[
                styles.embeddedToolbarIconButton,
                connState !== 'connected' && styles.toolbarIconDisabled
              ]}
              onPress={() => actions.navigateFromHostList(`/h/${hostId}/accounts`)}
              disabled={connState !== 'connected'}
              accessibilityLabel="Accounts"
            >
              <UserCircle
                size={16}
                color={connState === 'connected' ? colors.textSecondary : colors.textMuted}
              />
            </HostHeaderControl>

            <HostHeaderControl
              id="tasks"
              order={1}
              row={2}
              style={[
                styles.embeddedToolbarIconButton,
                connState !== 'connected' && styles.toolbarIconDisabled
              ]}
              onPress={() => actions.navigateFromHostList(`/h/${hostId}/tasks`)}
              disabled={connState !== 'connected'}
              accessibilityLabel="Tasks"
            >
              <List
                size={16}
                color={connState === 'connected' ? colors.textSecondary : colors.textMuted}
              />
            </HostHeaderControl>

            {floatingWorkspaceEnabled ? (
              <HostHeaderControl
                id="toolbar-floating-workspace"
                order={2}
                row={2}
                style={[
                  styles.embeddedToolbarIconButton,
                  connState !== 'connected' && styles.toolbarIconDisabled
                ]}
                onPress={actions.openFloatingWorkspace}
                disabled={connState !== 'connected'}
                accessibilityLabel="Floating Workspace"
              >
                <SquareTerminal
                  size={18}
                  color={connState === 'connected' ? colors.textSecondary : colors.textMuted}
                />
              </HostHeaderControl>
            ) : null}

            <HostHeaderControl
              id="new-workspace"
              order={3}
              row={2}
              style={[
                styles.embeddedToolbarIconButton,
                connState !== 'connected' && styles.toolbarIconDisabled
              ]}
              onPress={actions.openNewWorktreeModal}
              disabled={connState !== 'connected'}
              accessibilityLabel="New workspace"
            >
              <Plus
                size={16}
                color={connState === 'connected' ? colors.textPrimary : colors.textMuted}
              />
            </HostHeaderControl>

            <HostHeaderControl
              id="search"
              order={4}
              row={2}
              style={styles.embeddedToolbarIconButton}
              onPress={() => state.setShowSearch((s) => !s)}
              accessibilityLabel={state.showSearch ? 'Close search' : 'Search workspaces'}
            >
              {state.showSearch ? (
                <X size={16} color={colors.textSecondary} />
              ) : (
                <Search size={16} color={colors.textSecondary} />
              )}
            </HostHeaderControl>
          </View>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <HostHeaderControl
            id="filter"
            order={0}
            row={1}
            home
            ringRadius={12}
            style={[styles.filterChip, settings.activeFilterCount > 0 && styles.filterChipActive]}
            onPress={() => state.setShowFilterModal(true)}
            accessibilityLabel={`Filter workspaces${settings.activeFilterCount > 0 ? `, ${settings.activeFilterCount} active` : ''}`}
          >
            <Filter
              size={12}
              color={settings.activeFilterCount > 0 ? colors.textPrimary : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                settings.activeFilterCount > 0 && styles.filterChipTextActive
              ]}
            >
              Filter{settings.activeFilterCount > 0 ? ` (${settings.activeFilterCount})` : ''}
            </Text>
          </HostHeaderControl>

          <HostHeaderControl
            id="sort"
            order={1}
            row={1}
            style={styles.modeButton}
            onPress={() => state.setShowSortPicker(true)}
            accessibilityLabel={`Sort by ${settings.selectedSortLabel}`}
          >
            <SlidersHorizontal size={14} color={colors.textSecondary} />
            <Text style={styles.sortLabel} numberOfLines={1}>
              {settings.selectedSortLabel}
            </Text>
          </HostHeaderControl>

          <HostHeaderControl
            id="group"
            order={2}
            row={1}
            style={styles.modeButton}
            onPress={() => state.setShowGroupPicker(true)}
            accessibilityLabel="Group workspaces"
          >
            <Layers size={14} color={colors.textSecondary} />
            <Text style={styles.sortLabel} numberOfLines={1}>
              {state.groupMode === 'none'
                ? 'Group'
                : state.groupMode === 'workspaceStatus'
                  ? 'Status'
                  : state.groupMode === 'repo'
                    ? 'Repo'
                    : 'PR'}
            </Text>
          </HostHeaderControl>

          <View style={styles.toolbarSpacer} />

          <HostHeaderControl
            id="accounts"
            order={3}
            row={1}
            style={styles.searchToggle}
            onPress={() => actions.navigateFromHostList(`/h/${hostId}/accounts`)}
            disabled={connState !== 'connected'}
            accessibilityLabel="Accounts"
          >
            <UserCircle
              size={16}
              color={connState === 'connected' ? colors.textSecondary : colors.textMuted}
            />
          </HostHeaderControl>

          <HostHeaderControl
            id="tasks"
            order={4}
            row={1}
            style={styles.searchToggle}
            onPress={() => actions.navigateFromHostList(`/h/${hostId}/tasks`)}
            disabled={connState !== 'connected'}
            accessibilityLabel="Tasks"
          >
            <List
              size={16}
              color={connState === 'connected' ? colors.textSecondary : colors.textMuted}
            />
          </HostHeaderControl>

          <HostHeaderControl
            id="search"
            order={5}
            row={1}
            style={styles.searchToggle}
            onPress={() => state.setShowSearch((s) => !s)}
            accessibilityLabel={state.showSearch ? 'Close search' : 'Search workspaces'}
          >
            {state.showSearch ? (
              <X size={16} color={colors.textSecondary} />
            ) : (
              <Search size={16} color={colors.textSecondary} />
            )}
          </HostHeaderControl>
        </View>
      )}
      <ZoneFrame zone="header" />
    </View>
  )
}
