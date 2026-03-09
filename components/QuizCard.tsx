import React, { useEffect, useRef, useState } from "react";
import { Question } from "../types";
import { Button } from "./Button";

interface QuizCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  onNext: (isCorrect: boolean) => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  onNext
}) => {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<
    "IDLE" | "CORRECT" | "INCORRECT" | "REVEALED"
  >("IDLE");
  const [feedback, setFeedback] = useState("");
  const [isHintVisible, setIsHintVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    setStatus("IDLE");
    setFeedback("");
    setIsHintVisible(false);

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [question.id]);

  const normalize = (str: string) =>
    str.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

  const handleCheck = () => {
    if (!input.trim()) return;

    const isMatch = normalize(input) === normalize(question.correctForm);

    if (isMatch) {
      setStatus("CORRECT");
      setFeedback("✅ Correct! Well done!");
    } else {
      setStatus("INCORRECT");
      setFeedback("❌ Not quite. Try again!");
    }
  };

  const handleFirstLetterHint = () => {
    if (!question.correctForm) return;
    setInput(question.correctForm.charAt(0));
    inputRef.current?.focus();
  };

  const handleReveal = () => {
    setStatus("REVEALED");
    setInput(question.correctForm);
    setFeedback(`答案係：${question.correctForm}`);
  };

  const handleContinue = () => {
    onNext(status === "CORRECT");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    if (status === "IDLE" || status === "INCORRECT") {
      handleCheck();
    } else {
      handleContinue();
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl">
      <div className="mb-4 text-sm font-semibold text-indigo-600">
        Question {questionIndex + 1} / {totalQuestions}
      </div>

      <div className="mb-6 text-2xl leading-relaxed text-gray-800">
        {question.sentenceBefore}{" "}
        <span className="inline-block min-w-[100px] border-b-4 border-dashed border-indigo-400 px-2 text-center font-bold text-indigo-700">
          {status === "REVEALED" || status === "CORRECT"
            ? question.correctForm
            : "_____"}
        </span>{" "}
        {question.sentenceAfter}
      </div>

      {question.translation && (
        <div className="mb-4">
          {!isHintVisible ? (
            <button
              type="button"
              onClick={() => setIsHintVisible(true)}
              className="text-sm font-bold text-indigo-500 underline decoration-dashed underline-offset-4 hover:text-indigo-700"
            >
              Need a hint?
            </button>
          ) : (
            <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              Hint: {question.translation}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status === "CORRECT" || status === "REVEALED"}
          placeholder="Type your answer here..."
          autoComplete="off"
          className={`w-full rounded-xl border-2 p-4 text-center text-xl text-gray-900 outline-none transition-colors ${
            status === "CORRECT"
              ? "border-green-400 bg-green-50 text-green-700"
              : status === "INCORRECT"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-gray-300 bg-white focus:border-indigo-400"
          }`}
        />
      </div>

      {feedback && (
        <div className="mb-4 text-center font-semibold text-gray-700">
          {feedback}
        </div>
      )}

      {(status === "IDLE" || status === "INCORRECT") && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={handleCheck}>Submit Answer</Button>
          <Button variant="outline" onClick={handleFirstLetterHint}>
            First Letter
          </Button>
          <Button variant="secondary" onClick={handleReveal}>
            Reveal Answer
          </Button>
        </div>
      )}

      {(status === "CORRECT" || status === "REVEALED") && (
        <div className="flex justify-center">
          <Button onClick={handleContinue}>Next Question ➜</Button>
        </div>
      )}
    </div>
  );
};