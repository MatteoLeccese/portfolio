import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  [
    "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-full border px-2.5 py-0.5 text-meta font-medium",
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2",
    "[&_svg]:pointer-events-none [&_svg]:size-3.5",
  ],
  {
    variants: {
      variant: {
        hairline: "border-hairline bg-transparent font-mono text-muted-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        outline: "border-input bg-transparent text-foreground",
        destructive: "border-destructive/25 bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: { variant: "hairline" },
  },
);

function Badge ({
  className,
  variant = "hairline",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      { className: cn(badgeVariants({ variant }), className) },
      props,
    ),
    render,
    state: { slot: "badge", variant },
  });
}

export { Badge, badgeVariants };
