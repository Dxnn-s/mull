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
      'The chain rule is for a function tucked inside another function. You differentiate the outside as if the inside were a single variable, then multiply by the derivative of the inside. The second part is the one people forget, and forgetting it is what makes an answer wrong rather than just messy. Take sin(3x): the outside gives cos(3x), the inside gives 3, so the answer is 3cos(3x). The deeper the nesting, the more factors you multiply.',
    questions: [
      {
        q: 'What does the derivative of the outer function get multiplied by?',
        choices: ['The inner function itself', 'The derivative of the inner function', 'The original function', 'The exponent on the outside'],
        answer: 1,
        why: 'Differentiate the outside, then multiply by the derivative of the inside. That second factor is the whole rule.',
      },
      {
        q: 'Differentiating sin(3x) gives 3cos(3x). Where does the 3 come from?',
        choices: ['The derivative of sin', 'The derivative of the inside, 3x', 'The chain rule always adds a constant', 'The coefficient is carried down from sin'],
        answer: 1,
        why: 'The inside is 3x and its derivative is 3, so 3 is the factor the rule multiplies by.',
      },
    ],
  },
  'p-values': {
    concept: 'p-values',
    explanation:
      'A p-value answers one narrow question: if there were really no effect, how often would you see data at least this extreme by luck alone? A small p-value means your result would be surprising in a world with no effect. It does not tell you the chance that your hypothesis is true, and it does not tell you the effect is large or that it matters. A drug trial with p = 0.01 might still have a tiny benefit. The threshold of 0.05 is a convention someone chose, not a law.',
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
        why: 'It is the probability of the data given no effect, never the probability of a hypothesis given the data.',
      },
      {
        q: 'A result is significant at p = 0.01. What can you conclude about the size of the effect?',
        choices: ['It is large', 'It is at least moderate', 'Nothing, significance and size are separate', 'It is 99% of the maximum'],
        answer: 2,
        why: 'A tiny effect measured precisely enough will clear any threshold. Significance is not size.',
      },
    ],
  },
  'kinetic energy': {
    concept: 'kinetic energy',
    explanation:
      'Kinetic energy is the energy something has because it is moving, and it equals one half times mass times velocity squared. The squared term is the part worth holding on to. Doubling the mass doubles the energy, but doubling the speed quadruples it. That is why a car at 60 carries four times the energy of the same car at 30, and why stopping distances grow so fast. Energy is a scalar, so direction never enters it.',
    questions: [
      {
        q: 'A car doubles its speed. What happens to its kinetic energy?',
        choices: ['It doubles', 'It quadruples', 'It stays the same', 'It increases by half'],
        answer: 1,
        why: 'Velocity is squared in the formula, so twice the speed is four times the energy.',
      },
      {
        q: 'Why does direction of travel not change kinetic energy?',
        choices: ['It does change it', 'Because energy is a scalar and velocity is squared', 'Because mass cancels out', 'Because it is measured relative to the ground'],
        answer: 1,
        why: 'Squaring removes the sign, and energy has magnitude only.',
      },
    ],
  },
  osmosis: {
    concept: 'osmosis',
    explanation:
      'Osmosis is water moving across a membrane that lets water through but blocks the dissolved stuff. Water moves toward the side with more solute, which is the side with relatively less water. Nothing is pulling the water; it is just that more water molecules happen to cross toward the crowded side than away from it. Put a raisin in plain water and it swells, because the inside is the crowded side. Put a cell in very salty water and it shrivels for the same reason in reverse.',
    questions: [
      {
        q: 'Which way does water move in osmosis?',
        choices: ['Toward lower solute concentration', 'Toward higher solute concentration', 'Toward higher pressure', 'It moves equally both ways'],
        answer: 1,
        why: 'Water moves toward the crowded side, where there is relatively less water.',
      },
      {
        q: 'A cell placed in very salty water shrivels. Why?',
        choices: ['Salt is pumped in and pushes water out', 'Water leaves toward the saltier outside', 'The membrane dissolves', 'The cell stops making water'],
        answer: 1,
        why: 'Outside is now the crowded side, so net water movement is outward.',
      },
    ],
  },
  'big O notation': {
    concept: 'big O notation',
    explanation:
      'Big O describes how the work an algorithm does grows as the input gets bigger, ignoring constants and small terms. It is about shape, not speed on any particular machine. O(n) means doubling the input roughly doubles the work; O(n squared) means doubling it quadruples the work; O(log n) barely moves. An O(n squared) sort can beat an O(n log n) sort on ten items and lose badly on ten thousand, which is exactly what the notation is telling you.',
    questions: [
      {
        q: 'What does O(n squared) say about doubling the input size?',
        choices: ['Work doubles', 'Work roughly quadruples', 'Work grows by a constant', 'Work is unchanged'],
        answer: 1,
        why: 'Squaring the growth means twice the input is about four times the work.',
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
        why: 'Big O drops constant factors, and those are what decide the race until n gets large.',
      },
    ],
  },
  'supply and demand': {
    concept: 'supply and demand',
    explanation:
      'Demand slopes down because people buy less as price rises; supply slopes up because sellers offer more as price rises. The price settles where the two cross, because any other price leaves either unsold stock or empty shelves, and that pressure moves the price back. The distinction that trips people is between moving along a curve and shifting the whole curve. A price change moves you along. A change in income, taste, or input costs shifts the curve itself.',
    questions: [
      {
        q: 'Incomes rise and people buy more of a normal good at every price. What happened?',
        choices: ['Movement along the demand curve', 'The demand curve shifted right', 'The supply curve shifted left', 'The equilibrium price fell'],
        answer: 1,
        why: 'Something other than the price changed, so the whole curve moves rather than your position on it.',
      },
      {
        q: 'Why does a price above equilibrium not last?',
        choices: ['Sellers are fined', 'Unsold stock builds up and pushes the price down', 'Demand disappears entirely', 'Supply falls to zero'],
        answer: 1,
        why: 'A surplus is the pressure that drags price back toward the crossing point.',
      },
    ],
  },
  'thesis statements': {
    concept: 'thesis statements',
    explanation:
      'A thesis is the one arguable claim your essay exists to defend. The test is whether a reasonable person could disagree with it. "Social media affects teenagers" is a topic, not a thesis, because nobody would argue the other side. "Social media harms teenagers more through comparison than through lost sleep" is a thesis, because someone could take the opposite position and you would then have to prove yours. It also tells the reader what each paragraph has to earn.',
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
        why: 'It is the only one someone could argue against, which is the test.',
      },
      {
        q: 'What is the quickest way to check a thesis?',
        choices: ['Count the words', 'Ask whether anyone could reasonably disagree', 'Check it is the last sentence', 'Make sure it mentions the title'],
        answer: 1,
        why: 'If disagreement is impossible, you have a topic rather than a claim.',
      },
    ],
  },
  'ser vs estar': {
    concept: 'ser vs estar',
    explanation:
      'Both mean "to be", and Spanish splits them by what kind of being you mean. Ser is for what something fundamentally is: identity, origin, profession, the time. Estar is for condition and location: how something is right now, or where it is. The same adjective can take either and change meaning. "Es aburrido" means he is a boring person; "esta aburrido" means he is bored at the moment. Asking "is this permanent or is this the current state" resolves most cases.',
    questions: [
      {
        q: 'You want to say a soup is cold right now. Which verb?',
        choices: ['Ser, because temperature is a property', 'Estar, because it is a current condition', 'Either, they are interchangeable', 'Neither, you would use tener'],
        answer: 1,
        why: 'A temperature that could change is a condition, which is estar.',
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
        why: 'Ser gives the permanent trait, estar gives the passing state.',
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
