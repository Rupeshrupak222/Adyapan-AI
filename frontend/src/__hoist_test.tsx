"use client";

import { useCallback, useState } from "react";

function useEngine({ onSubmitAnswer }: { onSubmitAnswer: (t: string) => void }) {
  const [state] = useState(0);
  return { state, speak: (t: string) => console.log(t, onSubmitAnswer) };
}

export function Test() {
  const [messages, setMessages] = useState<string[]>([]);

  async function handleAnswerSubmit(transcript: string) {
    setMessages((p) => [...p, transcript]);
    engine.speak(transcript);
  }

  const engine = useEngine({ onSubmitAnswer: handleAnswerSubmit });

  const handleReplay = useCallback(() => {
    engine.speak(messages[messages.length - 1] || "hi");
  }, [messages, engine]);

  return <button onClick={() => handleReplay()}>x</button>;
}
