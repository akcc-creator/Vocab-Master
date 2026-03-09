import React, { useRef, useState } from "react";
import { generateQuiz, extractWordsFromImage } from "./services/geminiService";
import { Difficulty, Question } from "./types";
import { Button } from "./components/Button";
import { QuizCard } from "./components/QuizCard";
import { ProgressBar } from "./components/ProgressBar";

enum AppStep {
  SETUP,
  LOADING,
  QUIZ,
  RESULT
}

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [wordsInput, setWordsInput] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    Difficulty.PRIMARY_UPPER
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [extractedWords, setExtractedWords] = useState<string[]>([]);
  const [showWordSelector, setShowWordSelector] = useState<boolean>(false);
  const [selectedExtractedWords, setSelectedExtractedWords] = useState<
    Set<string>
  >(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasActiveQuiz = questions.length > 0 && currentIndex < questions.length;

  const handleStart = async () => {
    const words = wordsInput
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      setError("請至少輸入一個詞語。");
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
      setError(err?.message || "Failed to generate quiz.");
      setStep(AppStep.SETUP);
    }
  };

  const handleNextQuestion = (wasCorrect: boolean) => {
    if (wasCorrect) {
      setScore((prev) => prev + 1);
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep(AppStep.RESULT);
    }
  };

  const handleReset = () => {
    setStep(AppStep.SETUP);
    setWordsInput("");
    setQuestions([]);
    setScore(0);
    setError(null);
    setCurrentIndex(0);
    setExtractedWords([]);
    setShowWordSelector(false);
    setSelectedExtractedWords(new Set());
  };

  const handleGoHome = () => {
    setStep(AppStep.SETUP);
  };

  const handleResume = () => {
    setStep(AppStep.QUIZ);
  };

  const handleRetrySameWords = () => {
    setCurrentIndex(0);
    setScore(0);
    setStep(AppStep.QUIZ);
  };

  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1];
        const words = await extractWordsFromImage(base64Data);

        setExtractedWords(words);
        setSelectedExtractedWords(new Set(words));
        setShowWordSelector(true);
      } catch (err: any) {
        setError(err?.message || "Failed to analyze image.");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
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
    const newWords = Array.from(selectedExtractedWords).join(", ");

    setWordsInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}, ${newWords}` : newWords;
    });

    setShowWordSelector(false);
    setExtractedWords([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50 text-gray-800">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {step !== AppStep.SETUP && (
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" onClick={handleGoHome}>
              ⬅ Home
            </Button>
            <div className="text-right">
              <div className="text-2xl font-black text-indigo-700">
                Smart Vocab Master
              </div>
              <div className="text-sm text-gray-500">
                AI-Powered Practice for Super Kids
              </div>
            </div>
          </div>
        )}

        {step === AppStep.SETUP && (
          <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-black text-indigo-700">
                Smart Vocab Master
              </h1>
              <p className="mt-2 text-gray-500">
                AI-Powered Practice for Super Kids
              </p>
            </div>

            {hasActiveQuiz && (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-1 font-bold text-amber-800">
                  ⚠️ Quiz in Progress!
                </div>
                <div className="mb-3 text-sm text-amber-700">
                  You are at Question {currentIndex + 1} of {questions.length}.
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleResume}>▶ Resume</Button>
                  <Button variant="danger" onClick={handleReset}>
                    ✕ Discard
                  </Button>
                </div>
              </div>
            )}

            <h2 className="mb-4 text-2xl font-bold text-gray-800">
              Create New Quiz
            </h2>

            <div className="mb-6">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-gray-700">
                Vocabulary List
              </label>
              <p className="mb-3 text-sm text-gray-500">
                Enter words manually or upload a photo.
              </p>

              <textarea
                value={wordsInput}
                onChange={(e) => setWordsInput(e.target.value)}
                rows={6}
                className="w-full rounded-2xl border-2 border-gray-200 p-4 text-gray-800 outline-none focus:border-indigo-400"
                placeholder="apple, run, beautiful&#10;或者輸入中文詞語都得"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleImageUploadClick}
                  isLoading={isAnalyzing}
                >
                  {isAnalyzing ? "Analyzing..." : "Scan from Image"}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="mb-8">
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide text-gray-700">
                Select Level
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Object.values(Difficulty).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`rounded-xl border-2 p-3 text-left font-semibold transition-all ${
                      difficulty === level
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md"
                        : "border-gray-200 text-gray-600 hover:border-indigo-300"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded border-l-4 border-red-500 bg-red-100 p-4 text-red-700">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}

            <Button onClick={handleStart} className="w-full text-lg shadow-lg">
              Generate Questions ✨
            </Button>
          </div>
        )}

        {step === AppStep.LOADING && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
            <div className="mb-4 text-3xl">✨</div>
            <h2 className="mb-2 text-2xl font-bold text-indigo-700">
              Generating your quiz...
            </h2>
            <p className="text-gray-500">Please wait a moment.</p>
          </div>
        )}

        {step === AppStep.QUIZ && questions[currentIndex] && (
          <div className="space-y-6">
            <ProgressBar current={currentIndex + 1} total={questions.length} />
            <QuizCard
              question={questions[currentIndex]}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
              onNext={handleNextQuestion}
            />
          </div>
        )}

        {step === AppStep.RESULT && (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
            <div className="mb-4 text-5xl">🏆</div>
            <h2 className="mb-3 text-3xl font-black text-indigo-700">
              Quiz Complete!
            </h2>
            <p className="mb-6 text-xl text-gray-700">
              Your score:{" "}
              <span className="font-bold text-indigo-700">
                {score} / {questions.length}
              </span>
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={handleRetrySameWords}>Try Again</Button>
              <Button variant="outline" onClick={handleReset}>
                Create New Quiz
              </Button>
            </div>
          </div>
        )}
      </div>

      {showWordSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-xl font-bold text-gray-800">
              Select Words to Add
            </h3>
            <p className="mb-4 text-sm text-gray-500">
              We found {extractedWords.length} words.
            </p>

            <div className="mb-4 flex-1 overflow-y-auto rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap gap-2">
                {extractedWords.map((word) => {
                  const selected = selectedExtractedWords.has(word);
                  return (
                    <button
                      key={word}
                      onClick={() => toggleWordSelection(word)}
                      className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                        selected
                          ? "border-indigo-500 bg-indigo-100 text-indigo-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      {word}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowWordSelector(false)}
              >
                Cancel
              </Button>
              <Button onClick={confirmSelectedWords}>Add Selected</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;