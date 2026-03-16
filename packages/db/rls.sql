-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Users can see other users in projects they share
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

-- Users can update their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

-- Projects: only members can see
CREATE POLICY "project_members_only" ON public.projects
  FOR SELECT USING (
    id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects: managers and admins can insert
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Projects: owner or admin can update
CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Projects: admin can delete
CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Project members: members can see their project's members
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Tracks: only accessible within your projects
CREATE POLICY "track_access" ON public.tracks
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Tracks: project members can insert
CREATE POLICY "track_insert" ON public.tracks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

-- Tracks: owner or admin can delete
CREATE POLICY "track_delete" ON public.tracks
  FOR DELETE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.users u ON u.id = auth.uid()
      WHERE p.id = project_id AND (p.owner_id = auth.uid() OR u.role = 'admin')
    )
  );

-- Comments: same as tracks
CREATE POLICY "comment_access" ON public.comments
  FOR SELECT USING (
    track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Comments: project members can insert
CREATE POLICY "comment_insert" ON public.comments
  FOR INSERT WITH CHECK (
    track_id IN (
      SELECT t.id FROM public.tracks t
      JOIN public.project_members pm ON pm.project_id = t.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- Comments: own or admin can delete
CREATE POLICY "comment_delete" ON public.comments
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Notifications: own only
CREATE POLICY "own_notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Activity: project members can see
CREATE POLICY "activity_select" ON public.activity
  FOR SELECT USING (
    project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
