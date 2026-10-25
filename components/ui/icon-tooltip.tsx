"use client";

import {
  cloneElement,
  isValidElement,
  useState,
  type MouseEventHandler,
  type PointerEventHandler,
  type ReactNode,
} from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TooltipTriggerInteractionProps = {
  onPointerEnter?: PointerEventHandler<HTMLElement>;
  onPointerLeave?: PointerEventHandler<HTMLElement>;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function IconTooltip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  const [pointerInside, setPointerInside] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  const trigger = isValidElement<TooltipTriggerInteractionProps>(children)
    ? cloneElement(children, {
        onPointerEnter: (event) => {
          children.props.onPointerEnter?.(event);
          setPointerInside(true);
          setSuppressed(false);
        },
        onPointerLeave: (event) => {
          children.props.onPointerLeave?.(event);
          setPointerInside(false);
          setSuppressed(false);
        },
        onPointerDown: (event) => {
          children.props.onPointerDown?.(event);
          setSuppressed(true);
        },
        onClick: (event) => {
          children.props.onClick?.(event);
          if (event.detail === 0) setSuppressed(true);
        },
      })
    : children;

  return (
    <Tooltip open={pointerInside && !suppressed}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="max-w-48 whitespace-normal px-2 py-1 text-center text-[10px] font-semibold leading-snug"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
