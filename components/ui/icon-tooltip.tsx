"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
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
  onPointerMove?: PointerEventHandler<HTMLElement>;
  onClick?: MouseEventHandler<HTMLElement>;
};

export function IconTooltip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  interactionActive = false,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  /** Hide the tooltip during popovers, then until the pointer exits the trigger. */
  interactionActive?: boolean;
}) {
  const [pointerInside, setPointerInside] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const interactionWasActiveRef = useRef(interactionActive);

  useEffect(() => {
    if (interactionActive) {
      setSuppressed(true);
    } else if (!interactionWasActiveRef.current && !pointerInside) {
      setSuppressed(false);
    }
    interactionWasActiveRef.current = interactionActive;
  }, [interactionActive, pointerInside]);

  const trigger = isValidElement<TooltipTriggerInteractionProps>(children)
    ? cloneElement(children, {
        onPointerEnter: (event) => {
          children.props.onPointerEnter?.(event);
          setPointerInside(true);
        },
        onPointerLeave: (event) => {
          children.props.onPointerLeave?.(event);
          setPointerInside(false);
          if (!interactionActive) setSuppressed(false);
        },
        onPointerDown: (event) => {
          children.props.onPointerDown?.(event);
          setSuppressed(true);
        },
        onPointerMove: (event) => {
          children.props.onPointerMove?.(event);
          if (!interactionActive) setSuppressed(false);
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
