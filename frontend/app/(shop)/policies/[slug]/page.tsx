import PolicyPage from "@/components/policies/PolicyPage";

export default function PolicyRoute({ params }: { params: { slug: string } }) {
  return <PolicyPage slug={params.slug} />;
}