/**
 * Error returned by the GraphQL API.
 */
export class GraphQLError extends Error {
  /**
   * Initialize the error with a GraphQL error object.
   * @param error GraphQL error object.
   */
  constructor(error: {
    message: string | undefined;
    extensions?: { code: string };
    path: string[];
  }) {
    super(error.message);
    this.name = 'GraphQLError';
    this.code = error.extensions?.code;
    this.path = error.path;
  }

  /**
   * Error code.
   */
  code?: string;

  /**
   * Path to the GraphQL field that caused the error.
   */
  path: string[];
}
