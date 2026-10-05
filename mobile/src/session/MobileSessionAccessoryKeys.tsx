import { View, Text, ScrollView, Pressable } from 'react-native'
import {
  ChevronDown,
  ChevronsRight,
  Keyboard as KeyboardIcon,
  Monitor,
  Plus,
  Smartphone
} from 'lucide-react-native'
import { triggerMediumImpact } from '../platform/haptics'
import { createTerminalLiveAccessoryInput } from '../terminal/terminal-live-accessory-input'
import { ControllerFocusRing } from '../gamepad/focus/ControllerFocusRing'
import { ZoneFrame } from '../gamepad/zones/ZoneFrame'
import { ZoneItem } from '../gamepad/zones/ZoneItem'
import { isTerminalPhoneDisplayMode } from './mobile-session-route-helpers'
import { useHorizontalStripReveal } from './use-horizontal-strip-reveal'
import { colors } from '../theme/mobile-theme'
import { styles } from './mobile-session-styles'
import type { MobileSessionController } from './use-mobile-session-controller'

/** The three fixed buttons come first; the keys follow in the order the row draws them. */
const KEY_ORDER_START = 3

/** The cursor's stop ids; a key's id is its own so a re-ordered row keeps its cursor. */
const STOP = {
  displayMode: 'display-mode',
  liveInput: 'live-input',
  paste: 'paste',
  addCustom: 'add-custom'
} as const
const builtInStopId = (keyId: string): string => `key:${keyId}`
const customStopId = (keyId: string): string => `custom:${keyId}`

/**
 * The terminal's shortcut keys: the row under the agent. Each is also a stop for the controller's
 * D-pad (the shortcuts zone), and pressing one with `A` sends exactly what a tap sends.
 */
export function MobileSessionAccessoryKeys({
  controller
}: {
  controller: MobileSessionController
}) {
  const {
    canSend,
    canCompose,
    activeHandle,
    terminalModes,
    liveInputEnabled,
    toggleLiveInput,
    toggleDisplayMode,
    canPaste,
    handlePaste,
    visibleBuiltInAccessoryKeys,
    customKeys,
    handleAccessoryKey,
    startAccessoryRepeat,
    stopAccessoryRepeat,
    setDeleteKeyTarget,
    setShowCustomKeyModal,
    keyboardLift,
    dismissSoftwareKeyboard
  } = controller

  const strip = useHorizontalStripReveal()
  const toggleActiveDisplayMode = (): void => {
    if (activeHandle) {
      void toggleDisplayMode(activeHandle)
    }
  }

  return (
    <View style={styles.accessoryBar}>
      {/* Why: fixed keyboard escape hatch; outside ScrollView + shortcut path so it can't scroll away or be hidden (#5106). */}
      {keyboardLift > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.keyboardDismissKey,
            pressed && styles.accessoryKeyPressed
          ]}
          onPress={dismissSoftwareKeyboard}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss keyboard"
          accessibilityHint="Hides the software keyboard and keeps the current terminal session open."
        >
          <View style={styles.keyboardDismissGlyph}>
            <KeyboardIcon size={15} color={colors.textSecondary} strokeWidth={2} />
            <ChevronDown
              size={10}
              color={colors.textSecondary}
              strokeWidth={2.5}
              style={styles.keyboardDismissChevron}
            />
          </View>
        </Pressable>
      )}
      {/* Why: default tap handling makes the first accessory-key tap dismiss the keyboard and get swallowed (#5106). */}
      <ScrollView
        ref={strip.scrollRef}
        {...strip.scrollProps}
        style={styles.accessoryScroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accessoryContent}
        keyboardShouldPersistTaps="always"
      >
        <ZoneItem
          zone="shortcuts"
          id={STOP.displayMode}
          order={0}
          disabled={!canSend}
          onActivate={toggleActiveDisplayMode}
          onReveal={() => strip.reveal(STOP.displayMode)}
        >
          {({ focused, focusRef }) => (
            <Pressable
              ref={focusRef}
              {...strip.frameProps(STOP.displayMode)}
              style={({ pressed }) => [
                styles.accessoryKey,
                pressed && styles.accessoryKeyPressed,
                !canSend && styles.accessoryKeyDisabled
              ]}
              disabled={!canSend}
              onPress={toggleActiveDisplayMode}
              accessibilityLabel={
                isTerminalPhoneDisplayMode(activeHandle, terminalModes)
                  ? 'Switch to desktop mode'
                  : 'Switch to phone mode'
              }
            >
              {isTerminalPhoneDisplayMode(activeHandle, terminalModes) ? (
                <Monitor size={14} color={canSend ? colors.textSecondary : colors.textMuted} />
              ) : (
                <Smartphone size={14} color={canSend ? colors.textSecondary : colors.textMuted} />
              )}
              {focused ? <ControllerFocusRing radius={6} /> : null}
            </Pressable>
          )}
        </ZoneItem>
        <ZoneItem
          zone="shortcuts"
          id={STOP.liveInput}
          order={1}
          disabled={!canCompose}
          onActivate={toggleLiveInput}
          onReveal={() => strip.reveal(STOP.liveInput)}
        >
          {({ focused, focusRef }) => (
            <Pressable
              ref={focusRef}
              {...strip.frameProps(STOP.liveInput)}
              style={({ pressed }) => [
                styles.accessoryKey,
                liveInputEnabled && styles.accessoryKeyActive,
                pressed && styles.accessoryKeyPressed,
                !canCompose && styles.accessoryKeyDisabled
              ]}
              // Why: offline, live mode is dead but the buffered box still composes — keep the escape hatch tappable (#6713).
              disabled={!canCompose}
              onPress={toggleLiveInput}
              accessibilityLabel={
                liveInputEnabled
                  ? 'Switch to buffered command input'
                  : 'Switch to live terminal input'
              }
            >
              <ChevronsRight
                size={14}
                color={
                  liveInputEnabled
                    ? colors.bgBase
                    : canCompose
                      ? colors.textSecondary
                      : colors.textMuted
                }
              />
              {focused ? <ControllerFocusRing radius={6} /> : null}
            </Pressable>
          )}
        </ZoneItem>
        {canPaste && (
          <ZoneItem
            zone="shortcuts"
            id={STOP.paste}
            order={2}
            disabled={!canSend}
            onActivate={() => void handlePaste()}
            onReveal={() => strip.reveal(STOP.paste)}
          >
            {({ focused, focusRef }) => (
              <Pressable
                ref={focusRef}
                {...strip.frameProps(STOP.paste)}
                style={({ pressed }) => [
                  styles.accessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPress={() => void handlePaste()}
                accessibilityLabel="Paste from clipboard"
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  Paste
                </Text>
                {focused ? <ControllerFocusRing radius={6} /> : null}
              </Pressable>
            )}
          </ZoneItem>
        )}
        {visibleBuiltInAccessoryKeys.map((key, index) => (
          <ZoneItem
            key={key.id}
            zone="shortcuts"
            id={builtInStopId(key.id)}
            order={KEY_ORDER_START + index}
            disabled={!canSend}
            // One press, not the touch path's hold-to-repeat: a held A would otherwise never release.
            onActivate={() => void handleAccessoryKey(createTerminalLiveAccessoryInput(key))}
            onReveal={() => strip.reveal(builtInStopId(key.id))}
          >
            {({ focused, focusRef }) => (
              <Pressable
                ref={focusRef}
                {...strip.frameProps(builtInStopId(key.id))}
                style={({ pressed }) => [
                  styles.accessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPressIn={() => {
                  if (!key.repeatable) {
                    return
                  }
                  const input = createTerminalLiveAccessoryInput(key)
                  void handleAccessoryKey(input)
                  startAccessoryRepeat(input)
                }}
                onPressOut={() => {
                  if (key.repeatable) {
                    stopAccessoryRepeat()
                  }
                }}
                onPress={() => {
                  if (key.repeatable) {
                    return
                  }
                  void handleAccessoryKey(createTerminalLiveAccessoryInput(key))
                }}
                accessibilityLabel={key.accessibilityLabel ?? `Send ${key.label}`}
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  {key.label}
                </Text>
                {focused ? <ControllerFocusRing radius={6} /> : null}
              </Pressable>
            )}
          </ZoneItem>
        ))}
        {customKeys.map((key, index) => (
          <ZoneItem
            key={key.id}
            zone="shortcuts"
            id={customStopId(key.id)}
            order={KEY_ORDER_START + visibleBuiltInAccessoryKeys.length + index}
            disabled={!canSend}
            onActivate={() => void handleAccessoryKey({ bytes: key.bytes })}
            onReveal={() => strip.reveal(customStopId(key.id))}
          >
            {({ focused, focusRef }) => (
              <Pressable
                ref={focusRef}
                {...strip.frameProps(customStopId(key.id))}
                style={({ pressed }) => [
                  styles.accessoryKey,
                  styles.customAccessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPress={() => void handleAccessoryKey({ bytes: key.bytes })}
                onLongPress={() => {
                  triggerMediumImpact()
                  setDeleteKeyTarget(key)
                }}
                delayLongPress={400}
                accessibilityLabel={`Send ${key.label}`}
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  {key.label}
                </Text>
                {focused ? <ControllerFocusRing radius={6} /> : null}
              </Pressable>
            )}
          </ZoneItem>
        ))}
        <ZoneItem
          zone="shortcuts"
          id={STOP.addCustom}
          order={KEY_ORDER_START + visibleBuiltInAccessoryKeys.length + customKeys.length}
          onActivate={() => setShowCustomKeyModal(true)}
          onReveal={() => strip.reveal(STOP.addCustom)}
        >
          {({ focused, focusRef }) => (
            <Pressable
              ref={focusRef}
              {...strip.frameProps(STOP.addCustom)}
              style={({ pressed }) => [styles.accessoryKey, pressed && styles.accessoryKeyPressed]}
              onPress={() => setShowCustomKeyModal(true)}
              accessibilityLabel="Add custom shortcut"
            >
              <Plus size={14} color={colors.textSecondary} strokeWidth={2.2} />
              {focused ? <ControllerFocusRing radius={6} /> : null}
            </Pressable>
          )}
        </ZoneItem>
      </ScrollView>
      <ZoneFrame zone="shortcuts" />
    </View>
  )
}
