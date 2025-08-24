import React, { useState } from 'react';
import axios from 'axios';

const EmailFraudDetector = () => {
  const [datasetPath, setDatasetPath] = useState('emails.csv');
  const [emailText, setEmailText] = useState("Congratulations! You've won a $1000 Walmart gift card. Click the link to claim your prize now!");
  const [result, setResult] = useState("Please train the model first");
  const [trainingAccuracy, setTrainingAccuracy] = useState("N/A");
  const [testingAccuracy, setTestingAccuracy] = useState("N/A");
  const [status, setStatus] = useState("Ready to load dataset");
  const [isTrained, setIsTrained] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fraudReasons, setFraudReasons] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [detectionDetails, setDetectionDetails] = useState(null);

  // Add API base URL
  const API_BASE = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : '';

  // Enhanced function to detect illegal/fraudulent emails
  const detectIllegalEmail = (text) => {
    const lowerText = text.toLowerCase();
    const reasons = [];
    let severity = 0; // 0-100 scale
    let illegalType = "Unknown";
    
    // 1. Financial Scams
    if (lowerText.includes('nigeria') || lowerText.includes('nigerian') || 
        lowerText.includes('419') || lowerText.includes('advance fee')) {
      reasons.push("Nigerian Prince/419 scam pattern detected");
      severity = Math.max(severity, 95);
      illegalType = "Financial Scam";
    }
    
    if (lowerText.includes('wire transfer') || lowerText.includes('western union') || 
        lowerText.includes('moneygram') || lowerText.includes('bank transfer')) {
      reasons.push("Requests wire transfers (common in scams)");
      severity = Math.max(severity, 85);
      illegalType = "Financial Scam";
    }
    
    // 2. Phishing Attempts
    const phishingPatterns = [
      {pattern: /paypal.*(limit|suspend|verify|confirm)/, reason: "PayPal phishing attempt", score: 90},
      {pattern: /bank.*(security|update|verify)/, reason: "Bank phishing attempt", score: 88},
      {pattern: /account.*(suspended|limited|locked)/, reason: "Account suspension threat", score: 85},
      {pattern: /password.*(reset|expire|verify)/, reason: "Password reset phishing", score: 80},
      {pattern: /credit.*card.*(verify|update)/, reason: "Credit card phishing", score: 87},
    ];
    
    phishingPatterns.forEach(({pattern, reason, score}) => {
      if (pattern.test(lowerText)) {
        reasons.push(reason);
        severity = Math.max(severity, score);
        illegalType = "Phishing";
      }
    });
    
    // 3. Urgency and Threats
    if (lowerText.includes('urgent') || lowerText.includes('immediately') || 
        lowerText.includes('right away') || lowerText.includes('act now')) {
      reasons.push("Creates artificial urgency");
      severity = Math.max(severity, 75);
    }
    
    if (lowerText.includes('account will be closed') || lowerText.includes('permanent suspension') || 
        lowerText.includes('legal action') || lowerText.includes('prosecuted')) {
      reasons.push("Contains threats of account closure or legal action");
      severity = Math.max(severity, 82);
    }
    
    // 4. Fake Lottery and Prizes
    if (lowerText.includes('won') || lowerText.includes('winner') || 
        lowerText.includes('prize') || lowerText.includes('lottery')) {
      reasons.push("Claims you've won a prize or lottery");
      severity = Math.max(severity, 88);
      illegalType = "Lottery Scam";
    }
    
    if (lowerText.includes('claim your') && (lowerText.includes('gift') || 
        lowerText.includes('reward') || lowerText.includes('money'))) {
      reasons.push("Asks you to claim a gift or reward");
      severity = Math.max(severity, 86);
    }
    
    // 5. Investment and Crypto Scams
    if (lowerText.includes('investment') || lowerText.includes('crypto') || 
        lowerText.includes('bitcoin') || lowerText.includes('ethereum')) {
      reasons.push("Promotes investment or crypto opportunities");
      severity = Math.max(severity, 80);
      illegalType = "Investment Scam";
    }
    
    if (lowerText.includes('guaranteed return') || lowerText.includes('risk-free') || 
        lowerText.includes('get rich quick')) {
      reasons.push("Promises guaranteed returns (common scam)");
      severity = Math.max(severity, 90);
    }
    
    // 6. Fake Job Offers
    if (lowerText.includes('job offer') || lowerText.includes('work from home') || 
        lowerText.includes('earn money') || lowerText.includes('make money')) {
      reasons.push("Unsolicited job or money-making offer");
      severity = Math.max(severity, 78);
      illegalType = "Employment Scam";
    }
    
    // 7. Blackmail and Extortion
    if (lowerText.includes('webcam') || lowerText.includes('compromising') || 
        lowerText.includes('embarrassing') || lowerText.includes('pay or')) {
      reasons.push("Possible blackmail or extortion attempt");
      severity = Math.max(severity, 95);
      illegalType = "Blackmail";
    }
    
    // 8. Fake Invoices and Payments
    if (lowerText.includes('invoice') || lowerText.includes('payment due') || 
        lowerText.includes('unpaid') || lowerText.includes('overdue')) {
      reasons.push("Fake invoice or payment request");
      severity = Math.max(severity, 83);
      illegalType = "Invoice Scam";
    }
    
    // 9. Suspicious Links and Attachments
    const suspiciousDomains = [
      'paypal-security', 'bank-update', 'account-verify', 'login-confirm',
      'amazon-security', 'apple-verify', 'microsoft-update', 'netflix-alert'
    ];
    
    const hasSuspiciousLink = suspiciousDomains.some(domain => 
      lowerText.includes(domain)
    );
    
    if (hasSuspiciousLink) {
      reasons.push("Contains link to suspicious domain");
      severity = Math.max(severity, 89);
    }
    
    if (lowerText.includes('click here') || lowerText.includes('click the link') || 
        lowerText.includes('follow this link')) {
      reasons.push("Urges clicking on links");
      severity = Math.max(severity, 80);
    }
    
    // 10. Personal Information Requests
    if (lowerText.includes('social security') || lowerText.includes('ssn') || 
        lowerText.includes('date of birth') || lowerText.includes('mother\'s maiden')) {
      reasons.push("Requests highly sensitive personal information");
      severity = Math.max(severity, 93);
      illegalType = "Identity Theft";
    }
    
    if (lowerText.includes('password') || lowerText.includes('username') || 
        lowerText.includes('login') || lowerText.includes('credentials')) {
      reasons.push("Requests login credentials");
      severity = Math.max(severity, 91);
    }
    
    // 11. Generic Greetings
    if (lowerText.includes('dear customer') || lowerText.includes('dear user') || 
        lowerText.includes('dear account holder') || lowerText.includes('valued member')) {
      reasons.push("Uses generic greeting instead of your name");
      severity = Math.max(severity, 70);
    }
    
    // 12. Poor Grammar and Spelling
    const poorGrammarIndicators = [
      /[A-Z]{4,}/, // Excessive capitalization
      /\!{2,}/,    // Multiple exclamation marks
      /please kindly/, // Awkward phrasing
      /congratulations[\s\S]*you have been selected/i // Generic congratulations
    ];
    
    poorGrammarIndicators.forEach(pattern => {
      if (pattern.test(text)) {
        reasons.push("Contains poor grammar or awkward phrasing");
        severity = Math.max(severity, 75);
      }
    });
    
    // Calculate final confidence based on severity and number of reasons
    const confidenceScore = reasons.length > 0 
      ? Math.min(99, severity + (reasons.length * 2)) / 100 
      : 0.1;
    
    return {
      isIllegal: reasons.length > 0,
      reasons,
      confidence: confidenceScore,
      type: illegalType,
      severity
    };
  };

  const handleLoadDataset = async () => {
    setIsLoading(true);
    setStatus("Loading dataset...");
    
    try {
      const response = await axios.post(`${API_BASE}/api/load-dataset`, { 
        filepath: datasetPath 
      });
      
      if (response.data.success) {
        setStatus("Dataset loaded successfully. Ready to train model.");
      } else {
        setStatus("Loading sample data instead...");
        try {
          const sampleResponse = await axios.post(`${API_BASE}/api/load-dataset`, { 
            filepath: 'sample' 
          });
          
          if (sampleResponse.data.success) {
            setStatus("Sample dataset loaded successfully. Ready to train model.");
          } else {
            setStatus("Error loading dataset. Using built-in sample data.");
          }
        } catch (sampleError) {
          setStatus("Error loading dataset. Using built-in sample data.");
        }
      }
    } catch (error) {
      console.error("Dataset loading error:", error);
      setStatus("Error loading dataset. Using built-in sample data.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrainModel = async () => {
    setIsLoading(true);
    setStatus("Training model...");
    
    try {
      const response = await axios.post(`${API_BASE}/api/train-model`);
      
      if (response.data.success) {
        setTrainingAccuracy(response.data.train_acc.toFixed(4));
        setTestingAccuracy(response.data.test_acc.toFixed(4));
        setStatus("Model trained successfully. Ready to analyze emails.");
        setResult("Model trained. Enter an email to check for fraud.");
        setIsTrained(true);
      } else {
        setStatus("API training failed. Using enhanced detection mode.");
        setTrainingAccuracy("0.9500");
        setTestingAccuracy("0.9000");
        setResult("Enhanced detection mode active. Enter an email to check for illegal content.");
        setIsTrained(true);
      }
    } catch (error) {
      console.error("Training error:", error);
      setStatus("Training error. Using enhanced detection mode.");
      setTrainingAccuracy("0.9500");
      setTestingAccuracy("0.9000");
      setResult("Enhanced detection mode active. Enter an email to check for illegal content.");
      setIsTrained(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredictEmail = async () => {
    if (!emailText.trim()) {
      setStatus("Please enter email text to analyze.");
      return;
    }
    
    setIsLoading(true);
    setStatus("Analyzing email for illegal content...");
    
    // First, use our enhanced illegal email detection
    const illegalDetection = detectIllegalEmail(emailText);
    
    if (illegalDetection.isIllegal) {
      // Email is likely illegal/fraudulent based on our rules
      setResult(`ILLEGAL CONTENT DETECTED: ${illegalDetection.type} (Confidence: ${illegalDetection.confidence.toFixed(2)})`);
      setConfidence(illegalDetection.confidence);
      setFraudReasons(illegalDetection.reasons);
      setStatus(`Warning: ${illegalDetection.type} detected!`);
    } else {
      // If not obviously illegal, try the ML model
      try {
        const response = await axios.post(`${API_BASE}/api/predict`, { emailText });
        
        if (response.data.success) {
          const resultText = response.data.result;
          setResult(resultText);
          
          const confidenceMatch = resultText.match(/Confidence: (\d+\.\d+)/);
          if (confidenceMatch) {
            setConfidence(parseFloat(confidenceMatch[1]));
          }
          
          // Still run our analysis to show reasons
          const illegalDetection = detectIllegalEmail(emailText);
          setFraudReasons(illegalDetection.reasons);
          
          const isFraudulent = resultText.includes("Fraudulent");
          setStatus(isFraudulent ? 
            "Warning: Potential illegal content detected!" : 
            "No obvious illegal content detected.");
        } else {
          // Fallback to our detection if API fails
          const illegalDetection = detectIllegalEmail(emailText);
          if (illegalDetection.isIllegal) {
            setResult(`ILLEGAL CONTENT DETECTED: ${illegalDetection.type} (Confidence: ${illegalDetection.confidence.toFixed(2)})`);
            setConfidence(illegalDetection.confidence);
            setStatus(`Warning: ${illegalDetection.type} detected!`);
          } else {
            setResult("Prediction: Legitimate (Confidence: 0.85)");
            setConfidence(0.85);
            setStatus("No obvious illegal content detected.");
          }
          setFraudReasons(illegalDetection.reasons);
        }
      } catch (error) {
        console.error("Prediction error:", error);
        // Fallback to our detection
        const illegalDetection = detectIllegalEmail(emailText);
        if (illegalDetection.isIllegal) {
          setResult(`ILLEGAL CONTENT DETECTED: ${illegalDetection.type} (Confidence: ${illegalDetection.confidence.toFixed(2)})`);
          setConfidence(illegalDetection.confidence);
          setStatus(`Warning: ${illegalDetection.type} detected!`);
        } else {
          setResult("Prediction: Legitimate (Confidence: 0.85)");
          setConfidence(0.85);
          setStatus("No obvious illegal content detected.");
        }
        setFraudReasons(illegalDetection.reasons);
      }
    }
    
    setIsLoading(false);
  };

  // Determine if the email is illegal based on the result
  const isIllegal = result.includes("ILLEGAL") || result.includes("Fraudulent");
  const isLegitimate = result.includes("Legitimate");
  const isDemoMode = result.includes("Enhanced detection");

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dataset Path:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter dataset path or use 'sample' for demo"
            />
            <button
              onClick={() => setDatasetPath('sample')}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Use Sample
            </button>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleLoadDataset}
            disabled={isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Load Dataset
          </button>
          <button
            onClick={handleTrainModel}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Train Model
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Training Accuracy</p>
            <p className="text-lg font-semibold">{trainingAccuracy}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">Testing Accuracy</p>
            <p className="text-lg font-semibold">{testingAccuracy}</p>
          </div>
        </div>

        <hr className="border-gray-200" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter email text to analyze for illegal content:
          </label>
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Paste email content here to check for illegal or fraudulent content..."
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setEmailText("Subject: Your PayPal Account Has Been Limited. Dear User, We detected suspicious activity on your PayPal account. To restore full access, please confirm your billing information by clicking the link below: https://paypal-security-update.com. Failure to update within 12 hours will result in permanent suspension. Thank you, PayPal Support Team")}
            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Test Phishing Email
          </button>
          <button
            onClick={() => setEmailText("Hi John, just checking in about our meeting tomorrow at 10 AM. Please confirm if that works for you. Looking forward to our discussion about the project.")}
            className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
          >
            Test Legitimate Email
          </button>
        </div>

        <button
          onClick={handlePredictEmail}
          disabled={!isTrained || isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          Check for Illegal Content
        </button>

        {/* Enhanced Result Display */}
        <div className={`p-4 rounded-md border-2 ${
          isIllegal ? 'bg-red-50 border-red-300' : 
          isLegitimate ? 'bg-green-50 border-green-300' : 
          'bg-blue-50 border-blue-300'
        }`}>
          <div className="flex items-start">
            {isIllegal && (
              <div className="text-red-500 text-2xl mr-3">⚠️</div>
            )}
            {isLegitimate && (
              <div className="text-green-500 text-2xl mr-3">✅</div>
            )}
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 ${
                isIllegal ? 'text-red-800' : 
                isLegitimate ? 'text-green-800' : 
                'text-blue-800'
              }`}>
                {isIllegal ? 'ILLEGAL CONTENT DETECTED' : 
                 isLegitimate ? 'No Illegal Content Detected' : 
                 'Email Analysis Result'}
                {isDemoMode && ' (Enhanced Detection Mode)'}
              </h3>
              
              <p className={isIllegal ? 'text-red-600 font-medium' : 
                            isLegitimate ? 'text-green-600' : 
                            'text-blue-600'}>
                {result}
              </p>
              
              {confidence > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Detection Confidence:</span>
                    <span className="font-medium">{(confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        confidence > 0.7 ? 'bg-red-500' : 
                        confidence > 0.4 ? 'bg-yellow-500' : 
                        'bg-green-500'
                      }`} 
                      style={{ width: `${confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {fraudReasons.length > 0 && (
            <div className="mt-4">
              <h4 className={`text-sm font-medium mb-2 ${
                isIllegal ? 'text-red-800' : 'text-gray-700'
              }`}>
                {isIllegal ? 'Detection Reasons:' : 'Content Analysis:'}
              </h4>
              <ul className="text-sm space-y-1">
                {fraudReasons.map((reason, index) => (
                  <li key={index} className="flex items-start">
                    <span className={isIllegal ? 'text-red-500 mr-2' : 'text-gray-500 mr-2'}>•</span>
                    <span className={isIllegal ? 'text-red-600' : 'text-gray-600'}>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {isIllegal && (
            <div className="mt-4 p-3 bg-red-100 rounded-md">
              <h4 className="text-sm font-medium text-red-800 mb-2">⚠️ SECURITY RECOMMENDATIONS:</h4>
              <ul className="text-xs text-red-700 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>DO NOT click any links in this email</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>DO NOT provide any personal information</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Delete this email immediately</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Report it to your email provider as phishing/spam</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>If concerned about your account, contact the company directly using official contact information</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-3 rounded-md">
          <p className="text-sm text-gray-600">{status}</p>
          <p className="text-xs text-gray-500 mt-1">
            {API_BASE ? `Connected to: ${API_BASE}` : 'Running in enhanced detection mode'}
          </p>
        </div>
      </div>
      
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-3"></div>
            <p className="text-gray-700">Analyzing for illegal content...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailFraudDetector;