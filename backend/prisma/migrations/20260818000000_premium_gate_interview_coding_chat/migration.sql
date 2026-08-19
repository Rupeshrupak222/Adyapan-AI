-- Premium-gate enforcement for Interview Hub, Coding Hub, and Ady Chat
-- Changes existing features from free to premium, adds new feature rows

-- 1. Upgrade existing features to premium
UPDATE feature_access SET "requiredPlan" = 'premium' WHERE "featureKey" = 'coding-assistant';
UPDATE feature_access SET "requiredPlan" = 'premium' WHERE "featureKey" = 'reasoning';
UPDATE feature_access SET "requiredPlan" = 'premium' WHERE "featureKey" = 'mock-interview';
UPDATE feature_access SET "requiredPlan" = 'premium' WHERE "featureKey" = 'ady-chat';

-- 2. Add new Interview Hub features
INSERT INTO feature_access ("id", "featureKey", "name", "description", "category", "requiredPlan", "routePattern", "gated", "updatedAt")
VALUES
  (gen_random_uuid(), 'engine', 'Interview Engine', 'AI interview session management', 'Interview Hub', 'premium', '^/engine(/|$)', true, NOW()),
  (gen_random_uuid(), 'hr-interview', 'HR Interview', 'HR behavioural interview practice', 'Interview Hub', 'premium', '^/interview/hr(/|$)', true, NOW())
ON CONFLICT ("featureKey") DO UPDATE
  SET "requiredPlan" = EXCLUDED."requiredPlan",
      "routePattern" = EXCLUDED."routePattern",
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "category" = EXCLUDED."category",
      "gated" = EXCLUDED."gated",
      "updatedAt" = NOW();

-- 3. Add new Coding Hub features
INSERT INTO feature_access ("id", "featureKey", "name", "description", "category", "requiredPlan", "routePattern", "gated", "updatedAt")
VALUES
  (gen_random_uuid(), 'dsa', 'DSA Practice', 'Data structures & algorithms practice', 'Coding Hub', 'premium', '^/dsa(/|$)', true, NOW()),
  (gen_random_uuid(), 'challenges', 'Coding Challenges', 'Competitive coding challenges', 'Coding Hub', 'premium', '^/challenges(/|$)', true, NOW())
ON CONFLICT ("featureKey") DO UPDATE
  SET "requiredPlan" = EXCLUDED."requiredPlan",
      "routePattern" = EXCLUDED."routePattern",
      "name" = EXCLUDED."name",
      "description" = EXCLUDED."description",
      "category" = EXCLUDED."category",
      "gated" = EXCLUDED."gated",
      "updatedAt" = NOW();
