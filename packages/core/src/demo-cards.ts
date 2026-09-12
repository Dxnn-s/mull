import type { GateCard } from './types.ts';

/**
 * Real cards for demo mode, so the gate can be judged without an API key.
 *
 * The canned lorem card proved the state machine but told you nothing about
 * whether the product is any good: you cannot tell if forty seconds of reading
 * plus two questions is worth it when the questions are "which statement is
 * right" over "the correct one". These are written to the same rules the model
 * is given in prompts.ts, so demo mode reads like the real thing: plain words,
 * a concrete example that is not the user's own question, distractors that are
 * actually tempting, and a one-line why for the answer key.
 */
const CARDS: Record<string, GateCard> = {
  'the chain rule': {
    concept: 'the chain rule',
    explanation:
      'The chain rule is for a function inside another function. First differentiate the outside, treating the inside as one lump. Then multiply by the derivative of the inside. That second step is the one people forget, and forgetting it makes the answer wrong. Take sin(3x). The outside gives cos(3x). The inside, 3x, gives 3. So the answer is 3cos(3x).',
    questions: [
      {
        q: 'What does the derivative of the outer function get multiplied by?',
        choices: ['The inner function itself', 'The derivative of the inner function', 'The original function', 'The exponent on the outside'],
        answer: 1,
        why: 'Outside first, then multiply by the derivative of the inside. That second factor is the whole rule.',
      },
      {
        q: 'Differentiating sin(3x) gives 3cos(3x). Where does the 3 come from?',
        choices: ['The derivative of sin', 'The derivative of the inside, 3x', 'The chain rule always adds a constant', 'The coefficient is carried down from sin'],
        answer: 1,
        why: 'The inside is 3x, and its derivative is 3. That is the factor you multiply by.',
      },
    ],
  },
  'p-values': {
    concept: 'p-values',
    explanation:
      'A p-value answers one question. If there were no real effect, how often would luck alone give you a result this big? A small p-value means your result would be odd in a world where nothing is going on. It does not tell you your idea is true, and it does not tell you the effect is big. A drug can pass with p = 0.01 and still barely help anyone. The 0.05 cutoff is a habit, not a rule.',
    questions: [
      {
        q: 'What does a p-value of 0.03 actually mean?',
        choices: [
          'There is a 3% chance the null hypothesis is true',
          'There is a 97% chance your hypothesis is correct',
          'If there were no effect, data this extreme would show up 3% of the time',
          'The effect is small but real',
        ],
        answer: 2,
        why: 'It is the chance of the data if there is no effect. It is never the chance that an idea is true.',
      },
      {
        q: 'A result is significant at p = 0.01. What can you conclude about the size of the effect?',
        choices: ['It is large', 'It is at least moderate', 'Nothing, significance and size are separate', 'It is 99% of the maximum'],
        answer: 2,
        why: 'Measure a tiny effect precisely enough and it clears any cutoff. Significance is not size.',
      },
    ],
  },
  'kinetic energy': {
    concept: 'kinetic energy',
    explanation:
      'Kinetic energy is the energy of something moving. It is half the mass times the speed squared. The squared part is what matters. Double the mass and the energy doubles. Double the speed and it goes up four times. That is why a car at 60 carries four times the energy of the same car at 30, and why it takes so much further to stop. Direction never matters, because squaring throws the sign away.',
    questions: [
      {
        q: 'A car doubles its speed. What happens to its kinetic energy?',
        choices: ['It doubles', 'It quadruples', 'It stays the same', 'It increases by half'],
        answer: 1,
        why: 'Speed is squared, so twice the speed is four times the energy.',
      },
      {
        q: 'Why does direction of travel not change kinetic energy?',
        choices: ['It does change it', 'Because energy is a scalar and velocity is squared', 'Because mass cancels out', 'Because it is measured relative to the ground'],
        answer: 1,
        why: 'Squaring removes the sign. Energy has a size but no direction.',
      },
    ],
  },
  osmosis: {
    concept: 'osmosis',
    explanation:
      'Osmosis is water moving through a barrier that lets water pass but holds back whatever is dissolved in it. Water moves toward the saltier side. Nothing pulls it. More water molecules simply drift that way than the other way. Drop a raisin in plain water and it swells, because the raisin is the saltier side. Put a cell in very salty water and it shrinks, for the same reason in reverse.',
    questions: [
      {
        q: 'Which way does water move in osmosis?',
        choices: ['Toward lower solute concentration', 'Toward higher solute concentration', 'Toward higher pressure', 'It moves equally both ways'],
        answer: 1,
        why: 'Water moves toward the saltier side, which is the side with less water in it.',
      },
      {
        q: 'A cell placed in very salty water shrivels. Why?',
        choices: ['Salt is pumped in and pushes water out', 'Water leaves toward the saltier outside', 'The membrane dissolves', 'The cell stops making water'],
        answer: 1,
        why: 'Now the outside is saltier, so more water leaves the cell than enters it.',
      },
    ],
  },
  'big O notation': {
    concept: 'big O notation',
    explanation:
      'Big O tells you how the work grows as the input grows. It ignores constants and cares only about the shape. O(n) means twice the input is about twice the work. O(n squared) means twice the input is about four times the work. O(log n) barely grows at all. A slow O(n squared) sort can still beat a fast O(n log n) sort on ten items, then lose badly on ten thousand. That is what the notation is telling you.',
    questions: [
      {
        q: 'What does O(n squared) say about doubling the input size?',
        choices: ['Work doubles', 'Work roughly quadruples', 'Work grows by a constant', 'Work is unchanged'],
        answer: 1,
        why: 'Twice the input, squared, is about four times the work.',
      },
      {
        q: 'Why can an O(n squared) algorithm beat an O(n log n) one on small inputs?',
        choices: [
          'Big O is wrong for small inputs',
          'Big O ignores constants, which dominate when n is small',
          'Small inputs are always O(1)',
          'The faster one has a bug'
        ],
        answer: 1,
        why: 'Big O throws away constants, and constants decide the race until the input gets big.',
      },
    ],
  },
  'supply and demand': {
    concept: 'supply and demand',
    explanation:
      'People buy less when the price goes up, so the demand line slopes down. Sellers offer more when the price goes up, so the supply line slopes up. The price settles where the two lines cross. Above that price, stock piles up and the price falls. Below it, shelves empty and the price rises. The part people mix up: a change in price moves you along a line. Anything else, like incomes or costs, moves the whole line.',
    questions: [
      {
        q: 'Incomes rise and people buy more of a normal good at every price. What happened?',
        choices: ['Movement along the demand curve', 'The demand curve shifted right', 'The supply curve shifted left', 'The equilibrium price fell'],
        answer: 1,
        why: 'The price did not change, something else did, so the whole line moves.',
      },
      {
        q: 'Why does a price above equilibrium not last?',
        choices: ['Sellers are fined', 'Unsold stock builds up and pushes the price down', 'Demand disappears entirely', 'Supply falls to zero'],
        answer: 1,
        why: 'Unsold stock is what drags the price back down to the crossing point.',
      },
    ],
  },
  'thesis statements': {
    concept: 'thesis statements',
    explanation:
      'A thesis is the one claim your essay sets out to prove. The test is simple: could someone reasonably disagree? "Social media affects teenagers" fails, because nobody would argue the other side. "Social media hurts teenagers more through comparison than through lost sleep" works, because someone could argue the opposite and now you have to prove your side. It also tells you what each paragraph has to do.',
    questions: [
      {
        q: 'Which of these is an actual thesis?',
        choices: [
          'This essay examines the causes of the French Revolution',
          'The French Revolution had many causes',
          'Food shortages mattered more than Enlightenment ideas in starting the French Revolution',
          'The French Revolution began in 1789'
        ],
        answer: 2,
        why: 'It is the only one someone could argue against. That is the test.',
      },
      {
        q: 'What is the quickest way to check a thesis?',
        choices: ['Count the words', 'Ask whether anyone could reasonably disagree', 'Check it is the last sentence', 'Make sure it mentions the title'],
        answer: 1,
        why: 'If nobody could disagree, you have a topic, not a claim.',
      },
    ],
  },
  'ser vs estar': {
    concept: 'ser vs estar',
    explanation:
      'Both mean "to be". Ser is for what something is: who it is, where it is from, a job, the time. Estar is for how something is right now, and for where it is. The same adjective can take either one and mean different things. "Es aburrido" means he is a boring person. "Esta aburrido" means he is bored right now. Ask yourself: is this what it is, or how it is at the moment?',
    questions: [
      {
        q: 'You want to say a soup is cold right now. Which verb?',
        choices: ['Ser, because temperature is a property', 'Estar, because it is a current condition', 'Either, they are interchangeable', 'Neither, you would use tener'],
        answer: 1,
        why: 'A temperature can change, so it is how the soup is right now. That is estar.',
      },
      {
        q: 'What is the difference between "es aburrido" and "esta aburrido"?',
        choices: [
          'None, just formality',
          'The first means boring, the second means bored',
          'The first is past tense',
          'The first is plural'
        ],
        answer: 1,
        why: 'Ser gives the lasting trait. Estar gives the passing one.',
      },
    ],
  },
};

/** A written card for this concept, or null to fall back to the generic shape. */
export function demoCard(concept: string): GateCard | null {
  return CARDS[concept.trim().toLowerCase()] ?? null;
}

/** Concepts that have a real written card. Used by the tour so it always lands on one. */
export const DEMO_CONCEPTS = Object.keys(CARDS);
