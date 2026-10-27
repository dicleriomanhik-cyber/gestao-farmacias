/*
  Warnings:

  - The `status` column on the `sync_clients` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `appVersion` to the `sync_operations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SyncClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "sync_clients" DROP COLUMN "status",
ADD COLUMN     "status" "SyncClientStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "sync_operations" ADD COLUMN     "appVersion" TEXT NOT NULL;
