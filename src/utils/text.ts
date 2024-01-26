/**
 * Escapes a string to be used in HTML.
 * @param string The string to escape.
 * @returns The escaped string.
 */
const escapeHtml = (string: unknown) => new Option(string as string).innerHTML;

/**
 * Template literal tag that returns a string with HTML entities escaped.
 * @param strings Template strings.
 * @param values Template values.
 * @returns The escaped string.
 */
export const text = (strings: TemplateStringsArray, ...values: unknown[]) =>
  strings.reduce(
    (result, string, index) =>
      result +
      escapeHtml(string) +
      (index < values.length ? escapeHtml(values[index]) : ''),
    '',
  );
