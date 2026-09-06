import { spawn } from 'node:child_process';
import type { CompletionRequest, Provider } from '../src/types.ts';

/**
 * Eval-only provider: shells out to the local `claude` CLI (Max subscription,
 * no API key needed). Never shipped in the extension or the web app.
 *
 * The CLI keeps its own agent system prompt and ignores --system-prompt-file in
 * -p mode, so the instructions ride in the user turn over stdin. Good enough for
 * scoring the classifier; not how the product calls providers.
 */
export class ClaudeCliProvider implements Provider {
  id = 'claude-cli';
  constructor(private readonly model = 'haiku') {}

  complete(req: CompletionRequest): Promise<string> {
    const args = ['-p', '--model', this.model, '--output-format', 'text'];
    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE_ENTRYPOINT;
    const input = `${req.system}\n\n${req.user}`;
    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, { windowsHide: true, env, stdio: ['pipe', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (err += d));
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve(out.trim());
        else reject(new Error(`claude exited ${code}: ${err.slice(0, 300)}`));
      });
      child.stdin.end(input);
    });
  }
}
