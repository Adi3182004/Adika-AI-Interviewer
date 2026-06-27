import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

export function NotificationBell({ tone = "default" }: { tone?: "default" | "gold" }) {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase
        .from("notifications")
        .select("id,kind,title,body,link,read_at,created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () =>
        qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const unread = data.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() })
      .eq("user_id", u.user.id).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  const accent = tone === "gold" ? "bg-gold text-background" : "bg-primary text-primary-foreground";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className={`absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full px-1 text-[10px] font-medium ${accent}`}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {data.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${!n.read_at ? "bg-accent/30" : ""}`}>
                  {n.link ? (
                    <Link to={n.link} className="block hover:opacity-80">
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    </Link>
                  ) : (
                    <>
                      <p className="font-medium">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    </>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
