import type { GateCard } from './types.ts';

/**
 * The card bank.
 *
 * Mull never answers the user's question, ChatGPT does. All Mull has to produce
 * is a short lesson and two questions, and for the topics people actually study
 * those are the same every time. So they ship with the app: no key, no network,
 * no cost, no wait, and the same on the first run as the thousandth.
 *
 * A model is only needed for a topic the bank has never heard of, which makes
 * linking an AI account an optional upgrade rather than the price of entry.
 *
 * Written to the same rules the model is given in prompts.ts: plain words, a
 * concrete example that is not the user's own question, distractors that are
 * genuinely tempting, and a one line why for the answer key.
 */
export interface BankCard extends GateCard {
  /** Matches a chip in SUBJECT_CHIPS, so picking subjects picks cards. */
  subject: string;
}

const BANK: BankCard[] = [
  {
    subject: 'Calculus',
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
  {
    subject: 'Calculus',
    concept: 'limits at infinity',
    explanation:
      'A limit at infinity asks what a function settles toward as x grows without bound. For a fraction of polynomials, only the highest power on each side matters, because everything else becomes noise next to it. So (3x squared + 5x) over (2x squared - 1) goes to 3/2. If the top has the higher power the limit runs away to infinity. If the bottom does, the limit is zero.',
    questions: [
      {
        q: 'What does (4x squared + 9x) / (2x squared + 1) approach as x grows?',
        choices: ['0', '2', '4', 'Infinity'],
        answer: 1,
        why: 'Same highest power on both sides, so the limit is the ratio of those leading coefficients, 4/2.',
      },
      {
        q: 'Why can the lower-power terms be ignored?',
        choices: ['They are always zero', 'They grow far slower than the highest power', 'They cancel exactly', 'Limits only read the first term written'],
        answer: 1,
        why: 'At huge x the highest power dwarfs the rest, so the others stop affecting the ratio.',
      },
    ],
  },
  {
    subject: 'Statistics',
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
  {
    subject: 'Statistics',
    concept: 'correlation and causation',
    explanation:
      'Correlation says two things move together. Causation says one makes the other happen. They come apart constantly, usually because a third thing drives both. Ice cream sales and drownings rise together, and neither causes the other; summer causes both. The other trap is reversed direction: sick people take more medicine, which makes medicine look harmful if you only read the correlation. Only a controlled experiment settles direction.',
    questions: [
      {
        q: 'Towns with more firefighters have more fire damage. What is the most likely explanation?',
        choices: ['Firefighters cause damage', 'Bigger towns have both more fires and more firefighters', 'Fire damage is random', 'The correlation must be a calculation error'],
        answer: 1,
        why: 'Town size drives both numbers. That is a third factor, not a cause running between them.',
      },
      {
        q: 'What is the usual way to establish that one thing causes another?',
        choices: ['A bigger sample', 'A stronger correlation', 'A controlled experiment that assigns the treatment', 'Checking it holds over more years'],
        answer: 2,
        why: 'Assigning who gets the treatment is what rules out the third factors and settles direction.',
      },
    ],
  },
  {
    subject: 'Chemistry',
    concept: 'the mole',
    explanation:
      'A mole is just a count, like a dozen, except the number is 6.02 times ten to the twenty-third. Chemists need it because reactions happen between numbers of particles, not between grams, and a carbon atom and an oxygen atom do not weigh the same. One mole of any substance is its formula mass in grams, so 18 grams of water is one mole, and it contains the same number of molecules as 44 grams of carbon dioxide.',
    questions: [
      {
        q: 'Why do chemists count in moles rather than weigh in grams?',
        choices: ['Grams are too small', 'Reactions happen between numbers of particles, not masses', 'Moles are easier to measure', 'Grams change with temperature'],
        answer: 1,
        why: 'A balanced equation is a ratio of particles, and equal masses of different substances hold different numbers.',
      },
      {
        q: 'Water has a formula mass of 18. How many molecules are in 18 grams of it?',
        choices: ['18', 'One mole of them, about 6.02 times ten to the 23rd', '100', 'It depends on the temperature'],
        answer: 1,
        why: 'Formula mass in grams is exactly one mole, whatever the substance.',
      },
    ],
  },
  {
    subject: 'Chemistry',
    concept: 'oxidation and reduction',
    explanation:
      'Oxidation is losing electrons and reduction is gaining them. The names are backwards from what they sound like, which is why people mix them up, so most students learn OIL RIG: oxidation is loss, reduction is gain. The two always happen together, because electrons have to go somewhere. When iron rusts, iron loses electrons and oxygen gains them, so iron is oxidised and oxygen is reduced in the very same reaction.',
    questions: [
      {
        q: 'A magnesium atom becomes Mg with a 2+ charge. What happened?',
        choices: ['It was reduced, gaining two electrons', 'It was oxidised, losing two electrons', 'It gained two protons', 'It was neither'],
        answer: 1,
        why: 'A more positive charge means electrons left. Loss is oxidation.',
      },
      {
        q: 'Why can oxidation never happen on its own?',
        choices: ['It can', 'The lost electrons must be gained by something else', 'It needs oxygen present', 'It only works in water'],
        answer: 1,
        why: 'Electrons are not destroyed, so whatever is oxidised has a partner being reduced.',
      },
    ],
  },
  {
    subject: 'Biology',
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
  {
    subject: 'Biology',
    concept: 'natural selection',
    explanation:
      'Natural selection needs three things: variation in a trait, that variation being heritable, and it affecting how many offspring survive. Given those, the useful version spreads without anything deciding it should. The wording that causes trouble is that individuals do not adapt. A beetle does not become greener in its lifetime. Greener beetles simply get eaten less and leave more offspring, so the population is greener a generation later.',
    questions: [
      {
        q: 'What is wrong with saying a giraffe stretched its neck and passed that on?',
        choices: ['Nothing, that is how it works', 'Traits acquired in a lifetime are not inherited; selection acts on existing variation', 'Giraffes have short necks', 'Stretching is too slow'],
        answer: 1,
        why: 'Selection sorts variation that is already there and heritable. It does not record effort.',
      },
      {
        q: 'A trait varies and is heritable but does not affect survival or offspring. What happens?',
        choices: ['It spreads anyway', 'Natural selection does not push it either way', 'It disappears', 'It becomes dominant'],
        answer: 1,
        why: 'With no effect on offspring numbers, the third condition fails and selection has no grip.',
      },
    ],
  },
  {
    subject: 'Physics',
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
        choices: ['It does change it', 'Because energy is a scalar and speed is squared', 'Because mass cancels out', 'Because it is measured relative to the ground'],
        answer: 1,
        why: 'Squaring removes the sign. Energy has a size but no direction.',
      },
    ],
  },
  {
    subject: 'Physics',
    concept: "Newton's third law",
    explanation:
      'Every force comes as a pair: if A pushes B, B pushes A just as hard the other way. The confusion is why anything moves at all if forces always cancel. They do not cancel, because they act on different objects. When you push a wall, your force is on the wall and the wall\'s is on you. When you walk, you push the ground backward and the ground pushes you forward, and that forward push is what moves you.',
    questions: [
      {
        q: 'You push a box and it accelerates. Why did the pair of forces not cancel?',
        choices: ['The box pushes back weaker', 'The two forces act on different objects', 'Friction removes one', 'The third law does not apply to boxes'],
        answer: 1,
        why: 'Forces only cancel when they act on the same object. These act on you and on the box.',
      },
      {
        q: 'What actually pushes you forward when you walk?',
        choices: ['Your muscles directly', 'The ground pushing forward on you', 'Your momentum', 'Gravity'],
        answer: 1,
        why: 'You push the ground back, and its equal push forward on you is the force that moves you.',
      },
    ],
  },
  {
    subject: 'Economics',
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
  {
    subject: 'Economics',
    concept: 'opportunity cost',
    explanation:
      'The opportunity cost of a choice is the best thing you gave up to make it. It is not the money spent, and it is not everything you gave up, just the next best option. Spending Saturday at a job paying 80 dollars means the opportunity cost of staying home is 80 dollars, even though staying home costs nothing. This is also why money already spent should not sway a decision: that money is gone whichever way you choose.',
    questions: [
      {
        q: 'You can take a shift for 80 dollars, study, or sleep. You rank the shift first and studying second. What is the opportunity cost of taking the shift?',
        choices: ['Nothing, you earned money', 'Studying, the next best option', 'Studying and sleeping together', '80 dollars'],
        answer: 1,
        why: 'Opportunity cost is the single best thing given up, not the sum of everything.',
      },
      {
        q: 'You paid 15 dollars for a film and hate it after ten minutes. What should the 15 dollars do to your decision to leave?',
        choices: ['Keep you there, you paid', 'Nothing, it is gone either way', 'Halve the value of leaving', 'Make you stay half the film'],
        answer: 1,
        why: 'Money already spent is unrecoverable, so it is the same whichever choice you make.',
      },
    ],
  },
  {
    subject: 'Computer science',
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
        choices: ['Big O is wrong for small inputs', 'Big O ignores constants, which dominate when n is small', 'Small inputs are always O(1)', 'The faster one has a bug'],
        answer: 1,
        why: 'Big O throws away constants, and constants decide the race until the input gets big.',
      },
    ],
  },
  {
    subject: 'Computer science',
    concept: 'recursion',
    explanation:
      'A recursive function solves a problem by calling itself on a smaller piece. It needs two parts: a base case that returns without calling again, and a recursive step that moves toward that base case. Leave out the base case and it runs until the call stack fills and the program dies. Factorial is the standard example: factorial of 1 is 1, and factorial of n is n times factorial of n minus 1, which shrinks the input every call.',
    questions: [
      {
        q: 'What happens to a recursive function with no reachable base case?',
        choices: ['It returns zero', 'It recurses until the stack overflows', 'The compiler fixes it', 'It runs once and stops'],
        answer: 1,
        why: 'Nothing stops the calls, so they pile up until the stack runs out.',
      },
      {
        q: 'What must the recursive step always do?',
        choices: ['Return a number', 'Move the input closer to the base case', 'Call itself exactly twice', 'Use a loop as well'],
        answer: 1,
        why: 'If the input does not shrink toward the base case, the base case never fires.',
      },
    ],
  },
  {
    subject: 'History',
    concept: 'primary and secondary sources',
    explanation:
      'A primary source comes from the moment being studied: a letter, a photograph, a treaty, a diary. A secondary source is someone later writing about that moment, like a textbook or a documentary. Primary does not mean reliable. A wartime poster is primary and also propaganda. What makes a source useful is knowing who made it, when, and why, because that tells you what it is evidence of. A biased source is still strong evidence of the bias.',
    questions: [
      {
        q: 'A historian in 2010 writes a book about a 1914 battle, quoting soldiers\' letters. Which is the primary source?',
        choices: ['The 2010 book', 'The soldiers\' letters', 'Both equally', 'Neither'],
        answer: 1,
        why: 'The letters come from the moment itself. The book is someone later writing about it.',
      },
      {
        q: 'A government poster from 1917 is obvious propaganda. What is it good evidence of?',
        choices: ['Nothing, it is biased', 'What the government wanted people to believe', 'What the battle was actually like', 'How many soldiers died'],
        answer: 1,
        why: 'Bias does not make a source useless, it changes what the source is evidence of.',
      },
    ],
  },
  {
    subject: 'History',
    concept: 'causes of the First World War',
    explanation:
      'The assassination of Franz Ferdinand in June 1914 set it off, but it does not explain the scale. Four longer pressures made a local killing into a continental war: alliance systems that dragged in countries with no quarrel, an arms race especially at sea, competition over empire, and nationalism inside multi-ethnic states. Historians separate the trigger from the underlying causes, because without the alliances the assassination stays a regional crisis.',
    questions: [
      {
        q: 'Why is the assassination called a trigger rather than the cause?',
        choices: ['It was not important', 'It set off pressures that had built for years', 'It happened too late', 'It was an accident'],
        answer: 1,
        why: 'A trigger releases tension that already exists. The alliances and rivalries are what made it spread.',
      },
      {
        q: 'Which best explains how a Balkan crisis became a continental war?',
        choices: ['Bad weather', 'Alliance commitments pulling in uninvolved powers', 'A shortage of food', 'The invention of the tank'],
        answer: 1,
        why: 'Treaty obligations meant countries with no quarrel were committed to fight.',
      },
    ],
  },
  {
    subject: 'Spanish',
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
        choices: ['None, just formality', 'The first means boring, the second means bored', 'The first is past tense', 'The first is plural'],
        answer: 1,
        why: 'Ser gives the lasting trait. Estar gives the passing one.',
      },
    ],
  },
  {
    subject: 'Spanish',
    concept: 'the subjunctive',
    explanation:
      'The subjunctive is not a tense, it is a mood. The indicative states what is; the subjunctive covers what is wished, doubted, required or not yet real. It usually shows up in a second clause after que. "Se que viene" means I know he is coming, and that is fact, so indicative. "Espero que venga" means I hope he comes, which is not fact yet, so subjunctive. Doubt, desire, and emotion are the usual triggers.',
    questions: [
      {
        q: 'Which sentence needs the subjunctive?',
        choices: ['I know that he works here', 'I doubt that he works here', 'He works here', 'He worked here yesterday'],
        answer: 1,
        why: 'Doubt puts the second clause outside of fact, which is exactly what the subjunctive marks.',
      },
      {
        q: 'Why is the subjunctive called a mood rather than a tense?',
        choices: ['It has no time', 'It marks how real the speaker treats something, not when it happened', 'It is only for the past', 'It is informal'],
        answer: 1,
        why: 'Tense places events in time. Mood shows the speaker\'s stance on whether it is real.',
      },
    ],
  },
  {
    subject: 'Writing',
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
          'The French Revolution began in 1789',
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
  {
    subject: 'Writing',
    concept: 'active and passive voice',
    explanation:
      'In the active voice the subject does the verb: the committee rejected the plan. In the passive the thing done to comes first and the doer can vanish: the plan was rejected. Passive is not a mistake. It is the right choice when the doer is unknown or beside the point, as in the samples were frozen overnight. It becomes a problem when it hides who acted, which is why official apologies so often say mistakes were made.',
    questions: [
      {
        q: 'Which sentence is passive?',
        choices: ['The dog chased the ball', 'The ball was chased by the dog', 'The dog is fast', 'Chase the ball'],
        answer: 1,
        why: 'The thing acted on comes first and the doer arrives afterwards, in a by phrase.',
      },
      {
        q: 'When is the passive voice the better choice?',
        choices: ['Never', 'When the doer is unknown or does not matter', 'In every formal essay', 'Whenever the sentence is long'],
        answer: 1,
        why: 'It puts the important thing first. It is only a fault when it hides a doer who matters.',
      },
    ],
  },
];

/** Everything in the bank, for anyone who wants to count or list it. */
export const CARDS: readonly BankCard[] = BANK;

/** Subjects the bank can actually teach right now. */
export const BANK_SUBJECTS = [...new Set(BANK.map((c) => c.subject))];

/** A written card for this concept, or null when the bank has never heard of it. */
export function demoCard(concept: string): BankCard | null {
  const want = concept.trim().toLowerCase();
  return BANK.find((c) => c.concept.toLowerCase() === want) ?? null;
}

/** Concepts that have a written card. */
export const DEMO_CONCEPTS = BANK.map((c) => c.concept);

/**
 * Pick a card for someone studying these subjects, preferring one they have not
 * passed. `seen` is the concept-memory map, so this naturally walks the bank
 * before repeating. Returns null only when the bank knows none of the subjects,
 * which is the one case that needs a model.
 */
export function pickCard(subjects: string[], seen: Record<string, unknown> = {}): BankCard | null {
  const wanted = subjects.map((s) => s.toLowerCase());
  const pool = BANK.filter((c) => wanted.includes(c.subject.toLowerCase()));
  if (!pool.length) return null;
  const fresh = pool.filter((c) => !(c.concept in seen));
  const from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)] ?? null;
}
