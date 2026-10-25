/** Decide when a request clearly benefits from the optional two-stage flow. */
export function getThinkingNeed(query: string): string | null {
  const text = query.replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (
    /\b(?:think\s+(?:deeply|carefully)|reason\s+(?:carefully|through)|step[- ]by[- ]step|deep\s+analysis|thorough\s+analysis|comprehensive\s+analysis|rigorous\s+(?:analysis|proof)|end[- ]to[- ]end\s+(?:analysis|review))\b/i.test(
      text,
    )
  ) {
    return "You asked for a careful, multi-step analysis.";
  }

  const complexTask =
    /\b(?:analy[sz]e|audit|architect(?:ure)?|design|debug|diagnos\w*|investigat\w*|research|plan|prioriti[sz]e|trade[- ]offs?|evaluate|compare|recommend|migrat\w*|refactor|integrat\w*|review|fix|improv\w*|optimi[sz]e|implement|build|create|write|draft|generate|troubleshoot|solve|verify|test)\b/i.test(
      text,
    );
  if (!complexTask) return null;

  const crossCuttingFactors = new Set(
    text
      .match(
        /\b(?:security|privacy|cost|latency|performance|reliability|availability|maintainability|compatibility|scalability|accessibility|rollback|compliance)\b/gi,
      )
      ?.map((factor) => factor.toLowerCase()) ?? [],
  );

  const taskSignals = [
    /\b(?:multiple|several|all|each|every|across|end[- ]to[- ]end)\b/i.test(
      text,
    ),
    /\b(?:constraints?|requirements?|alternatives?|options?|trade[- ]offs?|risks?|dependencies|root cause|edge cases?)\b/i.test(
      text,
    ),
    crossCuttingFactors.size >= 2,
    /\b(?:then|while|whereas|and)\b/i.test(text),
    text.length >= 220,
  ].filter(Boolean).length;

  if (taskSignals < 2) return null;
  return "This request combines several steps or constraints.";
}
