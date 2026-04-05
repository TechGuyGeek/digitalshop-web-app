import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SERVER_DOMAIN } from "@/lib/companyApi";

interface MenuGroup {
  ID: number;
  OrderGroup: string;
  companyid: number;
  menuGroupEnabled?: string;
  MenuEnable?: string;
}

async function loadMenuGroups(companyId: number): Promise<MenuGroup[]> {
  try {
    const form = new URLSearchParams();
    form.append("companyID", String(companyId));
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/SelectmenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function addMenuGroup(companyId: number, groupName: string, userId: number, email: string, password: string): Promise<{ success: boolean; message?: string }> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/AddGroupSecure.php";
  const form = new URLSearchParams();
  form.append("UserID", String(userId));
  form.append("UserEmail", email);
  form.append("UserPassword", password);
  form.append("OrderGroup", groupName);
  form.append("companyID", String(companyId));

  console.log("[addMenuGroup] URL:", url);
  console.log("[addMenuGroup] Content-Type: application/x-www-form-urlencoded");
  console.log("[addMenuGroup] Fields:", { UserID: userId, UserEmail: email, OrderGroup: groupName, companyID: companyId });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    console.log("[addMenuGroup] HTTP status:", res.status);
    const text = await res.text();
    console.log("[addMenuGroup] Raw response:", text);

    try {
      const data = JSON.parse(text);
      const msg = data.ServerMessage || data.serverMessage || "";
      if (msg.toLowerCase().includes("added") || data.success === true || data.Success === true) {
        return { success: true, message: msg };
      }
      return { success: false, message: msg || "Unknown error" };
    } catch {
      // Non-JSON response — treat as failure
      return { success: false, message: text || "Invalid response" };
    }
  } catch (err) {
    console.error("[addMenuGroup] FETCH FAILED (CORS or network):", err);
    return { success: false, message: "Network error — the server may not allow this request" };
  }
}

async function deleteMenuGroup(groupId: number, companyId: number, userId: number, email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/DeletemenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID: groupId, companyid: companyId, UserID: userId, UserEmail: email, UserPassword: password }),
    });
    const data = await res.json();
    return data.success === true || data.Success === true;
  } catch {
    return false;
  }
}

async function toggleMenuGroupEnabled(groupId: number, enabled: string, companyId: number, userId: number, email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/ToggleMenuGroupEnabled.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ID: groupId, companyid: companyId, menuGroupEnabled: enabled, UserID: userId, UserEmail: email, UserPassword: password }),
    });
    const data = await res.json();
    return data.success === true || data.Success === true;
  } catch {
    return false;
  }
}

const EditMenuGroupsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = Number(searchParams.get("companyId") || "0");

  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MenuGroup | null>(null);

  // Get user auth from localStorage
  const getAuth = () => {
    const stored = localStorage.getItem("digitalUser");
    if (!stored) return null;
    const u = JSON.parse(stored);
    return {
      userId: Number(u.PersonID || u.ID || 0),
      email: (u.Email || u.email || "") as string,
      password: (u.Password || u.password || u.Token || "") as string,
    };
  };

  const fetchGroups = async () => {
    setLoading(true);
    const data = await loadMenuGroups(companyId);
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    if (companyId > 0) fetchGroups();
    else setLoading(false);
  }, [companyId]);

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { toast.error("Please enter a group name"); return; }
    const auth = getAuth();
    if (!auth || !auth.userId) {
      toast.error("User session not found. Please log in again.");
      return;
    }
    console.log("[handleAddGroup] companyId:", companyId, "UserID:", auth.userId, "UserEmail:", auth.email, "OrderGroup:", name);
    setAddingGroup(true);
    const result = await addMenuGroup(companyId, name, auth.userId, auth.email, auth.password);
    setAddingGroup(false);
    if (result.success) {
      toast.success(`"${name}" added`);
      setNewGroupName("");
      console.log("[handleAddGroup] Save succeeded, reloading groups...");
      await fetchGroups();
      console.log("[handleAddGroup] Groups reloaded");
    } else {
      toast.error(result.message || "Failed to add group");
    }
  };

  const handleDelete = async (group: MenuGroup) => {
    const auth = getAuth();
    if (!auth) return;
    const ok = await deleteMenuGroup(group.ID, companyId, auth.userId, auth.email, auth.password);
    setDeleteConfirm(null);
    if (ok) {
      toast.success(`"${group.OrderGroup}" deleted`);
      fetchGroups();
    } else {
      toast.error("Failed to delete group");
    }
  };

  const handleToggle = async (group: MenuGroup, enabled: boolean) => {
    const auth = getAuth();
    if (!auth) return;
    const newVal = enabled ? "1" : "0";
    setGroups(prev => prev.map(g => g.ID === group.ID ? { ...g, menuGroupEnabled: newVal, MenuEnable: newVal } : g));
    const ok = await toggleMenuGroupEnabled(group.ID, newVal, companyId, auth.userId, auth.email, auth.password);
    if (!ok) {
      setGroups(prev => prev.map(g => g.ID === group.ID ? { ...g, menuGroupEnabled: enabled ? "0" : "1", MenuEnable: enabled ? "0" : "1" } : g));
      toast.error("Failed to update toggle");
    }
  };

  const navigateToGroup = (groupId: number, groupName: string) => {
    navigate(`/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/company-profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">
          Add Edit Menu Group
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {groups.map(group => (
              <div
                key={group.ID}
                className="border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors bg-card"
                onClick={() => navigateToGroup(group.ID, group.OrderGroup)}
              >
                <h3 className="text-center text-lg font-bold text-foreground">{group.OrderGroup}</h3>
                <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <span className="text-sm text-muted-foreground">The Item is Enabled</span>
                  <Switch
                    checked={(group.MenuEnable || group.menuGroupEnabled) === "1"}
                    onCheckedChange={(v) => handleToggle(group, v)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2" onClick={e => e.stopPropagation()}>
                  <Button variant="secondary" size="sm" onClick={() => navigateToGroup(group.ID, group.OrderGroup)}>
                    Add
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toast.info("Edit group coming soon")}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(group)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {groups.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No menu groups found</p>
            )}

            {/* Add new group */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground text-center">Add New Group</h4>
              <Input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g. Food, Drinks, Desserts"
                className="text-center"
              />
              <Button className="w-full" onClick={handleAddGroup} disabled={addingGroup}>
                {addingGroup ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                Add Group
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirm?.OrderGroup}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this menu group and all its items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditMenuGroupsPage;
