import { describe, expect, it } from "vitest";
import { isActiveJobStatus, isCompletedJobStatus } from "./job-status";

describe("job status helpers", () => {
  it("treats active statuses as active", () => {
    expect(isActiveJobStatus("open")).toBe(true);
    expect(isActiveJobStatus("assigned")).toBe(true);
    expect(isActiveJobStatus("in_progress")).toBe(true);
    expect(isActiveJobStatus("completed")).toBe(false);
  });

  it("treats completed status as completed", () => {
    expect(isCompletedJobStatus("completed")).toBe(true);
    expect(isCompletedJobStatus("open")).toBe(false);
    expect(isCompletedJobStatus("in_progress")).toBe(false);
  });
});
