import sys
import pandas as pd
import numpy as np
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
import warnings
warnings.filterwarnings('ignore')

class EmailFraudDetector:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
        self.model = LogisticRegression(random_state=42, max_iter=1000)
        self.is_trained = False
        self.df = None  # Initialize df as None
        
    def load_data(self, filepath):
        """Load dataset from CSV file"""
        try:
            # Try to read the CSV file
            self.df = pd.read_csv(filepath)
            print(f"Dataset loaded with {len(self.df)} emails")
            
            # Check if the dataset has the required columns
            if 'text' not in self.df.columns or 'label' not in self.df.columns:
                # Try to find similar column names
                text_col = None
                label_col = None
                
                for col in self.df.columns:
                    if 'text' in col.lower() or 'content' in col.lower() or 'message' in col.lower():
                        text_col = col
                    if 'label' in col.lower() or 'target' in col.lower() or 'spam' in col.lower() or 'fraud' in col.lower():
                        label_col = col
                
                if text_col and label_col:
                    # Rename columns to standard names
                    self.df = self.df.rename(columns={text_col: 'text', label_col: 'label'})
                    print(f"Renamed columns: '{text_col}' -> 'text', '{label_col}' -> 'label'")
                else:
                    print("Error: Dataset must contain 'text' and 'label' columns")
                    return False
            
            return True
        except Exception as e:
            print(f"Error loading dataset: {e}")
            # Create a sample dataset for demonstration
            print("Creating a sample dataset for demonstration...")
            self.create_sample_data()
            return True
    
    def create_sample_data(self):
        """Create sample data if no dataset is available"""
        sample_emails = [
            "Congratulations! You've won a $1000 gift card. Click here to claim your prize now!",
            "Your account has been compromised. Please verify your identity by providing your login details.",
            "Hi John, just checking in about our meeting tomorrow at 10 AM. Please confirm if that works for you.",
            "URGENT: Your bank account has been suspended. Please update your information immediately to avoid closure.",
            "Hi mom, can you send me the recipe for your famous chocolate cake? Thanks!",
            "You've been selected for a limited-time offer! Get a free iPhone just by completing our survey.",
            "Meeting reminder: Project review today at 3 PM in conference room B.",
            "Your package delivery failed. Please confirm your shipping address to reschedule delivery.",
            "Hi team, don't forget about the company picnic this Saturday. Looking forward to seeing everyone there!",
            "Your Netflix account has been put on hold. Please update your payment information to continue service.",
            "FREE offer! Claim your $500 Walmart gift card today only! Click now!",
            "Important: Your Amazon account has been locked. Verify your information to restore access.",
            "Hi David, could you please send me the quarterly reports when you get a chance?",
            "Warning: Your social security number has been compromised. Contact us immediately.",
            "You have inherited $1,000,000 from a distant relative. Provide your bank details to claim.",
            "Reminder: Dentist appointment tomorrow at 3 PM. Please arrive 10 minutes early.",
            "Your PayPal account has unusual activity. Confirm your identity to secure your account.",
            "Hi Sarah, looking forward to our lunch meeting next Tuesday at 12:30.",
            "You've been pre-approved for a $50,000 loan with 0% interest. Apply now!",
            "Your Microsoft Windows license is about to expire. Renew now to avoid disruption."
        ]
        
        sample_labels = [1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1]  # 1 = fraudulent, 0 = legitimate
        
        self.df = pd.DataFrame({
            'text': sample_emails,
            'label': sample_labels
        })
        
        print("Sample dataset created for demonstration purposes.")
    
    def preprocess_text(self, text):
        """Clean and preprocess text with more fraud-specific features"""
        if isinstance(text, float):
            return ""
        
        # Convert to lowercase
        text = text.lower()
        
        # Keep some special characters that are important for fraud detection
        # Preserve URLs, dollar signs, and percentages
        text = re.sub(r'http\S+', ' URL ', text)  # Replace URLs with placeholder
        text = re.sub(r'www\.\S+', ' URL ', text)  # Replace www URLs
        text = re.sub(r'\$\d+', ' MONEY ', text)  # Replace dollar amounts
        text = re.sub(r'\d+%', ' PERCENT ', text)  # Replace percentages
        
        # Remove other special characters but keep words intact
        text = re.sub(r'[^a-zA-Z\s]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
    
    def prepare_data(self):
        """Prepare the data for training"""
        if self.df is None:
            print("Error: No data loaded. Please load data first.")
            return False
            
        # Preprocess the text
        self.df['cleaned_text'] = self.df['text'].apply(self.preprocess_text)
        
        # Split the data
        X = self.df['cleaned_text']
        y = self.df['label']
        
        self.X_train, self.X_test, self.y_train, self.y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        return True
    
    def train_model(self):
        """Train the fraud detection model"""
        if self.df is None:
            print("Error: No data loaded. Please load data first.")
            return 0, 0
            
        # Create TF-IDF features
        print("Creating features...")
        self.X_train_tfidf = self.vectorizer.fit_transform(self.X_train)
        self.X_test_tfidf = self.vectorizer.transform(self.X_test)
        
        # Train the model
        print("Training model...")
        self.model.fit(self.X_train_tfidf, self.y_train)
        
        # Evaluate the model
        train_preds = self.model.predict(self.X_train_tfidf)
        test_preds = self.model.predict(self.X_test_tfidf)
        
        train_acc = accuracy_score(self.y_train, train_preds)
        test_acc = accuracy_score(self.y_test, test_preds)
        
        print(f"Training Accuracy: {train_acc:.4f}")
        print(f"Testing Accuracy: {test_acc:.4f}")
        print("\nClassification Report:")
        print(classification_report(self.y_test, test_preds))
        
        self.is_trained = True
        return train_acc, test_acc
    
    def predict_email(self, email_text):
        """Predict if an email is fraudulent"""
        if not self.is_trained:
            return "Model not trained yet. Please train the model first.", 0.5
        
        # Preprocess the email text
        cleaned_text = self.preprocess_text(email_text)
        
        # Transform using the trained vectorizer
        email_tfidf = self.vectorizer.transform([cleaned_text])
        
        # Make prediction
        prediction = self.model.predict(email_tfidf)
        probability = self.model.predict_proba(email_tfidf)
        
        result = "Fraudulent" if prediction[0] == 1 else "Legitimate"
        confidence = probability[0][prediction[0]]
        
        return result, confidence

    def run_command(self, args):
        if len(args) == 0:
            print("No command provided. Use 'load', 'train', or 'predict'.")
            return
            
        if args[0] == 'load':
            if len(args) < 2:
                print("Please provide a filepath for loading data.")
                return
                
            filepath = args[1]
            print(f"Trying to load from: {filepath}")
            
            # Check if file exists
            if not os.path.exists(filepath):
                print(f"File not found: {filepath}")
                # Try to find it in the datasets folder
                datasets_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'datasets', os.path.basename(filepath))
                print(f"Trying datasets folder: {datasets_path}")
                
                if os.path.exists(datasets_path):
                    filepath = datasets_path
                    print(f"Found file in datasets: {filepath}")
                else:
                    print("File not found anywhere, using sample data")
                    filepath = None
            
            if filepath:
                success = self.load_data(filepath)
            else:
                success = self.load_data(None)  # This will create sample data
                
            print('success' if success else 'error')
            
        elif args[0] == 'train':
            # First try to load data if not already loaded
            if self.df is None:
                print("No data loaded. Loading sample data...")
                self.load_data(None)  # This will create sample data
                
            if self.prepare_data():
                train_acc, test_acc = self.train_model()
                print(f'Training Accuracy: {train_acc:.4f}')
                print(f'Testing Accuracy: {test_acc:.4f}')
            else:
                print("error: Failed to prepare data")
                
        elif args[0] == 'predict':
            if len(args) < 2:
                print("Please provide email text for prediction.")
                return
                
            # First try to load and train if not already done
            if not self.is_trained:
                print("Model not trained. Loading sample data and training...")
                if self.df is None:
                    self.load_data(None)
                if self.prepare_data():
                    self.train_model()
            
            if self.is_trained:
                result, confidence = self.predict_email(' '.join(args[1:]))
                print(f"Prediction: {result} (Confidence: {confidence:.4f})")
            else:
                print("error: Model could not be trained")

if __name__ == "__main__":
    detector = EmailFraudDetector()
    
    if len(sys.argv) > 1:
        detector.run_command(sys.argv[1:])