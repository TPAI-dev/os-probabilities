import type { ValidationIssue } from "./types.js";

export class ProbabilityValidationError extends Error {
  public readonly issues: ValidationIssue[];

  public constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "ProbabilityValidationError";
    this.issues = issues;
  }
}

export class ProbabilityRuntimeError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProbabilityRuntimeError";
  }
}
