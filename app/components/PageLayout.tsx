import { cn } from "~/lib/utils";

type PageLayoutProps = {
  children: React.ReactNode;
  variant?: "main" | "auth";
  className?: string;
};

export default function PageLayout({
  children,
  variant = "main",
  className,
}: PageLayoutProps) {
  return (
    <main
      className={cn(
        "bg-cover",
        variant === "auth"
          ? "bg-[url('/images/bg-auth.svg')]"
          : "bg-[url('/images/bg-main.svg')]",
        className,
      )}
    >
      {children}
    </main>
  );
}
