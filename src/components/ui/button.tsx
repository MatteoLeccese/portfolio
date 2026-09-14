// src/components/ui/button.tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-lg border border-transparent bg-clip-padding",
    "font-medium whitespace-nowrap select-none",
    "transition-[color,background-color,border-color,box-shadow,translate]",
    "duration-fast ease-standard",
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:opacity-55 disabled:saturate-50",
    "data-[loading=true]:pointer-events-none data-[loading=true]:cursor-progress",
    "aria-invalid:border-destructive aria-invalid:outline-2 aria-invalid:outline-solid aria-invalid:outline-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-elevation-1",
          "hover:bg-primary-hover active:bg-primary-active active:translate-y-px",
        ],
        outline: [
          "border-input bg-card text-foreground",
          "hover:bg-muted active:bg-secondary active:translate-y-px",
        ],
        ghost: "text-foreground hover:bg-muted active:bg-secondary",
        subtle: "bg-accent text-accent-foreground hover:bg-accent-hover",
        link: "h-auto p-0 text-primary underline-offset-4 decoration-primary/40 hover:underline",
        destructive: [
          "border-destructive/25 bg-destructive/10 text-destructive",
          "hover:bg-destructive/15 focus-visible:outline-destructive",
        ],
      },
      size: {
        default: "h-11 gap-2 px-5 text-sm md:h-10 md:px-4",
        sm: "h-10 gap-1.5 px-3.5 text-meta md:h-9 md:px-3",
        lg: "h-12 gap-2.5 px-6 text-base md:h-11",
        icon: "size-11 md:size-10",
        "icon-sm": "size-10 md:size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button ({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
