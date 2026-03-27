import type { NextFunction, Request, Response } from 'express';

export const asyncHandler =
  <T extends Request, U extends Response>(handler: (request: T, response: U, next: NextFunction) => Promise<unknown>) =>
  (request: T, response: U, next: NextFunction): void => {
    void handler(request, response, next).catch(next);
  };
