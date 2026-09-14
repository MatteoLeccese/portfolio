import type * as React from "react";

import { cn } from "@/lib/utils";

function Textarea ({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-32 w-full resize-y rounded-lg border border-input bg-card px-3.5 py-3 text-base md:text-sm",
        "transition-colors placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-0",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-55",
        "aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-solid aria-invalid:outline-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
