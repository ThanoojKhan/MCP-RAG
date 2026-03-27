import type { IncomingMessage, ServerResponse } from 'node:http';
import { initializeApplication } from '../backend/src/bootstrap.js';
import { logger } from '../backend/src/config/database.js';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const app = await initializeApplication();
    await new Promise<void>((resolve, reject) => {
      app(request, response, (error?: unknown) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch (error) {
    logger.error({ error }, 'Vercel function invocation failed');

    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          success: false,
          error: {
            message: 'Internal server error',
            code: 'FUNCTION_INVOCATION_FAILED',
          },
        }),
      );
      return;
    }

    response.end();
  }
}
