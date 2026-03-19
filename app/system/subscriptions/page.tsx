import { SystemSubscriptionsPortal } from "../../components/SystemSubscriptionsPortal";
import { requireSuperAdminPageSession } from "../../../lib/auth-guards";
import {
  listFeatureCatalogSummary,
  listOrganizationSubscriptionAssignmentDetails,
  listSubscriptions,
} from "../../../lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function SystemSubscriptionsPage() {
  const session = await requireSuperAdminPageSession();
  const [{ assignable, upcoming }, subscriptions, assignments] = await Promise.all([
    Promise.resolve(listFeatureCatalogSummary()),
    listSubscriptions(),
    listOrganizationSubscriptionAssignmentDetails(),
  ]);

  return (
    <SystemSubscriptionsPortal
      sessionEmail={session.email}
      initialSubscriptions={subscriptions}
      initialAssignments={assignments}
      assignableFeatures={assignable}
      upcomingFeatures={upcoming}
    />
  );
}
