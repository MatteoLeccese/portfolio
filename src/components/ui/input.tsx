import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

import { cn } from "@/lib/utils";

function Input ({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 md:h-10 w-full min-w-0 rounded-lg border border-input bg-card px-3.5 text-base md:text-sm",
        "transition-colors placeholder:text-muted-foreground",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-0",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-55",
        "aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-solid aria-invalid:outline-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
