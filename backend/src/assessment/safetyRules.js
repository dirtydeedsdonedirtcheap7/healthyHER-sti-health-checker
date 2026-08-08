```js
/**
 * healthyHER Safety Rules
 *
 * IMPORTANT:
 * This module is NOT a diagnostic system.
 *
 * Its purpose is to identify potentially urgent situations
 * where the normal conversational assessment should stop
 * and the user should seek appropriate medical care.
 *
 * The rules intentionally favor safety.
 */

const SAFETY_LEVELS = {
  EMERGENCY: "emergency",
  URGENT: "urgent",
  ROUTINE: "routine"
};


/**
 * Convert different types of user input into searchable text.
 */
function normalizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(" ").toLowerCase();
  }

  if (typeof value === "object") {
    return Object.values(value).join(" ").toLowerCase();
  }

  return String(value).toLowerCase();
}


/**
 * Check whether text contains one of several phrases.
 */
function containsAny(text, phrases) {
  return phrases.some(phrase => text.includes(phrase));
}


/**
 * Detect potentially life-threatening symptoms.
 *
 * These should stop the normal assessment immediately.
 */
function detectEmergencySymptoms(state) {
  const text = normalizeText({
    symptoms: state.symptoms,
    severity: state.severity,
    location: state.location,
    associatedSymptoms: state.associatedSymptoms,
    discharge: state.discharge,
    urination: state.urination,
    skinChanges: state.skinChanges,
    safetyFlags: state.safetyFlags
  });

  const flags = [];

  // Severe or rapidly worsening pelvic/abdominal pain.
  if (
    containsAny(text, [
      "severe pelvic pain",
      "severe abdominal pain",
      "severe lower abdominal pain",
      "severe stomach pain",
      "extreme pelvic pain",
      "extreme abdominal pain",
      "worst pain",
      "sudden severe pain",
      "sudden intense pain",
      "pain is unbearable",
      "unbearable pain"
    ])
  ) {
    flags.push("severe_pelvic_or_abdominal_pain");
  }

  // Heavy vaginal bleeding.
  if (
    containsAny(text, [
      "heavy vaginal bleeding",
      "heavy bleeding",
      "bleeding heavily",
      "soaking pads",
      "soaking a pad",
      "bleeding won't stop"
    ])
  ) {
    flags.push("heavy_bleeding");
  }

  // Fainting / significant loss of consciousness.
  if (
    containsAny(text, [
      "fainted",
      "passed out",
      "lost consciousness",
      "blacked out",
      "about to faint"
    ])
  ) {
    flags.push("fainting_or_loss_of_consciousness");
  }

  // Serious breathing difficulty.
  if (
    containsAny(text, [
      "difficulty breathing",
      "trouble breathing",
      "can't breathe",
      "cannot breathe",
      "struggling to breathe",
      "shortness of breath"
    ])
  ) {
    flags.push("breathing_difficulty");
  }

  // Sudden confusion.
  if (
    containsAny(text, [
      "confused",
      "confusion",
      "suddenly confused",
      "not thinking clearly"
    ])
  ) {
    flags.push("confusion");
  }

  // Severe systemic illness.
  if (
    containsAny(text, [
      "very high fever",
      "extremely high fever",
      "severe fever",
      "shaking violently",
      "severe chills",
      "very unwell"
    ])
  ) {
    flags.push("severe_systemic_symptoms");
  }

  // Severe vomiting associated with significant pain.
  if (
    containsAny(text, [
      "severe vomiting",
      "can't stop vomiting",
      "cannot stop vomiting"
    ]) &&
    containsAny(text, [
      "pelvic pain",
      "abdominal pain",
      "stomach pain",
      "lower abdominal pain"
    ])
  ) {
    flags.push("vomiting_with_severe_pain");
  }

  return flags;
}


/**
 * Detect situations that warrant prompt medical evaluation,
 * but do not necessarily indicate an immediate emergency.
 */
function detectUrgentSymptoms(state) {
  const text = normalizeText({
    symptoms: state.symptoms,
    severity: state.severity,
    location: state.location,
    associatedSymptoms: state.associatedSymptoms,
    discharge: state.discharge,
    urination: state.urination,
    skinChanges: state.skinChanges
  });

  const flags = [];

  // Pelvic pain that is not clearly an emergency.
  if (
    containsAny(text, [
      "pelvic pain",
      "pelvic discomfort",
      "lower abdominal pain",
      "lower tummy pain"
    ])
  ) {
    flags.push("pelvic_or_lower_abdominal_pain");
  }

  // Fever/chills can warrant prompt assessment when occurring
  // alongside genital/urinary symptoms.
  if (
    containsAny(text, [
      "fever",
      "temperature",
      "chills",
      "shivering",
      "feeling hot and cold"
    ])
  ) {
    flags.push("fever_or_chills");
  }

  // Significant pain with urination.
  if (
    containsAny(text, [
      "severe burning when urinating",
      "severe pain when urinating",
      "can't pee",
      "cannot pee",
      "unable to urinate",
      "difficulty urinating"
    ])
  ) {
    flags.push("significant_urination_problem");
  }

  // New unusual bleeding.
  if (
    containsAny(text, [
      "unusual bleeding",
      "abnormal bleeding",
      "bleeding after sex",
      "bleeding between periods"
    ])
  ) {
    flags.push("unusual_bleeding");
  }

  // Significant vomiting.
  if (
    containsAny(text, [
      "vomiting",
      "throwing up",
      "being sick"
    ])
  ) {
    flags.push("vomiting");
  }

  return flags;
}


/**
 * Pregnancy-related safety checks.
 *
 * Pregnancy itself is NOT an emergency.
 * The combination of pregnancy/possible pregnancy with
 * certain symptoms can require faster medical evaluation.
 */
function detectPregnancyConcerns(state) {
  const text = normalizeText({
    symptoms: state.symptoms,
    severity: state.severity,
    location: state.location,
    associatedSymptoms: state.associatedSymptoms
  });

  const pregnancyStatus = normalizeText(state.pregnancy);

  const possiblePregnancy =
    pregnancyStatus.includes("yes") ||
    pregnancyStatus.includes("possible") ||
    pregnancyStatus.includes("not sure") ||
    pregnancyStatus.includes("maybe");

  if (!possiblePregnancy) {
    return [];
  }

  const flags = [];

  if (
    containsAny(text, [
      "pelvic pain",
      "abdominal pain",
      "lower abdominal pain",
      "lower tummy pain",
      "severe pain"
    ])
  ) {
    flags.push("possible_pregnancy_with_abdominal_or_pelvic_pain");
  }

  if (
    containsAny(text, [
      "vaginal bleeding",
      "heavy bleeding",
      "spotting",
      "bleeding"
    ])
  ) {
    flags.push("possible_pregnancy_with_bleeding");
  }

  if (
    containsAny(text, [
      "shoulder pain",
      "pain in my shoulder"
    ])
  ) {
    flags.push("possible_pregnancy_with_shoulder_pain");
  }

  if (
    containsAny(text, [
      "dizzy",
      "lightheaded",
      "faint",
      "fainted",
      "passed out"
    ])
  ) {
    flags.push("possible_pregnancy_with_dizziness_or_fainting");
  }

  return flags;
}


/**
 * Main safety evaluation.
 *
 * Returns a structured result that the API can send to the
 * frontend or use to interrupt the conversation.
 */
function evaluateSafety(state) {
  const emergencyFlags = detectEmergencySymptoms(state);
  const pregnancyFlags = detectPregnancyConcerns(state);
  const urgentFlags = detectUrgentSymptoms(state);

  /*
   * Emergency conditions always take priority.
   */
  if (emergencyFlags.length > 0) {
    return {
      level: SAFETY_LEVELS.EMERGENCY,
      shouldStopAssessment: true,
      flags: emergencyFlags,
      message:
        "Some of the symptoms you've described may require immediate medical attention.",
      action:
        "Please seek emergency medical care now. If you are in immediate danger or cannot safely get to care, contact your local emergency service.",
      disclaimer:
        "This is a safety warning, not a diagnosis."
    };
  }

  /*
   * Pregnancy + concerning symptoms gets elevated.
   */
  if (pregnancyFlags.length > 0) {
    return {
      level: SAFETY_LEVELS.URGENT,
      shouldStopAssessment: true,
      flags: pregnancyFlags,
      message:
        "Because pregnancy or possible pregnancy is involved, these symptoms should be assessed promptly by a healthcare professional.",
      action:
        "Please contact a healthcare professional or appropriate urgent medical service for advice as soon as possible.",
      disclaimer:
        "This is a safety warning, not a diagnosis."
    };
  }

  /*
   * Other potentially concerning symptoms.
   */
  if (urgentFlags.length > 0) {
    return {
      level: SAFETY_LEVELS.URGENT,
      shouldStopAssessment: false,
      flags: urgentFlags,
      message:
        "Some of your symptoms may need prompt medical evaluation.",
      action:
        "Consider contacting a healthcare professional or sexual health service promptly, especially if symptoms are worsening.",
      disclaimer:
        "This is a safety warning, not a diagnosis."
    };
  }

  /*
   * Nothing in this rule set indicates urgent escalation.
   */
  return {
    level: SAFETY_LEVELS.ROUTINE,
    shouldStopAssessment: false,
    flags: [],
    message:
      "No urgent warning signs were identified by the safety checks.",
    action:
      "You can continue the assessment.",
    disclaimer:
      "The absence of warning signs does not rule out an STI or another medical condition."
  };
}


/**
 * Convenience helper for the conversation engine.
 */
function shouldStopConversation(state) {
  const result = evaluateSafety(state);

  return result.shouldStopAssessment;
}


module.exports = {
  SAFETY_LEVELS,
  detectEmergencySymptoms,
  detectUrgentSymptoms,
  detectPregnancyConcerns,
  evaluateSafety,
  shouldStopConversation
};
```
