/**
 * Fake template literal tag for GraphQL to enable syntax highlighting in
 * editors.
 * @param strings Template strings.
 * @param  values Template values.
 * @returns emplated string.
 */
export const graphql = (
  strings: TemplateStringsArray,
  ...values: any[]
): string => String.raw({ raw: strings }, ...values);
