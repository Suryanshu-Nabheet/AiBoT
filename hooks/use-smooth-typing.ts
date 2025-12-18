import { useState, useEffect, useRef } from "react";

export function useSmoothTyping(
  targetText: string,
  charsPerFrame = 3,
  shouldAnimate = true
) {
  const [displayedText, setDisplayedText] = useState(
    shouldAnimate ? "" : targetText
  );
  const indexRef = useRef(0);
  const rafRef = useRef<number | undefined>(undefined);
  const prevShouldAnimate = useRef(shouldAnimate);

  useEffect(() => {
    // Immediate update if animation disabled
    if (!shouldAnimate) {
      setDisplayedText(targetText);
      indexRef.current = targetText.length;
      return;
    }

    // Reset if text changed dramatically (new message)
    if (targetText.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayedText("");
    }

    const animate = () => {
      if (indexRef.current < targetText.length) {
        // Advance by multiple characters per frame for speed while maintaining smoothness
        indexRef.current = Math.min(
          indexRef.current + charsPerFrame,
          targetText.length
        );
        setDisplayedText(targetText.substring(0, indexRef.current));
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetText, charsPerFrame, shouldAnimate]);

  return displayedText;
}
