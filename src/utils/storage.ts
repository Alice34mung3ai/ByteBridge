import { UserProgressData, QuizSessionResult, ExamDomain, FlashcardState } from '../types';
import { DOMAINS, CONCEPTS_CATALOG, FLASHCARDS_DECK } from '../data/az900Data';

const STORAGE_KEY = 'azure_flight_deck_progress_v1';

export const INITIAL_PROGRESS: UserProgressData = {
  questionsAttempted: 0,
  questionsCorrect: 0,
  domainStats: {
    'cloud-concepts': { attempted: 0, correct: 0 },
    'architecture-services': { attempted: 0, correct: 0 },
    'management-governance': { attempted: 0, correct: 0 },
  },
  topicStats: {},
  missedConcepts: {},
  flashcardStates: {},
  recentQuizzes: [],
  studyStreakDays: 1,
  lastActivityDate: new Date().toISOString().split('T')[0],
};

// In-memory fallback if localStorage is blocked or throws SecurityError in an iframe
let memoryFallbackStore: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    // Cross-origin iframe or partitioned cookie block
  }
  return memoryFallbackStore[key] || null;
}

function safeSetItem(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
      return;
    }
  } catch (e) {
    // Cross-origin iframe or partitioned cookie block
  }
  memoryFallbackStore[key] = val;
}

export function loadProgress(): UserProgressData {
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_PROGRESS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...INITIAL_PROGRESS };

    return {
      questionsAttempted: typeof parsed.questionsAttempted === 'number' ? parsed.questionsAttempted : 0,
      questionsCorrect: typeof parsed.questionsCorrect === 'number' ? parsed.questionsCorrect : 0,
      domainStats: {
        'cloud-concepts': {
          attempted: parsed.domainStats?.['cloud-concepts']?.attempted || 0,
          correct: parsed.domainStats?.['cloud-concepts']?.correct || 0,
        },
        'architecture-services': {
          attempted: parsed.domainStats?.['architecture-services']?.attempted || 0,
          correct: parsed.domainStats?.['architecture-services']?.correct || 0,
        },
        'management-governance': {
          attempted: parsed.domainStats?.['management-governance']?.attempted || 0,
          correct: parsed.domainStats?.['management-governance']?.correct || 0,
        },
      },
      topicStats: parsed.topicStats && typeof parsed.topicStats === 'object' ? parsed.topicStats : {},
      missedConcepts: parsed.missedConcepts && typeof parsed.missedConcepts === 'object' ? parsed.missedConcepts : {},
      flashcardStates: parsed.flashcardStates && typeof parsed.flashcardStates === 'object' ? parsed.flashcardStates : {},
      recentQuizzes: Array.isArray(parsed.recentQuizzes) ? parsed.recentQuizzes : [],
      studyStreakDays: typeof parsed.studyStreakDays === 'number' ? parsed.studyStreakDays : 1,
      lastActivityDate: parsed.lastActivityDate || new Date().toISOString().split('T')[0],
    };
  } catch (e) {
    console.error('Failed to load progress, defaulting:', e);
    return { ...INITIAL_PROGRESS };
  }
}

export function saveProgress(data: UserProgressData): void {
  try {
    safeSetItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function recordQuizCompletion(session: QuizSessionResult): UserProgressData {
  const current = loadProgress();

  const totalAttempted = current.questionsAttempted + session.totalQuestions;
  const totalCorrect = current.questionsCorrect + session.correctCount;

  // Clone stats
  const domainStats = { ...current.domainStats };
  const topicStats = { ...current.topicStats };
  const missedConcepts = { ...current.missedConcepts };

  const todayStr = new Date().toISOString().split('T')[0];

  for (const ans of session.answers) {
    // Update domain
    if (!domainStats[ans.domain]) {
      domainStats[ans.domain] = { attempted: 0, correct: 0 };
    }
    domainStats[ans.domain].attempted += 1;
    if (ans.isCorrect) {
      domainStats[ans.domain].correct += 1;
    }

    // Update topic
    if (!topicStats[ans.topic]) {
      topicStats[ans.topic] = { attempted: 0, correct: 0 };
    }
    topicStats[ans.topic].attempted += 1;
    if (ans.isCorrect) {
      topicStats[ans.topic].correct += 1;
    }

    // If incorrect, record/boost missed concept
    if (!ans.isCorrect) {
      const catalogItem = CONCEPTS_CATALOG[ans.conceptKey];
      const title = catalogItem ? catalogItem.title : ans.conceptKey;

      if (!missedConcepts[ans.conceptKey]) {
        missedConcepts[ans.conceptKey] = {
          conceptKey: ans.conceptKey,
          conceptTitle: title,
          topic: ans.topic,
          domain: ans.domain,
          frequency: 1,
          lastMissedAt: new Date().toISOString(),
        };
      } else {
        missedConcepts[ans.conceptKey].frequency += 1;
        missedConcepts[ans.conceptKey].lastMissedAt = new Date().toISOString();
      }

      // Automatically tag related flashcard as "need-practice" if unreviewed
      const relatedCards = FLASHCARDS_DECK.filter((c) => c.conceptKey === ans.conceptKey);
      for (const card of relatedCards) {
        if (!current.flashcardStates[card.id] || current.flashcardStates[card.id].status === 'unreviewed') {
          current.flashcardStates[card.id] = {
            status: 'need-practice',
            reviewCount: 0,
            lastReviewedAt: new Date().toISOString(),
          };
        }
      }
    }
  }

  // Update streak
  let streak = current.studyStreakDays;
  if (current.lastActivityDate !== todayStr) {
    const lastDate = new Date(current.lastActivityDate);
    const today = new Date(todayStr);
    const diffDays = Math.round((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 1) {
      streak += 1;
    } else if (diffDays > 1) {
      streak = 1;
    }
  }

  const updated: UserProgressData = {
    ...current,
    questionsAttempted: totalAttempted,
    questionsCorrect: totalCorrect,
    domainStats,
    topicStats,
    missedConcepts,
    recentQuizzes: [session, ...current.recentQuizzes.slice(0, 19)],
    studyStreakDays: streak,
    lastActivityDate: todayStr,
  };

  saveProgress(updated);
  return updated;
}

export function updateFlashcardProgress(
  cardId: string,
  status: 'know' | 'need-practice'
): UserProgressData {
  const current = loadProgress();
  const existing = current.flashcardStates[cardId] || {
    status: 'unreviewed',
    reviewCount: 0,
  };

  const updatedStates = {
    ...current.flashcardStates,
    [cardId]: {
      status,
      reviewCount: (existing.reviewCount || 0) + 1,
      lastReviewedAt: new Date().toISOString(),
    },
  };

  // If learner marked "know", and card has matching missed concept with frequency 1, we can resolve or decrement it
  const card = FLASHCARDS_DECK.find((c) => c.id === cardId);
  const missedConcepts = { ...current.missedConcepts };
  if (card && status === 'know' && missedConcepts[card.conceptKey]) {
    if (missedConcepts[card.conceptKey].frequency > 1) {
      missedConcepts[card.conceptKey].frequency -= 1;
    } else {
      delete missedConcepts[card.conceptKey];
    }
  }

  const updated: UserProgressData = {
    ...current,
    flashcardStates: updatedStates,
    missedConcepts,
    lastActivityDate: new Date().toISOString().split('T')[0],
  };

  saveProgress(updated);
  return updated;
}

export function resetProgress(): UserProgressData {
  saveProgress(INITIAL_PROGRESS);
  return INITIAL_PROGRESS;
}

export function seedSampleProgress(): UserProgressData {
  const now = Date.now();
  const dayMs = 86400000;

  const sampleSessionToday: QuizSessionResult = {
    id: 'sample-sprint-today',
    timestamp: new Date(now - 3600000 * 2).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    passed: true,
    missedConceptKeys: ['rbac-vs-azure-policy'],
    answers: [
      {
        questionId: 'q-1',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'shared-responsibility',
        topic: 'Shared Responsibility Model',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-2',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'iaas-paas-saas',
        topic: 'Cloud Service Models',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-3',
        selectedIndex: 2,
        isCorrect: true,
        conceptKey: 'capex-vs-opex',
        topic: 'Cloud Economics',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-13',
        selectedIndex: 0,
        isCorrect: false,
        conceptKey: 'rbac-vs-azure-policy',
        topic: 'Governance & Security',
        domain: 'management-governance',
      },
      {
        questionId: 'q-14',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'resource-locks',
        topic: 'Governance',
        domain: 'management-governance',
      },
    ],
  };

  const sampleSessionYesterday: QuizSessionResult = {
    id: 'sample-sprint-yesterday',
    timestamp: new Date(now - dayMs * 1).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 3,
    scorePercent: 60,
    passed: false,
    missedConceptKeys: ['shared-responsibility'],
    answers: [
      {
        questionId: 'q-1',
        selectedIndex: 0,
        isCorrect: false,
        conceptKey: 'shared-responsibility',
        topic: 'Shared Responsibility Model',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-2',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'iaas-paas-saas',
        topic: 'Cloud Service Models',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-3',
        selectedIndex: 2,
        isCorrect: true,
        conceptKey: 'capex-vs-opex',
        topic: 'Cloud Economics',
        domain: 'cloud-concepts',
      },
      {
        questionId: 'q-6',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'azure-vms',
        topic: 'Compute Services',
        domain: 'architecture-services',
      },
      {
        questionId: 'q-14',
        selectedIndex: 1,
        isCorrect: true,
        conceptKey: 'resource-locks',
        topic: 'Governance',
        domain: 'management-governance',
      },
    ],
  };

  const sampleSession2DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-2days',
    timestamp: new Date(now - dayMs * 2).toISOString(),
    mode: 'full',
    totalQuestions: 10,
    correctCount: 8,
    scorePercent: 80,
    passed: true,
    missedConceptKeys: ['rbac-vs-azure-policy'],
    answers: [],
  };

  const sampleSession3DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-3days',
    timestamp: new Date(now - dayMs * 3).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    passed: true,
    missedConceptKeys: [],
    answers: [],
  };

  const sampleSession4DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-4days',
    timestamp: new Date(now - dayMs * 4).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 3,
    scorePercent: 60,
    passed: false,
    missedConceptKeys: ['shared-responsibility'],
    answers: [],
  };

  const sampleSession5DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-5days',
    timestamp: new Date(now - dayMs * 5).toISOString(),
    mode: 'topic',
    topicFilter: 'Cloud Concepts',
    totalQuestions: 5,
    correctCount: 5,
    scorePercent: 100,
    passed: true,
    missedConceptKeys: [],
    answers: [],
  };

  const sampleSession6DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-6days',
    timestamp: new Date(now - dayMs * 6).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    passed: true,
    missedConceptKeys: [],
    answers: [],
  };

  const sampleSession7DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-7days',
    timestamp: new Date(now - dayMs * 7).toISOString(),
    mode: 'full',
    totalQuestions: 10,
    correctCount: 7,
    scorePercent: 70,
    passed: true,
    missedConceptKeys: ['resource-locks'],
    answers: [],
  };

  const sampleSession8DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-8days',
    timestamp: new Date(now - dayMs * 8).toISOString(),
    mode: 'checkpoint-drill',
    totalQuestions: 5,
    correctCount: 4,
    scorePercent: 80,
    passed: true,
    missedConceptKeys: [],
    answers: [],
  };

  const sampleSession9DaysAgo: QuizSessionResult = {
    id: 'sample-sprint-9days',
    timestamp: new Date(now - dayMs * 9).toISOString(),
    mode: 'sprint',
    totalQuestions: 5,
    correctCount: 3,
    scorePercent: 60,
    passed: false,
    missedConceptKeys: ['azure-regions-az'],
    answers: [],
  };

  const sampleCardStates: Record<string, FlashcardState> = {
    'fc-1': { status: 'need-practice', reviewCount: 2, lastReviewedAt: new Date().toISOString() },
    'fc-2': { status: 'know', reviewCount: 3, lastReviewedAt: new Date().toISOString() },
    'fc-12': { status: 'need-practice', reviewCount: 1, lastReviewedAt: new Date().toISOString() },
    'fc-4': { status: 'know', reviewCount: 2, lastReviewedAt: new Date().toISOString() },
  };

  const sampleProgress: UserProgressData = {
    questionsAttempted: 60,
    questionsCorrect: 45,
    domainStats: {
      'cloud-concepts': { attempted: 28, correct: 22 },
      'architecture-services': { attempted: 16, correct: 12 },
      'management-governance': { attempted: 16, correct: 11 },
    },
    topicStats: {
      'Shared Responsibility Model': { attempted: 6, correct: 3 },
      'Cloud Service Models': { attempted: 8, correct: 8 },
      'Cloud Economics': { attempted: 6, correct: 5 },
      'Governance & Security': { attempted: 8, correct: 5 },
      'Compute Services': { attempted: 8, correct: 6 },
      Governance: { attempted: 8, correct: 6 },
    },
    missedConcepts: {
      'shared-responsibility': {
        conceptKey: 'shared-responsibility',
        conceptTitle: 'Shared Responsibility Model',
        topic: 'Shared Responsibility Model',
        domain: 'cloud-concepts',
        frequency: 2,
        lastMissedAt: new Date().toISOString(),
      },
      'rbac-vs-azure-policy': {
        conceptKey: 'rbac-vs-azure-policy',
        conceptTitle: 'Azure Role-Based Access Control (RBAC) vs Azure Policy',
        topic: 'Governance & Security',
        domain: 'management-governance',
        frequency: 2,
        lastMissedAt: new Date().toISOString(),
      },
    },
    flashcardStates: sampleCardStates,
    recentQuizzes: [
      sampleSessionToday,
      sampleSessionYesterday,
      sampleSession2DaysAgo,
      sampleSession3DaysAgo,
      sampleSession4DaysAgo,
      sampleSession5DaysAgo,
      sampleSession6DaysAgo,
      sampleSession7DaysAgo,
      sampleSession8DaysAgo,
      sampleSession9DaysAgo,
    ],
    studyStreakDays: 5,
    lastActivityDate: new Date().toISOString().split('T')[0],
  };

  saveProgress(sampleProgress);
  return sampleProgress;
}

export interface RecommendedActivity {
  type: 'concept-coach' | 'flashcard-drill' | 'quiz-sprint' | 'domain-drill';
  title: string;
  badge: string;
  description: string;
  actionText: string;
  targetConceptKey?: string;
  targetDomain?: ExamDomain;
  targetTopic?: string;
}

export function getRecommendedActivity(progress: UserProgressData): RecommendedActivity {
  const missedConcepts = progress?.missedConcepts || {};
  const missedKeys = Object.keys(missedConcepts);

  // 1. If learner has missed concepts, top recommendation is to explore the highest frequency missed concept in Concept Coach
  if (missedKeys.length > 0) {
    const highestMissed = Object.values(missedConcepts).sort(
      (a, b) => b.frequency - a.frequency
    )[0];

    return {
      type: 'concept-coach',
      badge: 'High Priority Clarification',
      title: `Coach Review: ${highestMissed.conceptTitle}`,
      description: `You recently missed questions touching on "${highestMissed.topic}". Ask the AI Concept Coach for a plain-English analogy and explanation.`,
      actionText: 'Open in Concept Coach',
      targetConceptKey: highestMissed.conceptKey,
      targetTopic: highestMissed.topic,
    };
  }

  // 2. Check for flashcards needing practice
  const flashcardStates = progress?.flashcardStates || {};
  const needPracticeCards = Object.entries(flashcardStates).filter(
    ([_, state]) => state?.status === 'need-practice'
  );
  if (needPracticeCards.length > 0) {
    return {
      type: 'flashcard-drill',
      badge: 'Flashcard Reinforcement',
      title: `Drill ${needPracticeCards.length} Marked Flashcards`,
      description: `You have ${needPracticeCards.length} flashcard${needPracticeCards.length > 1 ? 's' : ''} flagged for review. Quick reps will lock them into long-term memory.`,
      actionText: 'Review Flashcards',
    };
  }

  // 3. If zero questions attempted, recommend starting initial flight quiz sprint
  if (progress.questionsAttempted === 0) {
    return {
      type: 'quiz-sprint',
      badge: 'Pre-Flight Assessment',
      title: 'Take a 5-Question Flight Sprint',
      description: 'Establish your baseline telemetry with a quick 5-question multi-topic quiz to identify your current strong points.',
      actionText: 'Launch Flight Sprint',
    };
  }

  // 4. Check for weakest domain
  let lowestDomain: ExamDomain = 'cloud-concepts';
  let lowestRatio = 1.0;
  let hasUntestedDomain = false;

  const domainKeys: ExamDomain[] = ['cloud-concepts', 'architecture-services', 'management-governance'];
  for (const d of domainKeys) {
    const stat = progress.domainStats[d];
    if (stat.attempted === 0) {
      lowestDomain = d;
      hasUntestedDomain = true;
      break;
    }
    const ratio = stat.correct / stat.attempted;
    if (ratio < lowestRatio) {
      lowestRatio = ratio;
      lowestDomain = d;
    }
  }

  if (hasUntestedDomain) {
    return {
      type: 'domain-drill',
      badge: 'Uncharted Territory',
      title: `Explore ${DOMAINS[lowestDomain].name}`,
      description: `You haven't attempted any questions from ${DOMAINS[lowestDomain].name} (${DOMAINS[lowestDomain].weight} of AZ-900). Let's drill this domain!`,
      actionText: 'Start Domain Drill',
      targetDomain: lowestDomain,
    };
  }

  return {
    type: 'domain-drill',
    badge: 'Reinforce Weak Spot',
    title: `Focus Drill: ${DOMAINS[lowestDomain].name}`,
    description: `Your current accuracy in this domain is ${Math.round(lowestRatio * 100)}%. Target this area to raise your overall readiness score.`,
    actionText: 'Practice Domain',
    targetDomain: lowestDomain,
  };
}

export interface KnowledgeCheckpoint {
  rank: number;
  conceptKey: string;
  conceptTitle: string;
  domain: ExamDomain;
  topic: string;
  totalAttempts: number;
  correctCount: number;
  missedCount: number;
  accuracy: number;
  isCalibrated: boolean;
  status: 'critical' | 'moderate' | 'solid';
  commonConfusion?: string;
  keyDistinction?: string;
  summary?: string;
  sampleCheckQuestion?: string;
  practiceSuggestions: {
    quizTitle: string;
    coachPrompt: string;
    flashcardAction: string;
  };
}

export function getKnowledgeCheckpoints(progress: UserProgressData): {
  checkpoints: KnowledgeCheckpoint[];
  hasQuizHistory: boolean;
  totalConceptsTested: number;
} {
  const conceptMap: Record<
    string,
    {
      conceptKey: string;
      conceptTitle: string;
      domain: ExamDomain;
      topic: string;
      totalAttempts: number;
      correctCount: number;
      missedCount: number;
    }
  > = {};

  // 1. Scan user's completed quiz history
  if (Array.isArray(progress?.recentQuizzes)) {
    for (const quiz of progress.recentQuizzes) {
      if (!Array.isArray(quiz.answers)) continue;
      for (const ans of quiz.answers) {
        if (!ans.conceptKey) continue;
        if (!conceptMap[ans.conceptKey]) {
          const catalogItem = CONCEPTS_CATALOG[ans.conceptKey];
          conceptMap[ans.conceptKey] = {
            conceptKey: ans.conceptKey,
            conceptTitle: catalogItem?.title || ans.conceptKey,
            domain: ans.domain || catalogItem?.domain || 'cloud-concepts',
            topic: ans.topic || catalogItem?.topic || 'Cloud Architecture',
            totalAttempts: 0,
            correctCount: 0,
            missedCount: 0,
          };
        }
        conceptMap[ans.conceptKey].totalAttempts += 1;
        if (ans.isCorrect) {
          conceptMap[ans.conceptKey].correctCount += 1;
        } else {
          conceptMap[ans.conceptKey].missedCount += 1;
        }
      }
    }
  }

  // 2. Incorporate missed concepts registry
  if (progress?.missedConcepts) {
    for (const [key, missed] of Object.entries(progress.missedConcepts)) {
      if (!conceptMap[key]) {
        const catalogItem = CONCEPTS_CATALOG[key];
        conceptMap[key] = {
          conceptKey: key,
          conceptTitle: missed.conceptTitle || catalogItem?.title || key,
          domain: missed.domain || catalogItem?.domain || 'cloud-concepts',
          topic: missed.topic || catalogItem?.topic || 'Cloud Architecture',
          totalAttempts: missed.frequency || 1,
          correctCount: 0,
          missedCount: missed.frequency || 1,
        };
      } else {
        if (conceptMap[key].missedCount < missed.frequency) {
          const diff = missed.frequency - conceptMap[key].missedCount;
          conceptMap[key].missedCount = missed.frequency;
          conceptMap[key].totalAttempts += diff;
        }
      }
    }
  }

  const testedConcepts = Object.values(conceptMap).filter((c) => c.totalAttempts > 0);
  const hasQuizHistory = testedConcepts.length > 0;

  // Sort tested concepts:
  // Lowest accuracy first, then most missed, then most total attempts
  testedConcepts.sort((a, b) => {
    const accA = a.totalAttempts > 0 ? a.correctCount / a.totalAttempts : 0;
    const accB = b.totalAttempts > 0 ? b.correctCount / b.totalAttempts : 0;
    if (accA !== accB) return accA - accB;
    if (b.missedCount !== a.missedCount) return b.missedCount - a.missedCount;
    return b.totalAttempts - a.totalAttempts;
  });

  // Foundational AZ-900 concepts to provide baseline recommendations if fewer than 3 tested
  const baselineConcepts: string[] = [
    'shared-responsibility',
    'rbac-vs-azure-policy',
    'capex-vs-opex',
    'iaas-paas-saas',
    'high-availability-fault-tolerance',
    'resource-hierarchy',
  ];

  const selectedList: {
    item: {
      conceptKey: string;
      conceptTitle: string;
      domain: ExamDomain;
      topic: string;
      totalAttempts: number;
      correctCount: number;
      missedCount: number;
    };
    isCalibrated: boolean;
  }[] = [];

  // Add up to 3 tested concepts
  for (let i = 0; i < Math.min(3, testedConcepts.length); i++) {
    selectedList.push({
      item: testedConcepts[i],
      isCalibrated: true,
    });
  }

  // If fewer than 3 tested, supplement with foundational unattempted concepts
  if (selectedList.length < 3) {
    const existingKeys = new Set(selectedList.map((s) => s.item.conceptKey));
    for (const bKey of baselineConcepts) {
      if (selectedList.length >= 3) break;
      if (!existingKeys.has(bKey)) {
        const cat = CONCEPTS_CATALOG[bKey];
        if (cat) {
          selectedList.push({
            item: {
              conceptKey: bKey,
              conceptTitle: cat.title,
              domain: cat.domain,
              topic: cat.topic,
              totalAttempts: 0,
              correctCount: 0,
              missedCount: 0,
            },
            isCalibrated: false,
          });
          existingKeys.add(bKey);
        }
      }
    }
  }

  const checkpoints: KnowledgeCheckpoint[] = selectedList.slice(0, 3).map((entry, index) => {
    const c = entry.item;
    const acc = c.totalAttempts > 0 ? Math.round((c.correctCount / c.totalAttempts) * 100) : 0;
    const cat = CONCEPTS_CATALOG[c.conceptKey];

    let status: 'critical' | 'moderate' | 'solid' = 'critical';
    if (!entry.isCalibrated) {
      status = 'moderate';
    } else if (acc >= 70) {
      status = 'solid';
    } else if (acc >= 40) {
      status = 'moderate';
    } else {
      status = 'critical';
    }

    return {
      rank: index + 1,
      conceptKey: c.conceptKey,
      conceptTitle: c.conceptTitle,
      domain: c.domain,
      topic: c.topic,
      totalAttempts: c.totalAttempts,
      correctCount: c.correctCount,
      missedCount: c.missedCount,
      accuracy: acc,
      isCalibrated: entry.isCalibrated,
      status,
      commonConfusion: cat?.commonConfusion,
      keyDistinction: cat?.keyDistinction,
      summary: cat?.summary,
      sampleCheckQuestion: cat?.sampleCheckQuestion,
      practiceSuggestions: {
        quizTitle: `Targeted Drill: ${c.conceptTitle}`,
        coachPrompt: `Ask Coach to explain ${c.conceptTitle}`,
        flashcardAction: `Drill ${c.conceptTitle} Flashcard`,
      },
    };
  });

  return {
    checkpoints,
    hasQuizHistory,
    totalConceptsTested: testedConcepts.length,
  };
}
