import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../types';
import { Button } from './Button';

interface QuizCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onNext: (isCorrect: boolean) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({ question, questionIndex, totalQuestions, onNext }) => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'CORRECT' | 'INCORRECT' | 'REVEALED'>('IDLE');
  const [feedback, setFeedback] = useState('');
  const [isHintVisible, setIsHintVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state for new question
    setInput('');
    setStatus('IDLE');
    setFeedback('');
    setIsHintVisible(false);
    
    // Use a small timeout to ensure the DOM has updated before focusing
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [question.id]);

  const normalize = (str: string) => str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

  const handleCheck = () => {
    if (!input.trim()) return;

    const isMatch = normalize(input) === normalize(question.correctForm);
    
    if (isMatch) {
      setStatus('CORRECT');
      setFeedback('🎉 Correct! Well done!');
    } else {
      setStatus('INCORRECT');
      setFeedback('🤔 Not quite. Try again!');
    }
  };

  const handleFirstLetterHint = () => {
    if (question.correctForm.length > 0) {
      setInput(question.correctForm.charAt(0));
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleReveal = () => {
    setStatus('REVEALED');
    setInput(question.correctForm);
    setFeedback(`The answer is: ${question.correctForm}`);
  };

  const handleContinue = () => {
    onNext(status === 'CORRECT');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (status === 'IDLE' || status === 'INCORRECT') {
        handleCheck();
      } else {
        handleContinue();
      }
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl p-8 border-b-8 border-indigo-100 fade-in relative overflow-hidden">
       {/* Background decoration */}
       <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-yellow-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
       <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-pink-100 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold">
            Question {questionIndex + 1} / {totalQuestions}
          </span>
        </div>

        {/* Question Area */}
        <div className="text-xl md:text-3xl text-gray-800 font-bold leading-loose mb-8 text-center bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <span>{question.sentenceBefore}</span>
          <span className={`inline-block mx-2 px-3 border-b-4 transition-all duration-300 ${
            status === 'CORRECT' ? 'border-green-400 text-green-600' :
            status === 'REVEALED' ? 'border-amber-400 text-amber-600' :
            'border-indigo-300 text-transparent min-w-[80px]'
          }`}>
            {status === 'REVEALED' || status === 'CORRECT' ? question.correctForm : '_'}
          </span>
          <span>{question.sentenceAfter}</span>
        </div>

        {/* Hint Section */}
        {question.translation && (
           <div className="mb-6 text-center min-h-[36px] flex justify-center items-center">
             {!isHintVisible ? (
                <button 
                  onClick={() => setIsHintVisible(true)}
                  className="text-indigo-500 hover:text-indigo-700 font-bold text-sm underline decoration-dashed underline-offset-4 transition-colors"
                >
                  💡 Need a hint?
                </button>
             ) : (
                <span className="text-sm bg-amber-50 text-amber-600 px-4 py-2 rounded-lg border border-amber-100 fade-in inline-block shadow-sm">
                   💡 Hint: {question.translation}
                </span>
             )}
           </div>
        )}

        {/* Interaction Area */}
        <div className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={status === 'CORRECT' || status === 'REVEALED'}
              placeholder="Type your answer here..."
              className={`w-full text-center text-xl p-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 bg-white placeholder-gray-400
                ${status === 'CORRECT' ? 'border-green-400 bg-green-50 text-green-700' : 
                  status === 'INCORRECT' ? 'border-red-300 bg-red-50 text-red-900' : 
                  'border-gray-300 focus:border-indigo-400'}`}
              autoComplete="off"
            />
            {status === 'CORRECT' && (
               <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-500 text-xl animate-bounce">
                 ✓
               </div>
            )}
            {status === 'INCORRECT' && (
               <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 text-xl animate-pulse">
                 ✕
               </div>
            )}
          </div>

          {/* Feedback Message */}
          <div className={`h-8 text-center font-bold transition-all duration-300 ${
            status === 'CORRECT' ? 'text-green-500 scale-110' : 
            status === 'INCORRECT' ? 'text-red-500' : 
            status === 'REVEALED' ? 'text-amber-600' :
            'text-gray-500'
          }`}>
            {feedback}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-center">
             {(status === 'IDLE' || status === 'INCORRECT') && (
                <>
                  <Button onClick={handleCheck} className="flex-1">
                    Submit Answer
                  </Button>
                  <Button variant="secondary" onClick={handleFirstLetterHint} className="flex-1 sm:flex-none" title="Show First Letter">
                    🔤 Hint
                  </Button>
                  <Button variant="outline" onClick={handleReveal} className="flex-1 sm:flex-none" title="Reveal Answer">
                    👀 Answer
                  </Button>
                </>
             )}

             {(status === 'CORRECT' || status === 'REVEALED') && (
               <Button onClick={handleContinue} className="w-full animate-pulse">
                 Next Question ➔
               </Button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};