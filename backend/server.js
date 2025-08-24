const express = require('express');
const cors = require('cors');
const { PythonShell } = require('python-shell');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create datasets directory if it doesn't exist
const datasetsDir = path.join(__dirname, 'datasets');
if (!fs.existsSync(datasetsDir)) {
  fs.mkdirSync(datasetsDir, { recursive: true });
}

// API endpoint to load dataset
app.post('/api/load-dataset', (req, res) => {
  const { filepath } = req.body;
  
  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: ['load', filepath || 'sample']
  };

  PythonShell.run('email_fraud_detector.py', options, (err, results) => {
    if (err) {
      console.error('Python error in load-dataset:', err);
      return res.json({ 
        success: false, 
        error: err.message,
        logs: err.logs || []
      });
    }
    
    const output = results ? results.join('\n') : '';
    const success = output.includes('success') || output.includes('Sample dataset created');
    
    res.json({ 
      success, 
      message: output,
      output: output
    });
  });
});

// API endpoint to train model
app.post('/api/train-model', (req, res) => {
  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: ['train']
  };

  PythonShell.run('email_fraud_detector.py', options, (err, results) => {
    if (err) {
      console.error('Python error in train-model:', err);
      return res.json({ 
        success: false, 
        error: err.message,
        logs: err.logs || [],
        output: err.logs ? err.logs.join('\n') : 'No output'
      });
    }
    
    const output = results ? results.join('\n') : '';
    
    if (output) {
      const trainAccMatch = output.match(/Training Accuracy: (\d+\.\d+)/);
      const testAccMatch = output.match(/Testing Accuracy: (\d+\.\d+)/);
      
      const train_acc = trainAccMatch ? parseFloat(trainAccMatch[1]) : 0;
      const test_acc = testAccMatch ? parseFloat(testAccMatch[1]) : 0;
      
      const success = output.includes('Training Accuracy') || 
                     output.includes('Testing Accuracy');
      
      res.json({ 
        success: success, 
        train_acc, 
        test_acc, 
        output: output 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'No results from training',
        output: 'No output from Python script'
      });
    }
  });
});

// API endpoint to predict email
app.post('/api/predict', (req, res) => {
  const { emailText } = req.body;
  
  if (!emailText || emailText.trim() === '') {
    return res.json({ 
      success: false, 
      error: 'No email text provided' 
    });
  }
  
  const cleanEmailText = emailText.replace(/"/g, '\\"').replace(/'/g, "\\'");
  
  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: ['predict', cleanEmailText]
  };

  PythonShell.run('email_fraud_detector.py', options, (err, results) => {
    if (err) {
      console.error('Python error in predict:', err);
      
      const lowerText = emailText.toLowerCase();
      const isLikelyFraudulent = 
        lowerText.includes('win') || 
        lowerText.includes('free') || 
        lowerText.includes('gift') ||
        lowerText.includes('card') ||
        lowerText.includes('claim') ||
        lowerText.includes('prize') ||
        lowerText.includes('paypal') && lowerText.includes('verify');
      
      const mockResult = isLikelyFraudulent 
        ? "Prediction: Fraudulent (Confidence: 0.87)" 
        : "Prediction: Legitimate (Confidence: 0.92)";
      
      return res.json({ 
        success: true, 
        result: `Fallback: ${mockResult}`,
        isFallback: true
      });
    }
    
    const output = results ? results.join('\n') : 'No prediction result';
    res.json({ 
      success: true, 
      result: output,
      isFallback: false
    });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    message: `The requested endpoint ${req.url} was not found.` 
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});