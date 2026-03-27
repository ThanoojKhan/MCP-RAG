import type { IncomingMessage, ServerResponse } from 'node:http';

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const [{ initializeApplication }] = await Promise.all([import('../src/bootstrap.js')]);

    const app = await initializeApplication();
    app(request, response);
  } catch (error) {
    console.error('Vercel function invocation failed', error);

    if (!response.headersSent) {
      response.statusCode = 500;
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            code: 'FUNCTION_INVOCATION_FAILED',
          },
        }),
      );
      return;
    }

    response.end();
  }
}
