import { useNavigate, useSearchParams } from "react-router-dom";
import EditMenuGroupsDialog from "@/components/EditMenuGroups";

export default function EditMenuGroupsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const companyId = Number(params.get("companyId") || 0);
  return <EditMenuGroupsDialog open onOpenChange={(open) => { if (!open) navigate(-1); }} companyId={companyId}
    onNavigateToGroup={(id, name) => navigate(`/group-products?groupId=${id}&companyId=${companyId}&groupName=${encodeURIComponent(name)}`)} />;
}
