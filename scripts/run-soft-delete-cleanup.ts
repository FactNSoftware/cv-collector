import { runSoftDeleteCleanup, SOFT_DELETE_RETENTION_DAYS } from "../lib/soft-delete-cleanup";

const run = async () => {
  const result = await runSoftDeleteCleanup();

  console.info(
    `Soft-delete cleanup completed for records older than ${SOFT_DELETE_RETENTION_DAYS} days.`,
  );
  console.info(JSON.stringify(result, null, 2));
};

void run().catch((error) => {
  console.error("Soft-delete cleanup failed.", error);
  process.exitCode = 1;
});
