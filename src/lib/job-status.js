export const ACTIVE_JOB_STATUSES = new Set(["open", "assigned", "in_progress"]);

export const isActiveJobStatus = (status) => ACTIVE_JOB_STATUSES.has(status);

export const isCompletedJobStatus = (status) => status === "completed";
