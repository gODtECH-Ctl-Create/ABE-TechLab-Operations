import { describe, expect, it } from "vitest";
import { parseAriaAnswer, parseAriaBrief } from "./aria-output";

describe("ARIA structured output", () => {
  it("extracts the JSON result without exposing model reasoning", () => {
    const raw = `Here is my thinking, which must not reach the UI.\n\`\`\`json\n{"executiveSummary":"Pipeline needs attention.","urgentItems":["One overdue action"],"commercialSignals":["No invoices found"],"pendingDecisions":["Review outreach"],"recommendations":[{"title":"Review pipeline","reason":"An action is overdue"}],"dataLimitations":[]}\n\`\`\``;
    const brief = parseAriaBrief(raw);
    expect(brief.executiveSummary).toBe("Pipeline needs attention.");
    expect(JSON.stringify(brief)).not.toContain("my thinking");
  });

  it("redacts UUIDs and rejects incomplete output", () => {
    const answer = parseAriaAnswer('{"answer":"Review 53b56bb0-c658-440c-bafc-1c0f0aa7c2d1 now"}');
    expect(answer.answer).toBe("Review internal record now");
    expect(() => parseAriaBrief('{"executiveSummary":"Summary"}')).toThrow("incomplete briefing");
  });
});
