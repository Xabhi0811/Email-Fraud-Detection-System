import React from 'react';
import EmailFraudDetector from './components/EmailFraudDetector';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-800 mb-2">
            Email Fraud Detection System
          </h1>
          <p className="text-lg text-gray-600">
            Detect fraudulent emails using machine learning
          </p>
        </header>
        
        <EmailFraudDetector />
      </div>
    </div>
  );
}

export default App;