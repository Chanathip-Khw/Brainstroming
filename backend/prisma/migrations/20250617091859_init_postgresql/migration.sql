-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CanvasElementType" AS ENUM ('TEXT', 'IMAGE', 'SHAPE', 'LINE', 'STICKY_NOTE', 'CONNECTOR', 'GROUP', 'FRAME', 'COMMENT', 'VOTE');

-- CreateEnum
CREATE TYPE "ConnectionType" AS ENUM ('LINE', 'ARROW', 'CURVED', 'ORTHOGONAL');

-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('LIKE', 'DISLIKE', 'STAR', 'PRIORITY_LOW', 'PRIORITY_MEDIUM', 'PRIORITY_HIGH');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'MOVE', 'RESIZE', 'ROTATE', 'LOCK', 'UNLOCK', 'COMMENT', 'VOTE', 'JOIN', 'LEAVE', 'WORKSPACE_CREATE', 'WORKSPACE_UPDATE', 'WORKSPACE_DELETE', 'WORKSPACE_JOIN', 'WORKSPACE_LEAVE', 'WORKSPACE_INVITE_SEND', 'WORKSPACE_INVITE_ACCEPT', 'WORKSPACE_MEMBER_UPDATE', 'WORKSPACE_MEMBER_REMOVE', 'PROJECT_CREATE', 'PROJECT_UPDATE', 'PROJECT_DELETE', 'PROJECT_SHARE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "google_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "locale" TEXT DEFAULT 'en',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_id" TEXT NOT NULL,
    "settings" JSONB,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "canvas_data" JSONB,
    "thumbnail" TEXT,
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brainstorm_sessions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "duration" INTEGER,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brainstorm_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canvas_elements" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "type" "CanvasElementType" NOT NULL,
    "content" TEXT,
    "position_x" DECIMAL(65,30) NOT NULL,
    "position_y" DECIMAL(65,30) NOT NULL,
    "width" DECIMAL(65,30),
    "height" DECIMAL(65,30),
    "rotation" DECIMAL(65,30) DEFAULT 0,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "style_data" JSONB,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canvas_elements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "element_connections" (
    "id" TEXT NOT NULL,
    "source_element_id" TEXT NOT NULL,
    "target_element_id" TEXT NOT NULL,
    "type" "ConnectionType" NOT NULL DEFAULT 'LINE',
    "style_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "element_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "element_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "VoteType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "element_categories" (
    "element_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "element_categories_pkey" PRIMARY KEY ("element_id","category_id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_google_id_idx" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_is_active_idx" ON "user_sessions"("is_active");

-- CreateIndex
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces"("owner_id");

-- CreateIndex
CREATE INDEX "workspaces_is_active_idx" ON "workspaces"("is_active");

-- CreateIndex
CREATE INDEX "workspaces_is_public_idx" ON "workspaces"("is_public");

-- CreateIndex
CREATE INDEX "workspace_members_workspace_id_idx" ON "workspace_members"("workspace_id");

-- CreateIndex
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

-- CreateIndex
CREATE INDEX "workspace_members_is_active_idx" ON "workspace_members"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invites_token_key" ON "workspace_invites"("token");

-- CreateIndex
CREATE INDEX "workspace_invites_email_idx" ON "workspace_invites"("email");

-- CreateIndex
CREATE INDEX "workspace_invites_token_idx" ON "workspace_invites"("token");

-- CreateIndex
CREATE INDEX "workspace_invites_status_idx" ON "workspace_invites"("status");

-- CreateIndex
CREATE INDEX "workspace_invites_expires_at_idx" ON "workspace_invites"("expires_at");

-- CreateIndex
CREATE INDEX "projects_workspace_id_idx" ON "projects"("workspace_id");

-- CreateIndex
CREATE INDEX "projects_created_by_idx" ON "projects"("created_by");

-- CreateIndex
CREATE INDEX "projects_is_active_idx" ON "projects"("is_active");

-- CreateIndex
CREATE INDEX "projects_is_template_idx" ON "projects"("is_template");

-- CreateIndex
CREATE INDEX "projects_is_public_idx" ON "projects"("is_public");

-- CreateIndex
CREATE INDEX "brainstorm_sessions_project_id_idx" ON "brainstorm_sessions"("project_id");

-- CreateIndex
CREATE INDEX "brainstorm_sessions_status_idx" ON "brainstorm_sessions"("status");

-- CreateIndex
CREATE INDEX "canvas_elements_project_id_idx" ON "canvas_elements"("project_id");

-- CreateIndex
CREATE INDEX "canvas_elements_created_by_idx" ON "canvas_elements"("created_by");

-- CreateIndex
CREATE INDEX "canvas_elements_type_idx" ON "canvas_elements"("type");

-- CreateIndex
CREATE INDEX "canvas_elements_z_index_idx" ON "canvas_elements"("z_index");

-- CreateIndex
CREATE INDEX "element_connections_source_element_id_idx" ON "element_connections"("source_element_id");

-- CreateIndex
CREATE INDEX "element_connections_target_element_id_idx" ON "element_connections"("target_element_id");

-- CreateIndex
CREATE INDEX "comments_element_id_idx" ON "comments"("element_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "comments_is_resolved_idx" ON "comments"("is_resolved");

-- CreateIndex
CREATE INDEX "votes_element_id_idx" ON "votes"("element_id");

-- CreateIndex
CREATE INDEX "votes_user_id_idx" ON "votes"("user_id");

-- CreateIndex
CREATE INDEX "votes_type_idx" ON "votes"("type");

-- CreateIndex
CREATE UNIQUE INDEX "votes_element_id_user_id_key" ON "votes"("element_id", "user_id");

-- CreateIndex
CREATE INDEX "categories_project_id_idx" ON "categories"("project_id");

-- CreateIndex
CREATE INDEX "element_categories_element_id_idx" ON "element_categories"("element_id");

-- CreateIndex
CREATE INDEX "element_categories_category_id_idx" ON "element_categories"("category_id");

-- CreateIndex
CREATE INDEX "activity_logs_workspace_id_idx" ON "activity_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_idx" ON "activity_logs"("entity_type");

-- CreateIndex
CREATE INDEX "activity_logs_entity_id_idx" ON "activity_logs"("entity_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brainstorm_sessions" ADD CONSTRAINT "brainstorm_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_elements" ADD CONSTRAINT "canvas_elements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canvas_elements" ADD CONSTRAINT "canvas_elements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_connections" ADD CONSTRAINT "element_connections_source_element_id_fkey" FOREIGN KEY ("source_element_id") REFERENCES "canvas_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_connections" ADD CONSTRAINT "element_connections_target_element_id_fkey" FOREIGN KEY ("target_element_id") REFERENCES "canvas_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "canvas_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "canvas_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_categories" ADD CONSTRAINT "element_categories_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "canvas_elements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "element_categories" ADD CONSTRAINT "element_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
