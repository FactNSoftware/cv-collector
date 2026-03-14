import { notFound } from "next/navigation";
import { JobDetailContent } from "../../components/JobDetailContent";
import { getJobById } from "../../../lib/jobs";

export const dynamic = "force-dynamic";

export default async function PublicJobPage(
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;
  const job = await getJobById(id);

  if (!job || !job.isPublished) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-12 sm:px-8 lg:px-12">
      <JobDetailContent job={job} />
    </main>
  );
}
