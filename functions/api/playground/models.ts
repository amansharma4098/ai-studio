// GET /api/playground/models — list available models
import { json, options } from '../_helpers';

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestGet: PagesFunction = async () => {
  return json([
    { id: 'anthropic/claude-sonnet', name: 'Claude Sonnet', provider: 'anthropic', available: true },
    { id: 'anthropic/claude-haiku', name: 'Claude Haiku', provider: 'anthropic', available: true },
    { id: 'anthropic/claude-opus', name: 'Claude Opus', provider: 'anthropic', available: true },
    { id: 'openai/gpt-4', name: 'GPT-4', provider: 'openai', available: false },
    { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', available: false },
    { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'google', available: false },
    { id: 'meta/llama-3', name: 'Llama 3', provider: 'meta', available: false },
    { id: 'ollama/llama3', name: 'Ollama Llama3', provider: 'ollama', available: false },
  ]);
};
