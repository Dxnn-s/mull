// Exercise the OpenRouter sign-in and the dynamic card path from a desktop
// terminal, before trying either on a phone.
//
//   node --experimental-transform-types tools/try-openrouter.mjs
//   node --experimental-transform-types tools/try-openrouter.mjs "what is the krebs cycle"
//
// Everything about this flow is unit-tested against a mocked fetch and has
// never touched the real service. That is two unknowns at once, and debugging
// OAuth and card generation together on a phone is miserable. This does both
// here, one at a time, and says exactly which half broke.
//
// The key it gets back is scoped to your own OpenRouter account. It is printed
// once so you can paste it into the app, and written nowhere.
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const { authorizeUrl, challengeFor, createVerifier, exchangeCode } = await import('../packages/core/src/oauth.ts');
const { classify, shouldGate } = await import('../packages/core/src/classify.ts');
const { buildGateCard } = await import('../packages/core/src/gate.ts');
const { OpenRouterProvider } = await import('../packages/core/src/providers/openrouter.ts');
const { OPENROUTER_DEFAULT_MODEL } = await import('../packages/core/src/provider-info.ts');

const question = process.argv[2] ?? 'whats the krebs cycle';
const rl = createInterface({ input: stdin, output: stdout });
const step = (n, s) => console.log(`\n\x1b[33m${n}\x1b[0m ${s}`);
const ok = (s) => console.log(`  \x1b[32mok\x1b[0m ${s}`);
const bad = (s) => console.log(`  \x1b[31mfailed\x1b[0m ${s}`);

try {
  let key = process.env.OPENROUTER_KEY?.trim();

  if (key) {
    step('1/3', 'Using OPENROUTER_KEY from the environment, skipping sign in.');
  } else {
    step('1/3', 'Sign in. Open this, approve, then paste the code it gives you.');
    const verifier = createVerifier();
    const challenge = await challengeFor(verifier);
    // No callback_url: OpenRouter shows the code on screen for headless clients.
    console.log(`\n  ${authorizeUrl('', challenge).replace('callback_url=&', '')}\n`);
    const code = (await rl.question('  code: ')).trim();
    if (!code) throw new Error('no code pasted');
    try {
      key = await exchangeCode(code, verifier);
      ok(`got a key ending ${key.slice(-6)}`);
      console.log(`\n  paste this into the app if you want it there:\n  ${key}\n`);
    } catch (e) {
      bad(`the exchange. ${e.message}`);
      console.log('  Codes are single use and expire after ten minutes, so get a fresh one before retrying.');
      throw e;
    }
  }

  const model = process.env.OPENROUTER_MODEL ?? OPENROUTER_DEFAULT_MODEL;
  const provider = new OpenRouterProvider(key, model);
  const settings = { subjects: ['Biology', 'Calculus'], strictness: 'normal' };

  step('2/3', `Classify, on ${model}.`);
  console.log(`  asking: "${question}"`);
  let verdict;
  try {
    verdict = await classify(question, settings, provider, 30_000);
    ok(`${verdict.verdict}, concept "${verdict.concept ?? '-'}", subject "${verdict.subject ?? '-'}"`);
    console.log(`  gate it: ${shouldGate(verdict, settings.strictness)}`);
  } catch (e) {
    bad(`classify. ${e.message}`);
    if (/404/.test(e.message)) console.log('  That model id is gone. Free ids churn; try another from openrouter.ai/models.');
    if (/402|privacy|data policy/i.test(e.message)) console.log('  Free endpoints need the data policy enabled at openrouter.ai/settings/privacy.');
    throw e;
  }

  step('3/3', 'Write the card.');
  try {
    const card = await buildGateCard(question, verdict.concept ?? question, verdict.subject ?? 'general', 2, provider, 60_000);
    ok(`card on "${card.concept}"`);
    console.log(`\n  ${card.explanation}\n`);
    for (const q of card.questions) {
      console.log(`  ${q.q}`);
      q.choices.forEach((ch, i) => console.log(`    ${i === q.answer ? '>' : ' '} ${ch}`));
      console.log(`    why: ${q.why}\n`);
    }
    console.log('\x1b[32mBoth halves work against the real service.\x1b[0m');
  } catch (e) {
    bad(`card generation. ${e.message}`);
    console.log('  Sign in and classify worked, so this is the generator or the model, not OAuth.');
    throw e;
  }
} catch {
  process.exitCode = 1;
} finally {
  rl.close();
}
