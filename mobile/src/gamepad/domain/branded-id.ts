/**
 * Ids are branded so a WorkspaceId cannot be passed where a SessionId is expected.
 * The brand is erased at runtime: every constructor here returns its input unchanged.
 */

declare const idBrand: unique symbol

export type BrandedId<Name extends string> = string & { readonly [idBrand]: Name }

export function brandId<Name extends string>(value: string): BrandedId<Name> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the brand is a
  // phantom property that exists only in the type system, so widening a string into it is the
  // one place branding can be introduced. Every other module goes through a named constructor.
  return value as BrandedId<Name>
}
