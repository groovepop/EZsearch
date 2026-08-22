/**
 * Evaluates and scores an individual test case run
 */
export function scoreEvalCase(testCase, runResult) {
  const { toolCalls = [], reply = '', toolNames = [] } = runResult;

  if (typeof testCase.validate === 'function') {
    try {
      const evaluation = testCase.validate({
        toolCalls,
        reply,
        toolNames,
        runResult
      });

      return {
        id: testCase.id,
        section: testCase.section,
        query: testCase.query,
        expectedTools: testCase.expectedTools,
        actualTools: toolNames,
        score: evaluation.score || 'Fail',
        notes: evaluation.notes || 'Evaluation completed',
        reply: reply,
        toolDetails: toolCalls.map(t => ({
          tool: t.tool,
          args: t.args,
          found: t.result?.found,
          executionMs: t.result?.executionMs
        })),
        latencyMs: runResult.totalLatencyMs
      };
    } catch (err) {
      return {
        id: testCase.id,
        section: testCase.section,
        query: testCase.query,
        expectedTools: testCase.expectedTools,
        actualTools: toolNames,
        score: 'Fail',
        notes: 'Validation exception: ' + err.message,
        reply: reply,
        toolDetails: [],
        latencyMs: runResult.totalLatencyMs
      };
    }
  }

  return {
    id: testCase.id,
    section: testCase.section,
    query: testCase.query,
    expectedTools: testCase.expectedTools,
    actualTools: toolNames,
    score: 'Pass',
    notes: 'Tool routing matched.',
    reply,
    toolDetails: [],
    latencyMs: runResult.totalLatencyMs
  };
}