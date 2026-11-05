ALTER TABLE "users" ADD COLUMN "accessType" TEXT NOT NULL DEFAULT 'ADMIN';
UPDATE "users" SET "accessType" = 'COLLABORATOR' WHERE id IN (SELECT ur."userId" FROM "user_roles" ur JOIN "roles" r ON r.id = ur."roleId" WHERE r.name = 'COLLABORATOR');
DROP INDEX IF EXISTS "users_email_key";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
CREATE UNIQUE INDEX "users_email_accessType_key" ON "users"("email", "accessType");
