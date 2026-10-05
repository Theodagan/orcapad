import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { readMobileSessionRouteSource } from './mobile-session-route-source-family.test-support'

const sourcePath = './MobileSessionHeader.tsx'
const source = readMobileSessionRouteSource(sourcePath)
const sheetsSource = readMobileSessionRouteSource('./MobileSessionSheets.tsx')
const sourceFile = ts.createSourceFile(
  sourcePath,
  source,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
)

function findAll<T extends ts.Node>(matches: (node: ts.Node) => node is T): T[] {
  const found: T[] = []
  function visit(node: ts.Node): void {
    if (matches(node)) {
      found.push(node)
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return found
}

function findQuickCommandsTabButtons(): ts.JsxSelfClosingElement[] {
  return findAll(
    (node): node is ts.JsxSelfClosingElement =>
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(sourceFile) === 'QuickCommandsTabButton'
  )
}

function attributeText(element: ts.JsxSelfClosingElement | ts.JsxOpeningElement, name: string) {
  const attribute = element.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText(sourceFile) === name
  )
  return attribute?.initializer?.getText(sourceFile)
}

/** Everything between the button and the row of tabs it sits in, or null when it sits in none. */
function nodesBetweenButtonAndTabBar(button: ts.Node): ts.Node[] | null {
  const between: ts.Node[] = []
  for (let current = button.parent; current !== undefined; current = current.parent) {
    if (
      ts.isJsxElement(current) &&
      current.openingElement.tagName.getText(sourceFile) === 'View' &&
      attributeText(current.openingElement, 'style') === '{styles.tabBar}'
    ) {
      return between
    }
    between.push(current)
  }
  return null
}

function isRenderGate(node: ts.Node): boolean {
  return (
    ts.isConditionalExpression(node) ||
    (ts.isBinaryExpression(node) &&
      [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(
        node.operatorToken.kind
      ))
  )
}

function declarationText(name: string): string {
  const [declaration] = findAll(
    (node): node is ts.VariableDeclaration =>
      ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === name
  )
  expect(declaration).toBeDefined()
  return declaration.getText(sourceFile)
}

describe('quick-commands tab stability', () => {
  it('keeps the button mounted while preserving the capability gate', () => {
    const buttons = findQuickCommandsTabButtons()
    expect(buttons).toHaveLength(1)

    // Mounted unconditionally in the tab row: its place never shifts with the host's capability.
    // The controller wraps it in a zone stop, which is not a condition.
    const between = nodesBetweenButtonAndTabBar(buttons[0])
    expect(between).not.toBeNull()
    expect(between?.some(isRenderGate)).toBe(false)

    // The gate lives in the one handler both a tap and the controller call.
    expect(attributeText(buttons[0], 'onPress')).toBe('{openQuickCommands}')
    const handler = declarationText('openQuickCommands')
    expect(handler).toContain('if (quickCommandsSupported === true)')
    expect(handler).toContain('setShowQuickCommands(true)')
    expect(handler).toContain('Desktop update required for quick commands')
    expect(handler).toContain('Checking desktop capabilities — try again in a moment')
  })

  it('only presents the sheet after support is confirmed', () => {
    expect(sheetsSource).toContain('visible={showQuickCommands && quickCommandsSupported === true}')
  })
})
