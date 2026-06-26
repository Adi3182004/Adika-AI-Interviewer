import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns the list of recruiter user_ids visible to the current user (self + teammates). */
export function useTeamRecruiterIds() {
  return useQuery({
    queryKey: ["team-recruiter-ids"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as string[];
      const { data, error } = await supabase.rpc("team_recruiter_ids");
      if (error) return [u.user.id];
      const ids = (data ?? []) as string[];
      if (!ids.includes(u.user.id)) ids.push(u.user.id);
      return ids;
    },
    staleTime: 60_000,
  });
}
