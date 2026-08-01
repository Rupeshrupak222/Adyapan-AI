"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { LearningSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { api } from "@/services/api";

export default function SettingsLearningPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading, settings } = useSettingsData();

  const [language, setLanguage] = useState("en");
  const [learningStyle, setLearningStyle] = useState("visual");
  const [dailyGoal, setDailyGoal] = useState(3);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [noteFormat, setNoteFormat] = useState("markdown");
  const [quizDifficulty, setQuizDifficulty] = useState("medium");
  const [tutorPersonality, setTutorPersonality] = useState("friendly");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setLanguage(settings.language || "en");
    setLearningStyle(settings.learningStyle || "visual");
    setDailyGoal(settings.dailyGoal || 3);
    setReminderTime(settings.reminderTime || "09:00");
    setDifficulty(settings.difficulty || "intermediate");
    setNoteFormat(settings.noteFormat || "markdown");
    setQuizDifficulty(settings.quizDifficulty || "medium");
    setTutorPersonality(settings.tutorPersonality || "friendly");
    setHydrated(true);
  }, [hydrated, loading, settings]);

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/learning", {
        language, learningStyle, dailyGoal, reminderTime, difficulty, noteFormat, quizDifficulty, tutorPersonality,
      });
      setHasChanges(false);
      toast.success("Learning preferences saved!");
    } catch { toast.error("Failed to save learning preferences."); }
    finally { setSaving(false); }
  };

  return (
    <SettingsShell
      title="Learning Preferences"
      subtitle="Personalize your study experience and goals."
      icon={BookOpen}
      loading={loading}
      hasChanges={hasChanges}
      onSave={handleSave}
      saving={saving}
    >
      <LearningSection
        c={c}
        language={language}
        setLanguage={setLanguage}
        learningStyle={learningStyle}
        setLearningStyle={setLearningStyle}
        dailyGoal={dailyGoal}
        setDailyGoal={setDailyGoal}
        reminderTime={reminderTime}
        setReminderTime={setReminderTime}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        noteFormat={noteFormat}
        setNoteFormat={setNoteFormat}
        quizDifficulty={quizDifficulty}
        setQuizDifficulty={setQuizDifficulty}
        tutorPersonality={tutorPersonality}
        setTutorPersonality={setTutorPersonality}
        markChanged={markChanged}
        onSave={handleSave}
        saving={saving}
      />
    </SettingsShell>
  );
}
