import { PageHeader } from "@/components/admin/ui";
import { BranchForm } from "../BranchForm";
import { createBranch } from "../actions";

export const metadata = { title: "Nuevo local" };

export default function NewBranchPage() {
  return (
    <>
      <PageHeader
        title="Nuevo local"
        breadcrumb={{ label: "Locales", href: "/admin/sucursales" }}
      />
      <BranchForm action={createBranch} submitLabel="Crear local" />
    </>
  );
}
