import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#e4eadc] text-[#163028]",
        outline: "border-[#c5d0c2] text-[#3d5247]",
        ai: "border-transparent bg-[#14241c] text-[#f3e27a]",
        gold: "border-transparent bg-[#f3e7c0] text-[#6b5310]",
        red: "border-transparent bg-[#f8d4d2] text-[#8a1f1a]",
        green: "border-transparent bg-[#cfe8d4] text-[#0d5c32]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
