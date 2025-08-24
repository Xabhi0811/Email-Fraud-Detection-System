const express = require('express');
const cors = require('cors');
const { PythonShell } = require('python-shell');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// API endpoint to load dataset
app.post('/api/load-dataset', (req, res) => {
  const { filepath } = req.body;
  
  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: ['load', filepath]
  };

  PythonShell.run('email_fraud_detector.py', options, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, error: err.message });
    }
    
    // Process results
    const success = results && results[0] === 'success';
    res.json({ success, message: results ? results.join('\n') : '' });
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
      console.error(err);
      return res.json({ success: false, error: err.message });
    }
    
    // Process results - extract accuracy values
    if (results && results.length > 0) {
      const output = results.join('');
      const trainAccMatch = output.match(/Training Accuracy: (\d+\.\d+)/);
      const testAccMatch = output.match(/Testing Accuracy: (\d+\.\d+)/);
      
      const train_acc = trainAccMatch ? parseFloat(trainAccMatch[1]) : 0;
      const test_acc = testAccMatch ? parseFloat(testAccMatch[1]) : 0;
      
      res.json({ success: true, train_acc, test_acc, output });
    } else {
      res.json({ success: false, error: 'No results from training' });
    }
  });
});

// API endpoint to predict email
app.post('/api/predict', (req, res) => {
  const { emailText } = req.body;
  
  const options = {
    mode: 'text',
    pythonOptions: ['-u'],
    scriptPath: path.join(__dirname, 'ml'),
    args: ['predict', emailText]
  };

  PythonShell.run('email_fraud_detector.py', options, (err, results) => {
    if (err) {
      console.error(err);
      return res.json({ success: false, error: err.message });
    }
    
    res.json({ success: true, result: results ? results.join('\n') : 'No prediction result' });
  });
});

// Handle React routing, return all requests to React app
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});