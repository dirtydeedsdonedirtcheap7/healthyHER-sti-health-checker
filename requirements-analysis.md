# Requirements Analysis

## Project Title

**VoxCare: An Explainable AI Voice-Based STI Symptom Navigation Assistant**

---

# 1. Project Overview

VoxCare is a voice-enabled digital health assistant designed to improve access to sexual health information for individuals who face barriers to healthcare due to stigma, language, low health literacy, financial constraints, or limited access to clinical services.

The system provides evidence-informed symptom navigation, risk stratification, and guidance on appropriate care pathways while explicitly avoiding autonomous diagnosis.

Unlike conventional symptom checkers, VoxCare prioritises accessibility through natural language interaction, explainability, and conservative clinical recommendations, ensuring users understand why recommendations are made and when professional medical care is necessary.

---

# 2. Problem Statement

Current STI symptom checkers often assume users:

- Understand medical terminology
- Are comfortable typing intimate symptoms
- Speak English fluently
- Know when symptoms require urgent care

Consequently, many individuals delay testing or avoid seeking medical advice altogether.

The project aims to reduce these barriers through conversational AI supported by clinical safety mechanisms and transparent decision support.

---

# 3. Stakeholder Analysis

| Stakeholder | Needs | Success Criteria |
|------------|------|------------------|
| End Users | Private, accessible, judgement-free symptom guidance | Increased confidence and timely healthcare seeking |
| Clinicians | Safe recommendations with appropriate referrals | Reduced misinformation and unnecessary consultations |
| Researchers | Anonymous usage insights | Evaluation of accessibility and behavioural outcomes |
| Healthcare Providers | Early patient engagement | Improved referral quality |
| Product Team | Secure, scalable platform | Sustainable deployment and regulatory readiness |

---

# 4. Functional Requirements

## FR-01 Anonymous & Secure Access

**Priority:** Medium

The system shall:

- Allow anonymous access
- Optionally create secure user accounts
- Store user preferences
- Support multilingual interaction

---

## FR-02 Voice-Based Conversation

**Priority:** High

The system shall:

- Accept spoken symptom descriptions
- Convert speech into text
- Support natural conversational dialogue
- Dynamically ask clinically relevant follow-up questions

### Example

**User**

> I've been experiencing pain when I urinate.

↓

**Assistant**

> Have you noticed any unusual discharge?

---

## FR-03 Symptom Extraction

**Priority:** High

The system shall automatically identify:

- Symptoms
- Duration
- Severity
- Risk factors

### Example

Input

> Burning during urination for three days.

Output

| Attribute | Value |
|-----------|------|
| Symptom | Dysuria |
| Duration | 3 Days |
| Severity | Moderate |

---

## FR-04 Risk Stratification

The assistant shall classify users into one of four categories:

- Low Risk
- Moderate Risk
- High Risk
- Emergency

Risk classification shall follow evidence-based clinical guidelines rather than autonomous diagnosis.

---

## FR-05 Clinical Recommendation Engine

The assistant shall recommend one of the following care pathways:

- Self-care advice
- STI screening
- General practitioner consultation
- Sexual health clinic referral
- Emergency department attendance

Recommendations shall be accompanied by a confidence explanation and appropriate clinical disclaimers.

---

## FR-06 Explainability Module

Every recommendation shall include an explanation describing why the recommendation was produced.

### Example

```
Recommendation:
Visit a Sexual Health Clinic

Reasoning:
• Pain during urination
• Recent unprotected intercourse
• Abnormal genital discharge

Confidence:
Moderate

This tool does not provide a medical diagnosis.
```

---

## FR-07 Emergency Detection

The system shall immediately escalate users who report red-flag symptoms including:

- Severe pelvic pain
- High fever
- Heavy bleeding
- Pregnancy-related complications
- Sexual assault disclosures

Emergency guidance overrides all standard recommendations.

---

## FR-08 Clinic Finder

With user consent, the assistant shall recommend nearby:

- Government clinics
- Sexual health centres
- NGOs
- Community healthcare providers

---

# 5. Non-Functional Requirements

## Performance

| Requirement | Target |
|------------|--------|
| API Response Time | < 2 seconds |
| Voice Transcription | < 3 seconds |
| System Availability | 99.5% |
| Monthly Downtime | < 4 hours |

---

## Security

The system shall:

- Encrypt communications using TLS 1.3
- Encrypt stored data using AES-256
- Support OAuth authentication
- Maintain audit logs
- Minimise collection of personally identifiable information

---

## Privacy

The system shall:

- Request explicit user consent
- Anonymise stored conversations
- Support deletion requests
- Avoid storing voice recordings unless authorised
- Separate identity information from health information

---

## Accessibility

The system shall:

- Support voice-only interaction
- Provide multilingual responses
- Support users with low health literacy
- Follow WCAG 2.2 AA accessibility principles where applicable

---

## Reliability

The system shall:

- Recover from interrupted sessions
- Handle invalid inputs gracefully
- Maintain system logs for monitoring
- Continue operating during transient network failures

---

# 6. User Stories

### US-01

**As a user,**

I want to describe my symptoms naturally,

**so that**

I do not need medical knowledge to interact with the system.

---

### US-02

**As a user,**

I want explanations for recommendations,

**so that**

I understand why a particular healthcare pathway is suggested.

---

### US-03

**As a clinician,**

I want emergency symptoms to be prioritised,

**so that**

High-risk users receive immediate escalation.

---

### US-04

**As a researcher,**

I want anonymised analytics,

**so that**

The system can be evaluated without compromising user privacy.

---

### US-05

**As a product owner,**

I want every AI recommendation logged,

**so that**

Clinical safety audits can be performed.

---

# 7. System Constraints

- The application shall **not** provide definitive medical diagnoses.
- Recommendations shall remain conservative.
- Clinical guidance shall comply with recognised clinical standards.
- User privacy shall be protected in accordance with applicable legislation.
- AI outputs shall clearly communicate uncertainty.
- Clinical knowledge shall undergo periodic review.

---

# 8. Assumptions

The project assumes:

- Users possess a smartphone or web browser.
- Internet connectivity is available.
- Users provide truthful symptom information.
- Healthcare services remain available for referral.

---

# 9. Acceptance Criteria

The project will be considered successful if:

- At least **90%** of users complete a symptom assessment independently.
- At least **85%** of participants understand the recommendations.
- Emergency cases are correctly escalated according to predefined rules.
- Average API response time remains below **2 seconds**.
- System Usability Scale (SUS) exceeds **80/100**.

---

# 10. Future Enhancements

Future development may include:

- Electronic Health Record (EHR) integration
- Wearable device connectivity
- Multilingual Large Language Models
- Personalised preventive healthcare reminders
- Federated learning
- Explainable AI dashboards for clinicians
- Continuous model monitoring
- Clinical outcome analytics

---

# 11. Minimum Viable Product (MVP)

## Included Features

- Voice-based symptom collection
- Natural language conversation
- Rule-based red-flag detection
- AI-assisted symptom summarisation
- Risk stratification
- Care pathway recommendations
- Explainable recommendations
- Secure conversation logging (with consent)

---

## Excluded Features

- Automated medical diagnosis
- Electronic Health Record integration
- Prescription generation
- Telemedicine consultations
- Insurance claims
- Advanced multilingual localisation

---

# 12. Success Vision

The primary objective of VoxCare is to improve equitable access to sexual healthcare through a trustworthy, explainable, and privacy-preserving conversational AI assistant. Rather than replacing clinicians, the system is designed to support informed healthcare decision-making, encourage timely medical consultation, and reduce barriers associated with stigma, accessibility, and health literacy.
