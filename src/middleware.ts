export type Middleware = (next: MiddlewareCallback) => Promise<any>;
export type MiddlewareCallback = () => Promise<void>;
export type ComposedMiddleware = () => Promise<any>;

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
