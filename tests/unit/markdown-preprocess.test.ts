/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { INLINE_HEADING_ANSWER } from "../fixtures/thinking-content";
import { preprocessAssistantMarkdown } from "@/lib/chat/markdown-preprocess";

describe("preprocessAssistantMarkdown", () => {
  it("breaks inline ATX headings onto new lines", () => {
    const out = preprocessAssistantMarkdown(INLINE_HEADING_ANSWER);
    expect(out).toMatch(/\n\n#\s+Definition:/);
    expect(out).toMatch(/\n\n#\s+Key Components:/);
  });

  it("normalizes hash without space", () => {
    const out = preprocessAssistantMarkdown("#Title\nBody");
    expect(out.startsWith("# Title")).toBe(true);
  });

  it("returns empty for blank input", () => {
    expect(preprocessAssistantMarkdown("   ")).toBe("");
  });

  it("normalizes standalone LaTeX equations without swallowing following prose", () => {
    const raw = `
\\text{Angle A} + \\text{Angle B} + \\text{Angle C} = 180^\\circ

- **Pythagorean Theorem**: For a right-angled triangle, the formula is:

a^2 + b^2 = c^2

where $c$ is the hypotenuse, and $a$ and $b$ are the other two sides.
`;
    const out = preprocessAssistantMarkdown(raw);
    expect(out).toContain(
      "$$\n\\text{Angle A} + \\text{Angle B} + \\text{Angle C} = 180^\\circ\n$$",
    );
    expect(out).toContain("$$\na^2 + b^2 = c^2\n$$");
    expect(out).toContain("- **Pythagorean Theorem**:");
    expect(out).not.toContain("$$\n\\text{Angle A}[\\s\\S]*where");
  });

  it("prevents greedy bracket matching across markdown paragraphs", () => {
    const raw = `
[
\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height}
]

### # Practical Examples
1. **Real-life Applications**:
Triangles are used in construction.

[
2. **Mathematical Problems**:
Finding missing sides.
]
`;
    const out = preprocessAssistantMarkdown(raw);
    expect(out).toContain(
      "$$\n\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height}\n$$",
    );
    expect(out).toContain("### Practical Examples");
    expect(out).not.toContain("$$\\n2. \\*\\*Mathematical Problems");
  });

  it("normalizes duplicate heading hashes like '### # '", () => {
    const raw = "Some text.\n\n### # Practical Examples\nDetails.";
    const out = preprocessAssistantMarkdown(raw);
    expect(out).toContain("### Practical Examples");
    expect(out).not.toContain("### #");
  });

  it("normalizes spaced bold asterisks", () => {
    const raw = "- * * Pythagorean Theorem * * : Explanation here.";
    const out = preprocessAssistantMarkdown(raw);
    expect(out).toContain("- **Pythagorean Theorem**: Explanation here.");
  });

  it("safely closes unclosed $$ during streaming", () => {
    const streamingPartial = "Here is the equation:\n$$\nE = mc^2";
    const out = preprocessAssistantMarkdown(streamingPartial);
    expect(out).toBe("Here is the equation:\n$$\nE = mc^2\n$$");
  });

  it("renders triangle explanation screenshot without any KaTeX errors or red text", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const ReactMarkdown = (await import("react-markdown")).default;
    const remarkGfm = (await import("remark-gfm")).default;
    const remarkBreaks = (await import("remark-breaks")).default;
    const remarkMath = (await import("remark-math")).default;
    const rehypeKatex = (await import("rehype-katex")).default;
    const React = (await import("react")).default;

    const raw = `Detailed Explanation of a Triangle
A triangle is a fundamental shape in geometry, consisting of three sides and three angles. The study of triangles is crucial in various fields of mathematics and has practical applications in science, engineering, and architecture.
# Definition of a Triangle
A triangle is a polygon with three vertices and three sides. The three angles formed at the vertices sum up to 180 degrees.
# Types of Triangles
Triangles can be classified based on their sides and angles. Here are the main types:
1. Equilateral Triangle
   - Definition: All three sides are equal in length, and all three angles are equal to 60 degrees.
   - Properties:
     - All sides are equal.
     - All angles are equal (60* each).
     - It has the maximum area among all triangles with a given perimeter.
     - It is a regular polygon.
2. Isosceles Triangle
   - Definition: Two sides are equal in length, and the angles opposite these sides are also equal.
   - Properties:
     - Two sides are equal.
     - Two angles are equal.
     - The third side is called the base.
     - The angle opposite the base is called the vertex angle.
3. Scalene Triangle
   - Definition: All three sides have different lengths, and all three angles are different.
   - Properties:
     - All sides are of different lengths.
     - All angles are of different measures.
     - It has the smallest area among all triangles with a given perimeter.
# Properties of a Triangle
- Sum of Angles: The sum of the interior angles of a triangle is always 180 degrees.

(\\text{Angle A} + \\text{Angle B} + \\text{Angle C} = 180^\\circ)

- * * Pythagorean Theorem * * : For a right-angled triangle (one angle is 90 degrees), the square of the length of the hypotenuse

a^2 + b^2 = c^2

where $c$ is the hypotenuse, and $a$ and $b$ are the other two sides - **Area**: The area of a triangle can be calculated using the formula:
\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height}
where the base is any one of the sides, and the height is the perpendicular distance from the opposite vertex to the base.

### # Practical Examples
1. **Real-life Applications**: - Triangles are used in construction to ensure structural stability. - In architecture, triangles are used to create stable structures and ensure aesthetic appeal. - In design, triangles are used to create balance and harmony in visual compositions.
2. **Mathematical Problems**: - Solving problems involving triangles is common in geometry and helps in understanding relationships between sides and angles. - Problems may include finding missing sides or angles, calculating areas, or proving congruence and similarity of triangles. - Practical examples include determining the height of a building, calculating the length of a river, or designing a bridge.

### # Additional Concepts
1. **Midline Theorem**: - The midline (or midsegment) of a triangle is a line segment connecting the midpoints of two sides. - The midline is parallel to the third side and half its length.
(\\text{Midline}) = \\frac{1}{2} \\times (\\text{Third Side})

2. * * Median * * : - A median of a triangle is a line segment from a vertex to the midpoint of the opposite side.`;

    const processed = preprocessAssistantMarkdown(raw);
    const html = renderToStaticMarkup(
      React.createElement(
        ReactMarkdown,
        {
          remarkPlugins: [remarkGfm, remarkBreaks, remarkMath],
          rehypePlugins: [
            [
              rehypeKatex,
              {
                throwOnError: false,
                errorColor: "inherit",
                strict: false,
                trust: true,
              },
            ],
          ],
        },
        processed,
      ),
    );

    // Absolutely NO katex-error or red error blocks
    expect(html).not.toContain("katex-error");
    expect(html).not.toContain("#cc0000");

    // All formulas converted to beautiful KaTeX math
    expect(html).toContain('class="katex"');
    expect(html).toContain("Definition of a Triangle</h1>");
    expect(html).toContain("Types of Triangles</h1>");
    expect(html).toContain("Properties of a Triangle</h1>");
    expect(html).toContain("Practical Examples</h3>");
    expect(html).toContain("<strong>Pythagorean Theorem</strong>");
  });
});
