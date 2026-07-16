import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../(auth)/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the workspaces the user is a member of
  const { data: memberships, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name)")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching workspace membership:", error);
  }

  const primaryMembership = memberships?.[0];
  // Typecast or retrieve workspace safely
  const activeWorkspace = primaryMembership?.workspaces as unknown as {
    id: string;
    name: string;
  } | null;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border-custom bg-surface flex flex-col fixed h-full">
        {/* Logo / Workspace Info */}
        <div className="h-16 px-6 border-b border-border-custom flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="font-bold text-foreground tracking-tight">DocuMind</span>
          </div>
          <span className="text-[10px] text-muted-text font-medium truncate mt-0.5">
            {activeWorkspace ? activeWorkspace.name : "Personal Workspace"}
          </span>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-primary/5 text-primary border border-primary/10 transition-all"
          >
            Dashboard
          </Link>
          <div className="text-xs font-semibold text-muted-text/50 uppercase tracking-wider px-3 pt-4 pb-1">
            Features
          </div>
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-foreground hover:bg-zinc-50 rounded-lg transition-all"
          >
            Documents
          </Link>
          <Link
            href="/dashboard/chat"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-foreground hover:bg-zinc-50 rounded-lg transition-all"
          >
            Chat Base
          </Link>
          <Link
            href="/dashboard/usage"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-foreground hover:bg-zinc-50 rounded-lg transition-all"
          >
            Usage Analytics
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-foreground hover:bg-zinc-50 rounded-lg transition-all"
          >
            Settings
          </Link>
        </nav>

        {/* User Info / Sign Out */}
        <div className="p-4 border-t border-border-custom bg-background/50">
          <div className="flex flex-col gap-2">
            <div className="px-2 truncate">
              <p className="text-xs font-semibold text-foreground truncate">
                {user.email}
              </p>
              <p className="text-[10px] text-muted-text capitalize">
                Role: {primaryMembership?.role || "Member"}
              </p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="w-full text-center px-3 py-2 text-xs font-medium text-error hover:bg-error/5 border border-transparent hover:border-error/10 rounded-lg transition-all cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="pl-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 border-b border-border-custom bg-surface flex items-center justify-between px-8 sticky top-0 z-10">
          <h2 className="font-semibold text-foreground text-sm tracking-tight">
            Dashboard Overview
          </h2>
          <div className="text-xs text-muted-text font-medium bg-background border border-border-custom px-3 py-1 rounded-full">
            UTC System Time
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 bg-background max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
