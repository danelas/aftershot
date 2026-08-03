// Minimal Anthropic Messages API client via fetch — the SDK's zod peer dep
// conflicts with Remotion's pinned zod, and Magic edit only needs one call.

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

// Cheap + fast; plenty for short creative direction.
export const AI_MODEL = 'claude-haiku-4-5-20251001';

type Tool = {name: string; description: string; input_schema: object};

/** One forced-tool-call message; returns the tool_use input or throws. */
export async function toolCall(prompt: string, tool: Tool, maxTokens = 400): Promise<any> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: maxTokens,
      tool_choice: {type: 'tool', name: tool.name},
      tools: [tool],
      messages: [{role: 'user', content: prompt}],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const msg = await res.json();
  const use = (msg.content || []).find((c: any) => c.type === 'tool_use');
  if (!use) throw new Error('No structured output');
  return use.input;
}
