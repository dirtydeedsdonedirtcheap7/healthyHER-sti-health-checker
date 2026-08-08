
```js
/**
 * healthyHER Conversation Engine
 *
 * Responsible for deciding:
 * - what information we already know
 * - what information is still missing
 * - what question should be asked next
 * - when enough information has been collected
 *
 * This file does NOT diagnose conditions.
 * Medical safety/escalation rules should live in safetyRules.js.
 */

const QUESTION_PRIORITY = [
  'onset',
  'severity',
  'location',
  'associatedSymptoms',
  'discharge',
  'urination',
  'skinChanges',
  'sexualExposure',
  'exposureTiming',
  'testingHistory',
  'pregnancy'
];

/**
 * Creates a fresh conversation state.
 */
function createConversationState(initialData = {}) {
  return {
    language: initialData.language || 'en',
    goal: initialData.goal || 'symptoms',

    symptoms: initialData.symptoms || [],

    onset: initialData.onset || null,
    severity: initialData.severity || null,
    location: initialData.location || null,

    associatedSymptoms: initialData.associatedSymptoms || [],

    discharge: initialData.discharge || null,
    urination: initialData.urination || null,
    skinChanges: initialData.skinChanges || null,

    sexualExposure: initialData.sexualExposure || null,
    exposureTiming: initialData.exposureTiming || null,

    testingHistory: initialData.testingHistory || null,
    pregnancy: initialData.pregnancy || null,

    safetyFlags: initialData.safetyFlags || [],

    answeredQuestions: initialData.answeredQuestions || [],

    status: 'collecting_information'
  };
}

/**
 * Adds a symptom to the conversation state.
 */
function addSymptom(state, symptom) {
  if (!symptom || typeof symptom !== 'string') {
    return state;
  }

  const normalized = symptom.trim();

  if (!normalized) {
    return state;
  }

  const exists = state.symptoms.some(
    existing => existing.toLowerCase() === normalized.toLowerCase()
  );

  if (!exists) {
    state.symptoms.push(normalized);
  }

  return state;
}

/**
 * Records an answer to a conversation question.
 */
function recordAnswer(state, field, value) {
  if (!field) {
    return state;
  }

  state[field] = value;

  if (!state.answeredQuestions.includes(field)) {
    state.answeredQuestions.push(field);
  }

  return state;
}

/**
 * Determines whether a field contains useful information.
 */
function hasAnswer(value) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

/**
 * Returns the next question the conversation should ask.
 *
 * We deliberately ask ONE question at a time.
 */
function getNextQuestion(state) {
  // 1. We need to know when symptoms began.
  if (!hasAnswer(state.onset)) {
    return {
      field: 'onset',
      type: 'text',
      question: 'When did you first notice these symptoms?',
      reason: 'Understanding when symptoms began helps put them into context.'
    };
  }

  // 2. Determine severity.
  if (!hasAnswer(state.severity)) {
    return {
      field: 'severity',
      type: 'choice',
      question: 'How would you describe the severity of your symptoms?',
      options: [
        'Mild',
        'Moderate',
        'Severe',
        'Not sure'
      ],
      reason: 'Severity helps determine how urgently someone may need care.'
    };
  }

  // 3. Determine where symptoms are occurring.
  if (!hasAnswer(state.location)) {
    return {
      field: 'location',
      type: 'choice',
      question: 'Where are you experiencing the symptoms?',
      options: [
        'Genital area',
        'Urinary area',
        'Mouth or throat',
        'Rectal area',
        'Skin',
        'More than one area',
        'Not sure'
      ],
      reason: 'The location helps determine which follow-up questions are relevant.'
    };
  }

  // 4. Ask about discharge when appropriate.
  if (!hasAnswer(state.discharge)) {
    return {
      field: 'discharge',
      type: 'choice',
      question: 'Have you noticed any unusual discharge?',
      options: [
        'Yes',
        'No',
        'Not sure'
      ],
      reason: 'Discharge can be an important symptom to discuss with a healthcare professional.'
    };
  }

  // 5. Ask about urination.
  if (!hasAnswer(state.urination)) {
    return {
      field: 'urination',
      type: 'choice',
      question: 'Have you experienced pain or burning when urinating?',
      options: [
        'Yes',
        'No',
        'Not sure'
      ],
      reason: 'Urination symptoms can occur with several different conditions.'
    };
  }

  // 6. Ask about sores or skin changes.
  if (!hasAnswer(state.skinChanges)) {
    return {
      field: 'skinChanges',
      type: 'choice',
      question: 'Have you noticed any sores, blisters, rashes, or unusual skin changes?',
      options: [
        'Yes',
        'No',
        'Not sure'
      ],
      reason: 'Skin changes may require additional evaluation.'
    };
  }

  // 7. Ask about sexual exposure.
  if (!hasAnswer(state.sexualExposure)) {
    return {
      field: 'sexualExposure',
      type: 'choice',
      question: 'Have you had sexual contact that you are concerned may have exposed you to an STI?',
      options: [
        'Yes',
        'No',
        'Not sure',
        'Prefer not to say'
      ],
      reason: 'Exposure history can help determine whether STI testing should be discussed.'
    };
  }

  // 8. Ask when the possible exposure occurred.
  if (
    state.sexualExposure === 'Yes' &&
    !hasAnswer(state.exposureTiming)
  ) {
    return {
      field: 'exposureTiming',
      type: 'choice',
      question: 'Approximately when did the possible exposure happen?',
      options: [
        'Within the last few days',
        'Within the last 1–2 weeks',
        'Within the last month',
        'More than a month ago',
        'Not sure'
      ],
      reason: 'The timing of a possible exposure can affect testing and follow-up discussions.'
    };
  }

  // 9. Ask about previous testing.
  if (!hasAnswer(state.testingHistory)) {
    return {
      field: 'testingHistory',
      type: 'choice',
      question: 'Have you had an STI test recently?',
      options: [
        'Yes',
        'No',
        'Not sure',
        'Prefer not to say'
      ],
      reason: 'Recent testing can provide useful context for the assessment.'
    };
  }

  // 10. Pregnancy context can materially affect healthcare guidance.
  if (!hasAnswer(state.pregnancy)) {
    return {
      field: 'pregnancy',
      type: 'choice',
      question: 'Is there a possibility that you are pregnant?',
      options: [
        'Yes',
        'No',
        'Not sure',
        'Prefer not to say'
      ],
      reason: 'Pregnancy can affect how certain symptoms and infections should be evaluated.'
    };
  }

  // We have collected the basic information.
  state.status = 'ready_for_assessment';

  return null;
}

/**
 * Returns a summary of the information collected so far.
 *
 * This is useful for the AI service and for displaying
 * an understandable summary to the user.
 */
function getConversationSummary(state) {
  return {
    goal: state.goal,
    symptoms: state.symptoms,
    onset: state.onset,
    severity: state.severity,
    location: state.location,
    associatedSymptoms: state.associatedSymptoms,
    discharge: state.discharge,
    urination: state.urination,
    skinChanges: state.skinChanges,
    sexualExposure: state.sexualExposure,
    exposureTiming: state.exposureTiming,
    testingHistory: state.testingHistory,
    pregnancy: state.pregnancy,
    safetyFlags: state.safetyFlags,
    status: state.status
  };
}

/**
 * Determines whether the conversation has enough
 * information to move to assessment.
 */
function isReadyForAssessment(state) {
  return state.status === 'ready_for_assessment';
}

/**
 * Returns which pieces of information are still missing.
 */
function getMissingInformation(state) {
  const missing = [];

  if (!hasAnswer(state.onset)) {
    missing.push('onset');
  }

  if (!hasAnswer(state.severity)) {
    missing.push('severity');
  }

  if (!hasAnswer(state.location)) {
    missing.push('location');
  }

  if (!hasAnswer(state.discharge)) {
    missing.push('discharge');
  }

  if (!hasAnswer(state.urination)) {
    missing.push('urination');
  }

  if (!hasAnswer(state.skinChanges)) {
    missing.push('skinChanges');
  }

  if (!hasAnswer(state.sexualExposure)) {
    missing.push('sexualExposure');
  }

  if (
    state.sexualExposure === 'Yes' &&
    !hasAnswer(state.exposureTiming)
  ) {
    missing.push('exposureTiming');
  }

  if (!hasAnswer(state.testingHistory)) {
    missing.push('testingHistory');
  }

  if (!hasAnswer(state.pregnancy)) {
    missing.push('pregnancy');
  }

  return missing;
}

module.exports = {
  QUESTION_PRIORITY,
  createConversationState,
  addSymptom,
  recordAnswer,
  getNextQuestion,
  getConversationSummary,
  getMissingInformation,
  isReadyForAssessment
};
```
