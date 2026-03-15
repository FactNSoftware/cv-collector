import { AdminCandidatesIndex } from "../../components/AdminCandidatesIndex";
import { buildAdminCandidateListItems } from "../../../lib/admin-list-types";
import { requireAdminPageSession } from "../../../lib/auth-guards";
import { listCandidateProfiles } from "../../../lib/candidate-profile";
import { listCvSubmissions } from "../../../lib/cv-storage";
import { DEFAULT_PAGE_SIZE, paginateItems } from "../../../lib/pagination";

export const dynamic = "force-dynamic";

export default async function AdminCandidatesPage() {
  const session = await requireAdminPageSession();
  const [profiles, submissions] = await Promise.all([
    listCandidateProfiles(),
    listCvSubmissions(),
  ]);
  const initialPage = paginateItems(
    buildAdminCandidateListItems(profiles, submissions),
    DEFAULT_PAGE_SIZE,
  );

  return (
    <AdminCandidatesIndex
      sessionEmail={session.email}
      initialCandidates={initialPage.items}
      initialPageInfo={initialPage.pageInfo}
    />
  );
}
