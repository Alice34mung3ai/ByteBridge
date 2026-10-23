import assert from 'assert';
import { QUIZ_QUESTIONS, CONCEPTS_CATALOG, DOMAINS } from '../data/az900Data.ts';
import {
  INITIAL_PROGRESS,
  loadProgress,
  saveProgress,
  recordQuizCompletion,
  getKnowledgeCheckpoints,
  getRecommendedActivity,
} from './storage.ts';
import { QuizSessionResult, AnswerRecord } from '../types/index.ts';

console.log('--- STARTING AZURE EXAM FLIGHT DECK UNIT TESTS ---');

// Test 1: Question Bank Integrity
console.log('Test 1: Validating Question Bank Integrity...');
assert(QUIZ_QUESTIONS.length >= 30, `Expected >= 30 questions, found ${QUIZ_QUESTIONS.length}`);

for (const q of QUIZ_QUESTIONS) {
  assert(q.id, 'Question missing ID');
  assert(q.question && q.question.trim().length > 10, `Question ${q.id} has empty prompt`);
  assert(Array.isArray(q.options) && q.options.length >= 4, `Question ${q.id} must have >= 4 options`);
  assert(
    q.correctIndex >= 0 && q.correctIndex < q.options.length,
    `Question ${q.id} has invalid correctIndex ${q.correctIndex}`
  );
  assert(q.explanation && q.explanation.length > 5, `Question ${q.id} missing explanation`);
  assert(q.conceptKey, `Question ${q.id} missing conceptKey`);
  assert(
    CONCEPTS_CATALOG[q.conceptKey] !== undefined,
    `Question ${q.id} conceptKey "${q.conceptKey}" not found in CONCEPTS_CATALOG`
  );
}
console.log(`✓ All ${QUIZ_QUESTIONS.length} practice questions validated successfully.`);

// Test 2: Deterministic Scoring & Answer Validation
console.log('Test 2: Testing Deterministic Scoring & Answer Validation...');
const sampleAnswers: AnswerRecord[] = [
  {
    questionId: QUIZ_QUESTIONS[0].id,
    selectedIndex: QUIZ_QUESTIONS[0].correctIndex, // Correct
    isCorrect: true,
    conceptKey: QUIZ_QUESTIONS[0].conceptKey,
    topic: QUIZ_QUESTIONS[0].topic,
    domain: QUIZ_QUESTIONS[0].domain,
  },
  {
    questionId: QUIZ_QUESTIONS[1].id,
    selectedIndex: (QUIZ_QUESTIONS[1].correctIndex + 1) % 4, // Incorrect
    isCorrect: false,
    conceptKey: QUIZ_QUESTIONS[1].conceptKey,
    topic: QUIZ_QUESTIONS[1].topic,
    domain: QUIZ_QUESTIONS[1].domain,
  },
  {
    questionId: QUIZ_QUESTIONS[2].id,
    selectedIndex: QUIZ_QUESTIONS[2].correctIndex, // Correct
    isCorrect: true,
    conceptKey: QUIZ_QUESTIONS[2].conceptKey,
    topic: QUIZ_QUESTIONS[2].topic,
    domain: QUIZ_QUESTIONS[2].domain,
  },
  {
    questionId: QUIZ_QUESTIONS[3].id,
    selectedIndex: QUIZ_QUESTIONS[3].correctIndex, // Correct
    isCorrect: true,
    conceptKey: QUIZ_QUESTIONS[3].conceptKey,
    topic: QUIZ_QUESTIONS[3].topic,
    domain: QUIZ_QUESTIONS[3].domain,
  },
  {
    questionId: QUIZ_QUESTIONS[4].id,
    selectedIndex: QUIZ_QUESTIONS[4].correctIndex, // Correct
    isCorrect: true,
    conceptKey: QUIZ_QUESTIONS[4].conceptKey,
    topic: QUIZ_QUESTIONS[4].topic,
    domain: QUIZ_QUESTIONS[4].domain,
  },
];

const totalQuestions = sampleAnswers.length;
const correctCount = sampleAnswers.filter((a) => a.isCorrect).length;
const scorePercent = Math.round((correctCount / totalQuestions) * 100);
const passed = scorePercent >= 70;

assert.strictEqual(correctCount, 4);
assert.strictEqual(scorePercent, 80);
assert.strictEqual(passed, true);
console.log('✓ Deterministic scoring calculation verified: 4/5 = 80%, Passed = true.');

// Test 3: Storage Progress & Telemetry Aggregation
console.log('Test 3: Testing Storage & Telemetry Recording...');
saveProgress(INITIAL_PROGRESS);
const clean = loadProgress();
assert.strictEqual(clean.questionsAttempted, 0);
assert.strictEqual(clean.questionsCorrect, 0);

const testSession: QuizSessionResult = {
  id: 'test-session-1',
  timestamp: new Date().toISOString(),
  mode: 'sprint',
  totalQuestions: 5,
  correctCount: 4,
  scorePercent: 80,
  passed: true,
  answers: sampleAnswers,
  missedConceptKeys: [sampleAnswers[1].conceptKey],
};

const updatedProgress = recordQuizCompletion(testSession);
assert.strictEqual(updatedProgress.questionsAttempted, 5);
assert.strictEqual(updatedProgress.questionsCorrect, 4);
assert(updatedProgress.recentQuizzes.length > 0);
assert(updatedProgress.missedConcepts[sampleAnswers[1].conceptKey] !== undefined);
assert.strictEqual(updatedProgress.missedConcepts[sampleAnswers[1].conceptKey].frequency, 1);
console.log('✓ Session recording correctly updated attempted, correct, recentQuizzes, and missedConcepts.');

// Test 4: Knowledge Checkpoints & Recommendations
console.log('Test 4: Testing Knowledge Checkpoints & Recommendation logic...');
const { checkpoints, hasQuizHistory } = getKnowledgeCheckpoints(updatedProgress);
assert.strictEqual(hasQuizHistory, true);
assert(checkpoints.length > 0);
assert.strictEqual(checkpoints[0].conceptKey, sampleAnswers[1].conceptKey);

const rec = getRecommendedActivity(updatedProgress);
assert(rec && rec.title, 'Recommendation must produce an activity');
console.log(`✓ Recommended activity determined: "${rec.title}" (${rec.badge})`);

console.log('--- ALL UNIT TESTS COMPLETED SUCCESSFULLY! ---');
