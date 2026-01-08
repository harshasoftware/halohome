import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { badgeVariants } from "./badge-variants";

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
