import React, { useState, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import {
  Box,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
  Paper,
  IconButton
} from '@mui/material';
import MicOffOutlinedIcon from '@mui/icons-material/MicOffOutlined';
import MicNoneOutlinedIcon from '@mui/icons-material/MicNoneOutlined';
import MicOutlinedIcon from '@mui/icons-material/MicOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import './App.css';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const App = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening
  } = useSpeechRecognition();
  const [isListening, setIsListening] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [conversationStage, setConversationStage] = useState('initial'); // initial, listening, analyzing, results
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [inputMode, setInputMode] = useState('text');
  
  const startListening = async () => {
    if (!browserSupportsSpeechRecognition) {
      setSpeechError(
        'Voice input is not available in this browser. You can type your symptoms instead.'
      );
      setInputMode('text');
      return;
    }
  
    try {
      setSpeechError('');
      setError(null);
  
      resetTranscript();
  
      setInputMode('voice');
      setIsListening(true);
      setConversationStage('listening');
  
      await SpeechRecognition.startListening({
        continuous: false,
        interimResults: true,
        language: 'en-US'
      });
    } catch (err) {
      console.error('Speech recognition failed:', err);
  
      setIsListening(false);
      setInputMode('text');
      setConversationStage('initial');
  
      setSpeechError(
        'We could not start voice input. Please check your microphone permission or type your symptoms instead.'
      );
    }
  };
  const stopListening = async () => {
    try {
      await SpeechRecognition.stopListening();
    } catch (err) {
      console.error('Could not stop speech recognition:', err);
    }
  
    setIsListening(false);
    setInputMode('text');
    setConversationStage('initial');
  
    const capturedTranscript = transcript.trim();
  
    if (capturedTranscript) {
      setSymptoms(capturedTranscript);
    }
  };

  const handleTextSubmit = async () => {
    const text = symptoms.trim();
  
    if (!text) {
      setError('Please describe what you are experiencing.');
      return;
    }
  
    setError(null);
    setConversationStage('analyzing');
  
    await analyzeSymptoms(text);
  };

  const analyzeSymptoms = async (symptomsToAnalyze) => {
    if (!symptomsToAnalyze.trim()) {
      setError('Please describe your symptoms first');
      setConversationStage('initial');
      return;
    }
  
    setLoading(true);
    setError(null);
  
    try {
      const response = await fetch(`${API_URL}/api/analyze-symptoms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms: symptomsToAnalyze
        }),
      });
  
      if (!response.ok) {
        throw new Error('Analysis failed');
      }
  
      const result = await response.json();
  
      setAnalysis(result);
  
      if (result.followUpQuestions && result.followUpQuestions.length > 0) {
        setFollowUpQuestions(result.followUpQuestions);
        setCurrentQuestionIndex(0);
        setConversationStage('follow-up');
      } else {
        setConversationStage('results');
      }
    } catch (err) {
      setError('Failed to analyze symptoms. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowUpAnswer = async () => {
    const answer = currentAnswer.trim();
  
    if (!answer) {
      setError('Please enter an answer before continuing.');
      return;
    }
  
    setError(null);
  
    const updatedResponses = {
      ...userResponses,
      [followUpQuestions[currentQuestionIndex]]: answer
    };
  
    setUserResponses(updatedResponses);
    setCurrentAnswer('');
  
    if (currentQuestionIndex < followUpQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      return;
    }
  
    // All follow-up questions answered
    setConversationStage('analyzing');
    setLoading(true);
  
    try {
      const response = await fetch(`${API_URL}/api/final-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symptoms,
          responses: updatedResponses
        }),
      });
  
      if (!response.ok) {
        throw new Error('Final analysis failed');
      }
  
      const result = await response.json();
  
      setAnalysis(result);
      setConversationStage('results');
    } catch (err) {
      setError('Failed to complete analysis. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    resetTranscript();
    setIsListening(false);
    setSymptoms('');
    setAnalysis(null);
    setLoading(false);
    setError(null);
    setConversationStage('initial');
    setFollowUpQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer('');
    setUserResponses({});
  };

  if (!browserSupportsSpeechRecognition) {
    return (
      <Box textAlign="center" pt={4}>
        <Typography variant="h5" color="error">
          Speech Recognition Not Supported
        </Typography>
        <Typography>
          Your browser doesn't support speech recognition. Please try using Chrome or Edge for the best experience.
        </Typography>
        <Button variant="outlined" onClick={resetSession}>
          Try Again
        </Button>
      </Box>
    );
  }

  return (
    <Box
      className="app-shell"
      sx={{
        maxWidth: 600,
        mx: 'auto',
        pt: 4,
      }}
    >
      <Avatar sx={{ bgcolor: 'primary.main', color: 'white', width: 100, height: 100 }}>
        <MicNoneOutlinedIcon fontSize="large" />
      </Avatar>
      <Typography variant="h4" align="center">
        healthyHER
      </Typography>
      
      <Typography variant="body2" align="center">
        A private, supportive space to understand your symptoms
      </Typography>
      <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
        Describe your symptoms naturally - we'll guide you to appropriate care
      </Typography>

      <Paper sx={{ p: 3, mb: 3, boxShadow: 2 }}>
        {!browserSupportsSpeechRecognition ? (
          <Typography color="error">Speech recognition not supported in this browser</Typography>
        ) : (
          <>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  mb: 1,
                  fontWeight: 700,
                  color: 'text.primary',
                  textAlign: 'center'
                }}
              >
                What are you experiencing?
              </Typography>
            
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 3,
                  textAlign: 'center',
                  lineHeight: 1.6
                }}
              >
                Describe your symptoms in your own words. You can type or use your voice.
              </Typography>
            
              <TextField
                fullWidth
                multiline
                minRows={5}
                maxRows={10}
                value={symptoms}
                onChange={(e) => {
                  setSymptoms(e.target.value);
                  setError(null);
                }}
                placeholder="For example: I've noticed some unusual discharge and burning when I urinate..."
                disabled={loading || isListening}
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    backgroundColor: '#fff'
                  }
                }}
              />
            
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexDirection: { xs: 'column', sm: 'row' }
                }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleTextSubmit}
                  disabled={!symptoms.trim() || loading || isListening}
                  sx={{
                    minHeight: 52,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} color="inherit" />
                  ) : (
                    'Continue'
                  )}
                </Button>
            
                {browserSupportsSpeechRecognition && (
                  <Button
                    fullWidth
                    variant={isListening ? 'contained' : 'outlined'}
                    color={isListening ? 'error' : 'primary'}
                    onClick={isListening ? stopListening : startListening}
                    disabled={loading}
                    sx={{
                      minHeight: 52,
                      borderRadius: 3,
                      textTransform: 'none',
                      fontWeight: 600
                    }}
                  >
                    {isListening ? (
                      <>
                        <MicNoneOutlinedIcon sx={{ mr: 1 }} />
                        Stop listening
                      </>
                    ) : (
                      <>
                        <MicOutlinedIcon sx={{ mr: 1 }} />
                        Speak instead
                      </>
                    )}
                  </Button>
                )}
              </Box>
            
              {isListening && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: '#f1f8f6',
                    border: '1px solid #d5ebe4'
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'primary.main',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  >
                    Listening… speak naturally.
                  </Typography>
            
                  {transcript && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1,
                        color: 'text.secondary',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}
                    >
                      “{transcript}”
                    </Typography>
                  )}
                </Box>
              )}
            
              {speechError && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    backgroundColor: '#fff8e6'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {speechError}
                  </Typography>
                </Box>
              )}
            
              {!browserSupportsSpeechRecognition && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 2,
                    textAlign: 'center'
                  }}
                >
                  Voice input isn't available in this browser. You can still use the
                  text box above.
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              {!isListening && conversationStage !== 'listening' ? (
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={startListening}
                  disabled={loading}
                >
                  <MicOffOutlinedIcon fontSize="inherit" /> Start Speaking
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  onClick={stopListening}
                  disabled={loading}
                >
                  <MicNoneOutlinedIcon fontSize="inherit" /> Stop Listening
                </Button>
              )}
            </Box>

            {transcript && (
              <Box sx={{ mb: 2, p: 2, border: '1px solid', borderRadius: 2 }}>
                <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                  You said: "{transcript}"
                </Typography>
              </Box>
            )}

            {conversationStage === 'follow-up' && followUpQuestions.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {followUpQuestions[currentQuestionIndex]}
                </Typography>
                <TextField
                  label="Your response"
                  variant="outlined"
                  fullWidth
                  multiline
                  minRows={3}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Tell us what you've noticed..."
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  {currentQuestionIndex > 0 && (
                    <Button variant="text" size="small" onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>
                      Previous
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    disabled={!currentAnswer.trim()}
                    onClick={() => {
                      handleFollowUpAnswer(currentAnswer);
                      setCurrentAnswer('');
                    }}
                  >
                    Next
                  </Button>
                 {currentQuestionIndex === followUpQuestions.length - 1 && (
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={handleFollowUpAnswer}
                      disabled={loading}
                    >
                      {loading ? 'Analyzing...' : 'Finish'}
                    </Button>
                  )}
                </Box>
              </>
            )}

            {conversationStage === 'results' && analysis && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>
                  Recommendation
                </Typography>
                <Box sx={{ p: 2, borderRadius: 2, mb: 2 }}
                     bgcolor={analysis.riskLevel === 'low' ? 'success.light' :
                               analysis.riskLevel === 'moderate' ? 'warning.light' :
                               analysis.riskLevel === 'high' ? 'error.light' :
                               'info.light'}>
                  <Typography variant="body1" fontWeight="bold">
                    {analysis.recommendation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Risk Level: {analysis.riskLevel.charAt(0).toUpperCase() + analysis.riskLevel.slice(1)}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Explanation
                  </Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                    {analysis.explanation}
                  </Typography>
                </Box>

                {analysis.confidence && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      Confidence Level
                    </Typography>
                    <Typography variant="body1">
                      {analysis.confidence}%
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    ⚠️ This tool provides health information only and does not constitute medical advice. Please consult a healthcare professional for diagnosis and treatment.
                  </Typography>
                </Box>
              </Box>
            )}

            {error && (
              <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'error.light' }}>
                <Typography color="error">
                  {error}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={resetSession}
          sx={{ mb: 1 }}
        >
          New Assessment
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
          Powered by Responsible AI • Privacy First
        </Typography>
      </Box>
    </Box>
  );
};

export default App;
