import { logger } from '../config/database.js';
import type { ToolExecutionResult, ToolRegistry } from '../types/index.js';
import { ApiError } from '../utils/apiError.js';

export const createToolRegistry = (registry: ToolRegistry) => ({
  definitions: Object.entries(registry).map(([name, tool]) => ({
    name,
    description: tool.description,
    parameters: tool.parameters,
  })),

  async execute(name: string, rawArguments: string): Promise<ToolExecutionResult> {
    const tool = registry[name];

    if (!tool) {
      throw new ApiError(400, `Unknown tool: ${name}`, 'UNKNOWN_TOOL');
    }

    const args = rawArguments ? JSON.parse(rawArguments) : {};
    const parsed = tool.inputSchema.safeParse(args);

    if (!parsed.success) {
      throw new ApiError(400, 'Invalid tool input', 'INVALID_TOOL_INPUT', parsed.error.flatten());
    }

    logger.info({ tool: name, args: parsed.data }, 'Executing AI tool');

    const result = await tool.execute(parsed.data);
    return { toolName: name, result };
  },
});
