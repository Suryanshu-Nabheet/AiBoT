/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { cn } from "@/lib/utils";
import { isMonochromeBrandIcon } from "@/lib/brand-icons";

type BrandIconProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
};

/**
 * Provider/model logo. Monochrome SVGs invert in dark mode so they stay visible
 * on black backgrounds; colorful logos are left unchanged.
 */
export function BrandIcon({
  src,
  className,
  alt = "",
  onError,
  ...props
}: BrandIconProps) {
  const mono = isMonochromeBrandIcon(src);

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "object-contain",
        mono && "dark:invert dark:brightness-110",
        className,
      )}
      onError={(e) => {
        if (onError) {
          onError(e);
          return;
        }
        e.currentTarget.src = "/icons/ai.svg";
      }}
      {...props}
    />
  );
}
