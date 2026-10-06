UPDATE "MentorshipResource" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "MentorshipResource" ALTER COLUMN "tags" SET NOT NULL;
