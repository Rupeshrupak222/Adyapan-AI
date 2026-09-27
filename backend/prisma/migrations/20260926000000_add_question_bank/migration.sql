-- CreateTable
CREATE TABLE "question_bank" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "template_fingerprint" TEXT NOT NULL,
    "concept_signature" TEXT,
    "source" TEXT NOT NULL,
    "topic" TEXT,
    "category" TEXT,
    "company" TEXT,
    "difficulty" TEXT,
    "question_text" TEXT NOT NULL,
    "options_json" JSONB,
    "correct_idx" INTEGER,
    "test_id" TEXT,
    "position" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcq_tests" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_name" TEXT NOT NULL,
    "test_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "question_count" INTEGER NOT NULL DEFAULT 0,
    "duration_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcq_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mcq_questions" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "technology" TEXT NOT NULL,
    "company" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "code_snippet" TEXT,
    "language" TEXT,
    "options_json" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL DEFAULT '',
    "correct_idx" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL DEFAULT '',
    "hint" TEXT NOT NULL DEFAULT '',
    "related_concept" TEXT NOT NULL DEFAULT '',
    "estimated_time" TEXT NOT NULL DEFAULT '45 sec',
    "interview_tip" TEXT,
    "option_explanations" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcq_questions_pkey" PRIMARY KEY ("id")
);

-- The two UNIQUE constraints below are the actual guarantee that a question
-- concept can exist only once in the entire database. Application code cannot
-- bypass them, and the value-change case ("60% for 3h" vs "75% for 5h") is
-- caught by template_fingerprint because digits are masked before hashing.
CREATE UNIQUE INDEX "question_bank_fingerprint_key" ON "question_bank"("fingerprint");
CREATE UNIQUE INDEX "question_bank_template_fingerprint_key" ON "question_bank"("template_fingerprint");
CREATE INDEX "question_bank_source_topic_idx" ON "question_bank"("source", "topic");
CREATE INDEX "question_bank_source_company_idx" ON "question_bank"("source", "company");
CREATE INDEX "question_bank_source_category_idx" ON "question_bank"("source", "category");
CREATE INDEX "question_bank_test_id_idx" ON "question_bank"("test_id");

CREATE UNIQUE INDEX "mcq_tests_target_id_test_number_key" ON "mcq_tests"("target_id", "test_number");
CREATE INDEX "mcq_tests_target_id_idx" ON "mcq_tests"("target_id");
CREATE INDEX "mcq_questions_test_id_position_idx" ON "mcq_questions"("test_id", "position");

-- AddColumn
ALTER TABLE "user_question_history" ADD COLUMN "concept_signature" TEXT;

-- AddForeignKey
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "mcq_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
