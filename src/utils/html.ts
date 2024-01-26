/**
 * Fake template literal tag for HTML to enable syntax highlighting in editors.
 * @param strings Template strings.
 * @param  values Template values.
 * @returns Templated string.
 */
export const html = (strings: TemplateStringsArray, ...values: any[]): string =>
  String.raw({ raw: strings }, ...values);
