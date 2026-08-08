const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");

const {
  createConversationState,
  addSymptom,
  recordAnswer,
  getNextQuestion,
  getConversationSummary,
  getMissingInformation,
  isReadyForAssessment
} = require("./src/assessment/conversationEngine");

const {
  evaluateSafety,
  shouldStopConversation
} = require("./src/assessment/safetyRules");

dotenv.config();

const app = express();

app.use(express.json());

// STI symptom knowledge base (simplified for prototype)
const stiKnowledgeBase = {
  // Common STI symptoms and their associated risks
  symptoms: {
    dysuria: {
      name: "Pain or burning during urination",
      associatedStis: ["chlamydia", "gonorrhea", "trichomoniasis", "herpes"],
      riskLevel: "moderate"
    },
    discharge: {
      name: "Unusual genital discharge",
      associatedStis: ["chlamydia", "gonorrhea", "trichomoniasis", "bacterial vaginosis"],
      riskLevel: "moderate"
    },
    genitalSores: {
      name: "Genital sores, blisters, or ulcers",
      associatedStis: ["herpes", "syphilis", "chancroid"],
      riskLevel: "high"
    },
    pelvicPain: {
      name: "Pelvic or abdominal pain",
      associatedStis: ["chlamydia", "gonorrhea", "pid"],
      riskLevel: "moderate to high"
    },
    bleeding: {
      name: "Abnormal vaginal bleeding",
      associatedStis: ["chlamydia", "gonorrhea"],
      riskLevel: "moderate"
    },
    itching: {
      name: "Genital itching or irritation",
      associatedStis: ["trichomoniasis", "yeast infection", "hpv"],
      riskLevel: "low to moderate"
    },
    swollenGlands: {
      name: "Swollen lymph nodes in groin",
      associatedStis: ["syphilis", "hiv", "herpes"],
      riskLevel: "high"
    },
    rash: {
      name: "Skin rash (especially palms/soles)",
      associatedStis: ["syphilis", "hiv"],
      riskLevel: "high"
    }
  },

  // Emergency symptoms requiring immediate attention
  emergencySymptoms: [
    "severe pelvic pain",
    "high fever",
    "heavy bleeding",
    "severe abdominal pain",
    "vomiting with pain",
    "confusion",
    "difficulty breathing"
  ],

  // Risk stratification logic
  riskStratification: (symptoms, duration, severity) => {
    let riskScore = 0;
    const symptomsLower = symptoms.toLowerCase();

    // Check for emergency symptoms first
    for (const emergency of stiKnowledgeBase.emergencySymptoms) {
      if (symptomsLower.includes(emergency)) {
        return {
          level: "emergency",
          recommendation: "Seek immediate emergency medical care",
          explanation: "You've reported symptoms that may require immediate medical attention.",
          confidence: 95
        };
      }
    }

    // Score based on symptoms mentioned
    Object.keys(stiKnowledgeBase.symptoms).forEach(key => {
      const symptom = stiKnowledgeBase.symptoms[key];
      if (symptomsLower.includes(symptom.name.toLowerCase()) ||
          symptomsLower.includes(key.replace(/([A-Z])/g, ' $1').toLowerCase())) {
        if (symptom.riskLevel === "high") riskScore += 3;
        else if (symptom.riskLevel === "moderate") riskScore += 2;
        else if (symptom.riskLevel === "low") riskScore += 1;
      }
    });

    // Adjust for duration
    if (symptomsLower.includes("week") || symptomsLower.includes("weeks")) {
      riskScore += 1;
    }
    if (symptomsLower.includes("month") || symptomsLower.includes("months")) {
      riskScore += 2;
    }

    // Adjust for severity indicators
    if (symptomsLower.includes("severe") || symptomsLower.includes("bad") ||
        symptomsLower.includes("terrible") || symptomsLower.includes("worst")) {
      riskScore += 2;
    }
    if (symptomsLower.includes("moderate") || symptomsLower.includes("medium")) {
      riskScore += 1;
    }

    // Determine risk level based on score
    if (riskScore >= 6) {
      return {
        level: "high",
        recommendation: "Visit a Sexual Health Clinic or see a healthcare provider within 24-48 hours",
        explanation: "Based on your symptoms, there's a higher likelihood of an STI that requires prompt medical attention.",
        confidence: 80 + Math.min(riskScore * 2, 15)
      };
    } else if (riskScore >= 3) {
      return {
        level: "moderate",
        recommendation: "Consider visiting a Sexual Health Clinic or your healthcare provider for testing",
        explanation: "Your symptoms warrant medical evaluation to rule out potential infections.",
        confidence: 70 + Math.min(riskScore * 3, 20)
      };
    } else if (riskScore > 0) {
      return {
        level: "low",
        recommendation: "Monitor symptoms and consider self-care; consult if symptoms persist or worsen",
        explanation: "Your symptoms may be mild, but it's still wise to pay attention to any changes.",
        confidence: 60 + Math.min(riskScore * 4, 25)
      };
    } else {
      return {
        level: "very low",
        recommendation: "Continue monitoring; practice safe sexual health habits",
        explanation: "No concerning STI-specific symptoms detected in your description.",
        confidence: 70
      };
    }
  },

  // Generate follow-up questions based on initial symptoms
  generateFollowUpQuestions: (symptoms) => {
    const questions = [];
    const symptomsLower = symptoms.toLowerCase();

    // If dysuria mentioned, ask about discharge and frequency
    if (symptomsLower.includes("burn") || symptomsLower.includes("pain") ||
        symptomsLower.includes("urinate") || symptomsLower.includes("urination")) {
      questions.push("Have you noticed any unusual discharge from your genital area?");
      questions.push("How frequent is the burning or pain during urination?");
    }

    // If discharge mentioned, ask about color, odor, and amount
    if (symptomsLower.includes("discharge") || symptomsLower.includes("fluid")) {
      questions.push("Can you describe the color and consistency of the discharge?");
      questions.push("Have you noticed any unusual odor associated with the discharge?");
    }

    // If pain mentioned, ask about location and severity
    if (symptomsLower.includes("pain") || symptomsLower.includes("ache") ||
        symptomsLower.includes("sore") || symptomsLower.includes("tender")) {
      questions.push("Where exactly do you feel the pain or discomfort?");
      questions.push("On a scale of 1-10, how would you rate the severity of your discomfort?");
    }

    // General questions for any symptoms
    if (questions.length === 0) {
      questions.push("How long have you been experiencing these symptoms?");
      questions.push("Have you had any recent sexual activity with new or multiple partners?");
      questions.push("Are you experiencing any other symptoms like fever, fatigue, or swollen glands?");
    }

    // Limit to 3 follow-up questions maximum
    return questions.slice(0, 3);
  }
};

app.get("/", (req, res) => {
  res.send("VoxCare AI-STI Symptom Checker API");
});

```js
// Start a new conversation
app.post("/api/conversation/start", (req, res) => {
  try {
    const {
      symptoms = "",
      language = "en",
      goal = "symptoms"
    } = req.body;

    const state = createConversationState({
      language,
      goal
    });

    if (symptoms.trim()) {
      addSymptom(state, symptoms);
    }

    const safety = evaluateSafety(state);

    if (safety.shouldStopAssessment) {
      return res.json({
        success: true,
        conversation: state,
        nextQuestion: null,
        readyForAssessment: false,
        safety
      });
    }

    const nextQuestion = getNextQuestion(state);

    res.json({
      success: true,
      conversation: state,
      nextQuestion,
      readyForAssessment: isReadyForAssessment(state)
    });
  } catch (error) {
    console.error("Error starting conversation:", error);

    res.status(500).json({
      error: "Unable to start assessment"
    });
  }
});


// Continue an existing conversation
app.post("/api/conversation/respond", (req, res) => {
  try {
    const {
      conversation,
      field,
      answer
    } = req.body;

    if (!conversation) {
      return res.status(400).json({
        error: "Conversation state is required"
      });
    }

    if (!field) {
      return res.status(400).json({
        error: "Question field is required"
      });
    }

    if (answer === undefined || answer === null) {
      return res.status(400).json({
        error: "Answer is required"
      });
    }

    const state = {
      ...conversation,
      symptoms: Array.isArray(conversation.symptoms)
        ? conversation.symptoms
        : [],
      answeredQuestions: Array.isArray(conversation.answeredQuestions)
        ? conversation.answeredQuestions
        : [],
      safetyFlags: Array.isArray(conversation.safetyFlags)
        ? conversation.safetyFlags
        : []
    };

    recordAnswer(state, field, answer);

    const safety = evaluateSafety(state);

    if (safety.shouldStopAssessment) {
      return res.json({
        success: true,
        conversation: state,
        nextQuestion: null,
        readyForAssessment: false,
        safety,
        summary: getConversationSummary(state)
      });
    }

    const nextQuestion = getNextQuestion(state);

    res.json({
      success: true,
      conversation: state,
      nextQuestion,
      readyForAssessment: isReadyForAssessment(state),
      missingInformation: getMissingInformation(state),
      summary: getConversationSummary(state)
    });
  } catch (error) {
    console.error("Error processing conversation response:", error);

    res.status(500).json({
      error: "Unable to process response"
    });
  }
});
```

// Symptom analysis endpoint
app.post("/api/analyze-symptoms", async (req, res) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms || symptoms.trim() === "") {
      return res.status(400).json({ error: "Symptoms description is required" });
    }

    // Perform initial risk stratification
    const initialAssessment = stiKnowledgeBase.riskStratification(symptoms, "", "");

    // Generate follow-up questions
    const followUpQuestions = stiKnowledgeBase.generateFollowUpQuestions(symptoms);

    res.json({
      riskLevel: initialAssessment.level,
      recommendation: initialAssessment.recommendation,
      explanation: initialAssessment.explanation,
      confidence: initialAssessment.confidence,
      followUpQuestions: followUpQuestions
    });
  } catch (error) {
    console.error("Error in symptom analysis:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Final analysis endpoint after follow-up questions
app.post("/api/final-analysis", async (req, res) => {
  try {
    const { symptoms, responses } = req.body;

    if (!symptoms) {
      return res.status(400).json({ error: "Symptoms description is required" });
    }

    // Combine initial symptoms with follow-up responses for comprehensive analysis
    const allText = symptoms + " " + Object.values(responses).join(" ");

    // Perform final risk stratification
    const finalAssessment = stiKnowledgeBase.riskStratification(allText, "", "");

    // Adjust confidence based on additional information
    const confidenceAdjustment = Object.keys(responses).length * 5; // +5% per answered question
    const adjustedConfidence = Math.min(finalAssessment.confidence + confidenceAdjustment, 95);

    res.json({
      riskLevel: finalAssessment.level,
      recommendation: finalAssessment.recommendation,
      explanation: finalAssessment.explanation,
      confidence: adjustedConfidence,
      symptomsAnalyzed: symptoms,
      followUpResponses: responses
    });
  } catch (error) {
    console.error("Error in final analysis:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`VoxCare AI-STI Backend running on port ${PORT}`);
});

module.exports = app;
