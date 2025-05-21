"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { HTMLAttributes} from "react";
import { LayoutDashboard } from "lucide-react"; // Removed PlusCircle

interface MainNavProps extends HTMLAttributes<HTMLElement> {}

export function MainNav({ className, ...props }: MainNavProps) {
  const pathname = usePathname();

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    // { // Removed New Workflow link
    //   href: "/workflows/new",
    //   label: "New Workflow",
    //   icon: PlusCircle,
    //   active: pathname === "/workflows/new",
    // },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 py-2 px-3 rounded-md",
            route.active
              ? "text-primary bg-primary/10"
              : "text-muted-foreground"
          )}
        >
          <route.icon className="h-4 w-4" />
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
