import React, { useState, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Box, TextField, Button, Typography, Avatar, CircularProgress, Paper } from '@mui/material';
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
    browserSupportsSpeechRecognition
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

  const startListening = () => {
    SpeechRecognition.startListening({ continuous: false, interimResults: true });
    setIsListening(true);
    setConversationStage('listening');
    setError(null);
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
  
    const capturedTranscript = transcript.trim();
  
    setSymptoms(capturedTranscript);
    setConversationStage('analyzing');
  
    analyzeSymptoms(capturedTranscript);
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

  const handleFollowUpAnswer = async (answer) => {
    setUserResponses(prev => ({
      ...prev,
      [followUpQuestions[currentQuestionIndex]]: answer
    }));

    if (currentQuestionIndex < followUpQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All follow-up questions answered, get final analysis
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
            responses: userResponses
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
            <Typography variant="h6" align="center" sx={{ mb: 2 }}>
              {conversationStage === 'initial' ?
                'Tap to describe your symptoms' :
                conversationStage === 'listening' ?
                  'Listening...' :
                  conversationStage === 'analyzing' ?
                    'Analyzing your symptoms...' :
                    conversationStage === 'follow-up' ?
                      `Question ${currentQuestionIndex + 1} of ${followUpQuestions.length}` :
                      'Results ready'
              }
            </Typography>

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
                  onChange={(e) => handleFollowUpAnswer(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  {currentQuestionIndex > 0 && (
                    <Button variant="text" size="small" onClick={() => setCurrentQuestionIndex(prev => prev - 1)}>
                      Previous
                    </Button>
                  )}
                  {currentQuestionIndex < followUpQuestions.length - 1 && (
                    <Button variant="contained" color="primary" size="small" onClick={() => setCurrentQuestionIndex(prev => prev + 1)}>
                      Next
                    </Button>
                  )}
                  {currentQuestionIndex === followUpQuestions.length - 1 && (
                    <Button variant="contained" color="primary" size="small" onClick={() => handleFollowUpAnswer('')}>
                      Finish
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
                    �� ⚠��️ This tool provides health information only and does not constitute medical advice.
                    Please consult with a healthcare professional for proper diagnosis and treatment.
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
          VoxCare • Powered by Responsible AI • Privacy First
        </Typography>
      </Box>
    </Box>
  );
};

export default App;
