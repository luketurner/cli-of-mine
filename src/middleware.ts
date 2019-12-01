/**
 * @hidden
 */
export type Middleware = (next: MiddlewareCallback) => Promise<any>;

/**
 * @hidden
 */
export type MiddlewareCallback = () => Promise<any>;

/**
 * @hidden
 */
export type ComposedMiddleware = () => Promise<any>;

/**
 *
 * @hidden
 */
export function composeMiddlewares(
  middlewares: Middleware[]
): ComposedMiddleware {
  return middlewares.reduceRight(
    (next: ComposedMiddleware, ware: Middleware) => {
      return async () => ware(next);
    },
    async () => {}
  );
}
