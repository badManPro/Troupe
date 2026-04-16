import * as React from "react";
import { cn } from "@/lib/utils";

interface WindowHeaderProps extends React.HTMLAttributes<HTMLElement> {
  containerClassName?: string;
}

export function WindowHeader({
  className,
  containerClassName,
  children,
  ...props
}: WindowHeaderProps) {
  return (
    <header className={cn("window-header", className)} {...props}>
      <div
        aria-hidden="true"
        data-tauri-drag-region
        className="window-header-drag-region"
      />
      <div className={cn("window-header-inner", containerClassName)}>
        {children}
      </div>
    </header>
  );
}
