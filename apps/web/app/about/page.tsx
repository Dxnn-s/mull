import Link from 'next/link';

export const metadata = { title: 'Mull · about' };

const steps = [
  ['You hit send.', 'Mull reads the prompt and labels it lazy, legit, or edge, with a confidence.'],
  ['Legit goes through.', 'Your own draft, your own code, a decision, a status check. Released instantly.'],
  ['Lazy gets a card.', 'Three to six plain sentences on the concept under your question. Then one to three questions.'],
  ['Pass, and it sends.', 'Every answer right releases the prompt untouched. A miss sends you back to read again.'],
  ['Passed concepts stay open.', 'A week, by default. You are never quizzed twice on the same idea.'],
];

export default function AboutPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 96px' }}>
      <div className="eyebrow"><span className="dot" />mull · about</div>
      <h1 style={{ fontSize: 52, margin: '10px 0 10px', lineHeight: 1.05 }}>Opal, for AI.</h1>
      <p style={{ fontSize: 18, lineHeight: 1.5, maxWidth: '48ch', margin: '0 0 28px' }}>
        You type a lazy question into ChatGPT, Claude, or Gemini. Mull catches it and makes you read a short explanation and pass a quiz before the answer comes through.
      </p>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, margin: '0 0 10px' }}>Why a gate and not a toggle</h2>
        <p style={{ margin: '0 0 10px' }}>
          Every provider ships a study mode. Nobody keeps it on, for the same reason nobody keeps Screen Time on: the built-in version has no teeth. Opal exists because a switch you can flip back is not a boundary.
        </p>
        <p style={{ margin: 0 }} className="muted">
          Mull sits in front of the chat you already use. The unlock is comprehension, not a timer. Forty seconds, once per concept.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, margin: '0 0 12px' }}>How it works</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 10 }}>
          {steps.map(([head, body]) => (
            <li key={head}>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{head}</span>{' '}
              <span className="muted">{body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, margin: '0 0 10px' }}>What it costs you</h2>
        <p style={{ margin: '0 0 10px' }}>
          No account. You sign in with your own AI provider key, and Mull calls your provider directly. The classifier is a sixty-token reply and the card is a short lesson, so cheap models are fine.
        </p>
        <p style={{ margin: 0, fontSize: 13 }} className="muted mono">
          No server. No telemetry. Your key and your stats live in this browser and nowhere else.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, margin: '0 0 10px' }}>Why now</h2>
        <p style={{ margin: 0 }}>
          The MIT Media Lab study on cognitive debt tracked essay writers with EEG for four months. The group that leaned on an LLM underperformed at neural, linguistic, and behavioral levels, and could not quote its own work. The group that thought first and used AI later used it better. That last finding is the product.
        </p>
      </section>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/" className="btn primary" style={{ textDecoration: 'none' }}>Try it in the chat</Link>
        <Link href="/settings" className="btn" style={{ textDecoration: 'none' }}>Add a key</Link>
      </div>
    </main>
  );
}
