import { redirect } from "next/navigation";

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/organisations/${id}`);
}
