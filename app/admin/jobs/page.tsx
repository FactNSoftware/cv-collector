import { AdminJobsIndex } from "../../components/AdminJobsIndex";
import { buildAdminJobListItems } from "../../../lib/admin-list-types";
import { requireAdminPageSession } from "../../../lib/auth-guards";
import { listJobs } from "../../../lib/jobs";
import { listCvSubmissions } from "../../../lib/cv-storage";
import { DEFAULT_PAGE_SIZE, paginateItems } from "../../../lib/pagination";

export const dynamic = "force-dynamic";

export default async function AdminJobsPage() {
  const session = await requireAdminPageSession();
  const [jobs, submissions] = await Promise.all([
    listJobs(),
    listCvSubmissions(),
  ]);
  const initialPage = paginateItems(
    buildAdminJobListItems(jobs, submissions),
    DEFAULT_PAGE_SIZE,
  );

  return (
    <AdminJobsIndex
      sessionEmail={session.email}
      initialJobs={initialPage.items}
      initialPageInfo={initialPage.pageInfo}
    />
  );
}
