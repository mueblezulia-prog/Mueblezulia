// config/knowledgeBase.js
//
// Structured data used by the mini-games (Sentence Builder & Trivia Q&A).
// Content is taken 1:1 from the class material — nothing invented.

export const SENTENCE_BUILDER_ITEMS = [
  { id: 's1', correct: ['I', "can't", 'hear', 'the', 'audio'] },
  { id: 's2', correct: ['Can', 'you', 'help', 'me', 'please'] },
  { id: 's3', correct: ['Are', 'you', 'free'] },
  { id: 's4', correct: ['Is', 'Arturo', 'from', 'Mexico'] },
  { id: 's5', correct: ['This', 'book', 'is', 'mine', 'not', 'yours'] },
  { id: 's6', correct: ['Whose', 'jeans', 'are', 'these'] },
  { id: 's7', correct: ['Do', 'you', 'like', 'country', 'music'] },
  { id: 's8', correct: ['Does', 'she', 'play', 'the', 'piano'] },
  { id: 's9', correct: ['What', 'kind', 'of', 'music', 'do', 'you', 'like'] },
  {
    id: 's10',
    correct: ['We', 'are', 'going', 'to', 'have', 'dinner', 'tonight'],
  },
  { id: 's11', correct: ['Is', 'he', 'going', 'to', 'buy', 'me', 'a', 'gift'] },
  {
    id: 's12',
    correct: ['Tomorrow', 'is', 'going', 'to', 'be', 'very', 'exciting'],
  },
];

export const TRIVIA_QUESTIONS = [
  {
    id: 't1',
    question: "What do you say if you can't hear the audio in class?",
    options: [
      "I can't hear the audio",
      'I have a question',
      'Which page?',
      "I'm ready",
    ],
    answer: "I can't hear the audio",
  },
  {
    id: 't2',
    question: '"Are you free?" — What is a correct short NEGATIVE answer?',
    options: ["No, I'm not", "No, I don't", "No, isn't", "No, not"],
    answer: "No, I'm not",
  },
  {
    id: 't3',
    question: 'Which word is a COLOR from the class list?',
    options: ['scarf', 'beige', 'boots', 'guitar'],
    answer: 'beige',
  },
  {
    id: 't4',
    question: 'Which word is a piece of CLOTHING?',
    options: ['purple', 'sneakers', 'theirs', 'tonight'],
    answer: 'sneakers',
  },
  {
    id: 't5',
    question: '"Whose jeans are these? Uh, yes, they\'re ___."',
    options: ['mine', 'my', 'I', 'me'],
    answer: 'mine',
  },
  {
    id: 't6',
    question: '"Does she play the piano?" — correct short answer for YES:',
    options: ['Yes, she does', 'Yes, she do', 'Yes, she is', 'Yes, does'],
    answer: 'Yes, she does',
  },
  {
    id: 't7',
    question: '"What kind of music do you like?" A good answer is:',
    options: [
      'I really like rap',
      'She plays the guitar',
      "I'm fine, thanks",
      'Yes, I am',
    ],
    answer: 'I really like rap',
  },
  {
    id: 't8',
    question: 'Which structure expresses FUTURE plans?',
    options: [
      'am / is / are + going to + verb',
      'do / does + verb',
      'am / is / are + verb-ing',
      'verb + ed',
    ],
    answer: 'am / is / are + going to + verb',
  },
  {
    id: 't9',
    question: 'Which is a TIME EXPRESSION for the future (Unit 11)?',
    options: ['next week', 'yesterday', 'last night', 'ago'],
    answer: 'next week',
  },
  {
    id: 't10',
    question: '"Is he going to buy me a gift?" — this sentence is about:',
    options: ['the future', 'the past', 'a routine', 'a classroom request'],
    answer: 'the future',
  },
];
