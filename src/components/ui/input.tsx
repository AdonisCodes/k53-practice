import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-md border border-[#c5d0c2] bg-white px-3 text-sm text-[#14241c] shadow-sm placeholder:text-[#7a8b80] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#163028]",
        className,
      )}
      {...props}
    />
  );
}
