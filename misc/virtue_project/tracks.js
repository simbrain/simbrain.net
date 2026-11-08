// Virtue tracks for the pilot, in the order they are offered.
// Each track has its own mascot and its own entry prompts.
// "hollow: true" on a kind draws that step as an open circle on the trail.

const TRACKS = [
  {
    id: 'respect',
    name: 'Respect',
    subtitle: 'Resilience',
    mascot: '🐢',
    mascotName: 'Tortoise',
    goal: 'Identify an assignment and start work on it the same day.',
    extraField: {
      id: 'assignment',
      label: 'Which assignment?',
      placeholder: 'e.g. Bio lab report',
    },
    kindLabel: 'Did you start it the same day?',
    kinds: [
      { id: 'started', label: 'Yes, I started it the same day' },
      { id: 'not_yet', label: "Not yet, I identified it but didn't start", hollow: true },
      { id: 'other', label: 'Something else (say below)' },
    ],
    descLabel: 'What happened?',
  },
  {
    id: 'openmind',
    name: 'Open-mindedness',
    subtitle: '',
    mascot: '🦉',
    mascotName: 'Owl',
    goal: 'Notice a time you changed your mind, were surprised, or were less open-minded than you would like.',
    kindLabel: 'Which kind of moment?',
    kinds: [
      { id: 'changed_mind', label: 'I changed my mind about something' },
      { id: 'unexpected', label: 'Something unexpected happened' },
      { id: 'judgy', label: 'I realized I was judgy about something or someone' },
      { id: 'other', label: 'Something else' },
    ],
    descLabel: 'What happened?',
  },
  {
    id: 'courage',
    name: 'Courage',
    subtitle: '',
    mascot: '🦁',
    mascotName: 'Lion',
    goal: 'Notice someone being courageous, ideally in person. Even better, do something courageous yourself.',
    kindLabel: 'Whose courage?',
    kinds: [
      { id: 'saw_other', label: 'I saw someone be courageous' },
      { id: 'heard_other', label: 'I heard or read about someone being courageous' },
      { id: 'did_myself', label: 'I did something courageous myself' },
      { id: 'other', label: 'Something else' },
    ],
    descLabel: 'What happened?',
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    subtitle: '',
    mascot: '🐈',
    mascotName: 'Cat',
    goal: "Look something up, ask someone a question (in class or not), or research something you wouldn't normally.",
    kindLabel: 'What did you do?',
    kinds: [
      { id: 'looked_up', label: 'Looked something up' },
      { id: 'asked', label: 'Asked someone a question' },
      { id: 'researched', label: "Researched something I wouldn't normally" },
      { id: 'other', label: 'Something else' },
    ],
    descLabel: 'Describe it.',
  },
];

const WEEKLY_GOAL = 3;     // "a few times per week"
const CAMP_EVERY = 10;     // a camp every 10 steps
const PEAK_EVERY = 30;     // a summit every 30 steps
