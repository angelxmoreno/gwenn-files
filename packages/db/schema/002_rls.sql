-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- users
-- ============================================================

-- Users are visible to other members who share at least one project with them,
-- and to themselves.
CREATE POLICY "users_visible_to_project_members" ON public.users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM public.project_members
      WHERE project_id IN (
        SELECT project_id FROM public.project_members WHERE user_id = auth.uid()
      )
    )
    OR id = auth.uid()
  );

-- Users can update their own profile only.
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- projects
-- ============================================================

-- Only project members, the owner, or admins can read a project.
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers and admins can create projects.
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- The project owner or an admin can update a project.
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only admins can delete projects.
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- project_members
-- ============================================================

-- Members of a project can see the full member list for that project.
-- Admins can see all.
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the project owner (permission = 'owner') or an admin can add members.
CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the project owner or an admin can update member permissions.
CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Project owner or admin can remove members. Members can remove themselves.
CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- invites
-- ============================================================

-- Project owners and admins can view invites for their projects.
CREATE POLICY "invites_select" ON public.invites
  FOR SELECT USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR invited_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Project owners and admins can create invites.
CREATE POLICY "invites_insert" ON public.invites
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Only the invited user (matched by email via auth) or an admin can update
-- (i.e., accept) an invite.
CREATE POLICY "invites_update" ON public.invites
  FOR UPDATE USING (
    invited_email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Project owners and admins can revoke (delete) invites.
CREATE POLICY "invites_delete" ON public.invites
  FOR DELETE USING (
    project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- tracks
-- ============================================================

-- Project members can read tracks belonging to their projects.
CREATE POLICY "tracks_select" ON public.tracks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Any project member can upload a track.
CREATE POLICY "tracks_insert" ON public.tracks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- Track uploader, project owner, or admin can update track metadata.
CREATE POLICY "tracks_update" ON public.tracks
  FOR UPDATE USING (
    uploaded_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Track uploader, project owner, or admin can delete a track.
CREATE POLICY "tracks_delete" ON public.tracks
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR project_id IN (
      SELECT project_id FROM public.project_members
      WHERE user_id = auth.uid() AND permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- comments
-- ============================================================

-- Project members can read comments on tracks within their projects.
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (
    track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Any project member can post a comment.
CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (
    track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Comment author can update their own comment.
CREATE POLICY "comments_update" ON public.comments
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Comment author, project owner, or admin can delete a comment.
CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid() AND pm.permission = 'owner'
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- notifications
-- ============================================================

-- Users can only read their own notifications.
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- The system (service role) inserts notifications; no direct user inserts.
-- No INSERT policy needed for authenticated users.

-- Users can mark their own notifications as read.
CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications.
CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- activity
-- ============================================================

-- Project members can view activity for their projects. Admins see all.
CREATE POLICY "activity_select" ON public.activity
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Activity rows are inserted by the system (service role) or authenticated
-- members performing actions within their projects.
CREATE POLICY "activity_insert" ON public.activity
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );
