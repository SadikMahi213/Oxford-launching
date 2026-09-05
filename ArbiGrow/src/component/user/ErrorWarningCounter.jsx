/**
 * Shared error-warning counter for task pages (CAPTCHA + Ad View).
 *
 * Shows "Errors: X / Y" from the REAL backend task-access response:
 * X = users.error_count, Y = configured hold_threshold.
 * Renders nothing until real data loads (never flashes a fake 0/3),
 * and nothing on API failure.
 */
export default function ErrorWarningCounter({ taskAccess }) {
  if (
    !taskAccess ||
    taskAccess.allowed === false ||
    typeof taskAccess.error_count !== "number" ||
    !(taskAccess.hold_threshold > 0)
  ) {
    return null;
  }

  const remaining = Math.max(0, taskAccess.hold_threshold - taskAccess.error_count);
  const width = Math.min(
    100,
    (taskAccess.error_count / taskAccess.hold_threshold) * 100,
  );

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>
          Errors: {taskAccess.error_count} / {taskAccess.hold_threshold}
        </span>
        <span>{remaining} more before hold</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
      {taskAccess.cycle_end && (
        <p className="text-xs text-gray-500 mt-2">
          Cycle resets: {new Date(taskAccess.cycle_end).toLocaleString()}
        </p>
      )}
    </div>
  );
}
