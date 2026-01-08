import React, { useState, useRef } from 'react';
import { generateQuiz, extractWordsFromImage } from './services/geminiService';
import { Difficulty, Question } from './types';
import { Button } from './components/Button';
import { QuizCard } from './components/QuizCard';
import { ProgressBar } from './components/ProgressBar';

enum AppStep {
  SETUP,
  LOADING,
  QUIZ,
  RESULT
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [wordsInput, setWordsInput] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.PRIMARY_UPPER);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Image Upload State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedWords, setExtractedWords] = useState<string[]>([]);
  const [showWordSelector, setShowWordSelector] = useState(false);
  const [selectedExtractedWords, setSelectedExtractedWords] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if there is a quiz in progress
  const hasActiveQuiz = questions.length > 0 && currentIndex < questions.length;

  const handleStart = async () => {
    const words = wordsInput
      .split(/[\n,;]+/) // Split by newline, comma, or semicolon
      .map(w => w.trim())
      .filter(w => w.length > 0);

    if (words.length === 0) {
      setError("Please enter at least one word.");
      return;
    }

    setError(null);
    setStep(AppStep.LOADING);

    try {
      const generatedQuestions = await generateQuiz(words, difficulty);
      setQuestions(generatedQuestions);
      setCurrentIndex(0);
      setScore(0);
      setStep(AppStep.QUIZ);
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz.");
      setStep(AppStep.SETUP);
    }
  };

  const handleNextQuestion = (wasCorrect: boolean) => {
    if (wasCorrect) setScore(s => s + 1);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setStep(AppStep.RESULT);
    }
  };

  // Completely resets the app
  const handleReset = () => {
    setStep(AppStep.SETUP);
    setWordsInput('');
    setQuestions([]);
    setScore(0);
    setError(null);
    setCurrentIndex(0);
  };

  // Goes to menu but KEEPS progress
  const handleGoHome = () => {
    setStep(AppStep.SETUP);
  };

  // Resumes the paused quiz
  const handleResume = () => {
    setStep(AppStep.QUIZ);
  };

  const handleRetrySameWords = () => {
    setCurrentIndex(0);
    setScore(0);
    setStep(AppStep.QUIZ);
  };

  // Image Upload Logic
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        
        const words = await extractWordsFromImage(base64Data);
        setExtractedWords(words);
        setSelectedExtractedWords(new Set(words)); // Select all by default
        setShowWordSelector(true);
      } catch (err: any) {
        setError("Failed to analyze image. Please try again.");
      } finally {
        setIsAnalyzing(false);
        // Clear input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleWordSelection = (word: string) => {
    const newSelection = new Set(selectedExtractedWords);
    if (newSelection.has(word)) {
      newSelection.delete(word);
    } else {
      newSelection.add(word);
    }
    setSelectedExtractedWords(newSelection);
  };

  const confirmSelectedWords = () => {
    const newWords = Array.from(selectedExtractedWords).join(', ');
    setWordsInput(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${newWords}` : newWords;
    });
    setShowWordSelector(false);
    setExtractedWords([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 font-sans text-gray-800">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="relative text-center mb-10">
          {step !== AppStep.SETUP && (
            <button 
              onClick={handleGoHome}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-white/80 rounded-full hover:bg-white text-indigo-600 transition-all shadow-sm border border-indigo-100"
              title="Back to Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          )}

          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-600 tracking-tight mb-2 drop-shadow-sm">
            Smart Vocab Master
          </h1>
          <p className="text-lg text-gray-600 font-medium">
            AI-Powered Practice for Super Kids 🚀
          </p>
        </header>

        {/* SETUP SCREEN */}
        {step === AppStep.SETUP && (
          <div className="space-y-6 fade-in">
            
            {/* Resume Banner */}
            {hasActiveQuiz && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-amber-800">
                  <p className="font-bold text-lg">⚠️ Quiz in Progress!</p>
                  <p className="text-sm">You are at Question {currentIndex + 1} of {questions.length}.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                   <Button onClick={handleResume} variant="secondary" className="flex-1 sm:flex-none text-sm">
                     ▶ Resume
                   </Button>
                   <Button onClick={handleReset} variant="outline" className="flex-1 sm:flex-none text-sm border-amber-200 text-amber-700 hover:bg-amber-100">
                     ✕ Discard
                   </Button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl p-8 border-b-8 border-indigo-200 relative">
              <h2 className="text-2xl font-bold mb-6 text-gray-700 flex items-center gap-2">
                <span className="text-3xl">📝</span> Create New Quiz
              </h2>
              
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <div>
                     <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">
                       Vocabulary List
                     </label>
                     <p className="text-xs text-gray-400">Enter words manually or upload a photo.</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    <Button 
                      type="button" 
                      variant="secondary" 
                      onClick={handleImageUploadClick}
                      isLoading={isAnalyzing}
                      className="py-2 px-4 text-sm"
                    >
                      📷 Scan from Image
                    </Button>
                  </div>
                </div>

                <textarea 
                  className="w-full h-40 p-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all text-lg resize-none bg-white text-gray-900 placeholder-gray-400"
                  placeholder="e.g. apple, running, beautiful, 快樂, 學校"
                  value={wordsInput}
                  onChange={(e) => setWordsInput(e.target.value)}
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Select Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(Difficulty).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`p-3 rounded-lg border-2 text-left transition-all font-semibold ${
                        difficulty === level 
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md transform scale-102' 
                          : 'border-gray-200 hover:border-indigo-300 text-gray-600'
                      }`}
                    >
                     {level}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                  <p className="font-bold">Error</p>
                  <p>{error}</p>
                </div>
              )}

              <Button onClick={handleStart} className="w-full text-lg shadow-lg">
                Generate Questions ✨
              </Button>

              {/* Word Selection Modal Overlay */}
              {showWordSelector && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
                    <h3 className="text-xl font-bold mb-4 text-gray-800">Select Words to Add</h3>
                    <p className="text-sm text-gray-500 mb-4">We found {extractedWords.length} words. Tap to select/deselect.</p>
                    
                    <div className="flex-1 overflow-y-auto mb-6 p-2 border border-gray-100 rounded-xl bg-gray-50">
                      <div className="flex flex-wrap gap-2">
                        {extractedWords.map((word, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleWordSelection(word)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              selectedExtractedWords.has(word)
                                ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {word} {selectedExtractedWords.has(word) && '✓'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowWordSelector(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={confirmSelectedWords} className="flex-1">
                        Add {selectedExtractedWords.size} Words
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOADING SCREEN */}
        {step === AppStep.LOADING && (
          <div className="text-center py-20 fade-in">
            <div className="inline-block relative">
              <div className="animate-spin rounded-full h-24 w-24 border-b-4 border-indigo-600"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl">
                🤖
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mt-8">Generating Magic Quiz...</h3>
            <p className="text-gray-500 mt-2">Writing sentences and shuffling cards</p>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {step === AppStep.QUIZ && questions.length > 0 && (
          <div className="flex flex-col items-center w-full">
            <div className="w-full max-w-2xl mb-2 flex justify-between text-sm font-bold text-gray-500 px-2">
               <span>Level: {difficulty}</span>
               <span>Score: {score}</span>
            </div>
            <div className="w-full max-w-2xl">
               <ProgressBar current={currentIndex} total={questions.length} />
            </div>
            
            <QuizCard 
              question={questions[currentIndex]}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
              onNext={handleNextQuestion}
            />
          </div>
        )}

        {/* RESULT SCREEN */}
        {step === AppStep.RESULT && (
          <div className="bg-white rounded-3xl shadow-xl p-10 text-center border-b-8 border-indigo-200 fade-in max-w-2xl mx-auto">
             <div className="text-6xl mb-6">
               {score === questions.length ? '🏆' : score > questions.length / 2 ? '🌟' : '📚'}
             </div>
             <h2 className="text-3xl font-extrabold text-indigo-800 mb-2">Quiz Completed!</h2>
             <p className="text-gray-500 mb-8">You practiced {questions.length} words.</p>

             <div className="bg-indigo-50 rounded-2xl p-6 mb-8 inline-block min-w-[200px]">
               <span className="block text-gray-500 text-sm font-bold uppercase tracking-wider">Your Score</span>
               <span className="text-5xl font-black text-indigo-600">{score} / {questions.length}</span>
             </div>

             <div className="flex flex-col gap-4">
                <Button onClick={handleRetrySameWords} variant="secondary" className="w-full justify-center">
                   🔄 Retry Same Questions
                </Button>
                <Button onClick={handleReset} variant="outline" className="w-full justify-center">
                   ✏️ Create New Quiz
                </Button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default App;