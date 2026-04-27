import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SERVER_DOMAIN } from "@/lib/companyApi";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { ADVERT_LIBRARY, VIDEO_TRIGGERS, ADVERT_SETTINGS } from "@/lib/advertConfig";

interface MenuGroup {
  ID: number;
  OrderGroup: string;
  companyid: number;
  menuGroupEnabled?: string;
  MenuEnable?: string;
}

interface EditMenuGroupsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  userId: number;
  userEmail: string;
  userPassword: string;
  onNavigateToGroup?: (groupId: number, groupName: string) => void;
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
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

async function addMenuGroup(companyId: number, groupName: string, userId: number, email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/AddmenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyid: companyId,
        OrderGroup: groupName,
        UserID: userId,
        UserEmail: email,
        UserPassword: password,
      }),
    });
    const data = await res.json();
    return data.success === true || data.Success === true;
  } catch {
    return false;
  }
}

async function countGroupProducts(companyId: number, groupId: number): Promise<number> {
  try {
    const form = new URLSearchParams();
    form.append("companyid", String(companyId));
    form.append("GroupID", String(groupId));
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPread/CompanyMenu/CountMenuDetails.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const data = await res.json();
    console.log("[DeleteGroup] Count response:", data);
    const count = Number(data?.Count ?? data?.count ?? data?.total ?? -1);
    return count;
  } catch (e) {
    console.error("[DeleteGroup] Count check failed:", e);
    return -1;
  }
}

async function deleteMenuGroup(groupId: number, companyId: number, userId: number, email: string, password: string): Promise<{ success: boolean; message: string }> {
  try {
    const form = new URLSearchParams();
    form.append("ID", String(groupId));
    form.append("companyid", String(companyId));
    form.append("UserID", String(userId));
    form.append("UserEmail", email);
    form.append("UserPassword", password);
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/DeletemenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const raw = await res.text();
    console.log("[DeleteGroup] Delete raw response:", raw);
    try {
      const data = JSON.parse(raw);
      const ok = data.CanDelete === "1" || data.success === true || data.Success === true;
      return { success: ok, message: data.ServerMessage || data.Message || (ok ? "Deleted" : "Failed") };
    } catch {
      return { success: false, message: "Unexpected response: " + raw.substring(0, 100) };
    }
  } catch (e) {
    console.error("[DeleteGroup] Delete request failed:", e);
    return { success: false, message: "Network error" };
  }
}

async function updateMenuGroup(
  companyId: number,
  oldName: string,
  newName: string,
  userId: number,
  email: string,
  password: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const form = new URLSearchParams();
    form.append("UserID", String(userId));
    form.append("UserEmail", email);
    form.append("UserPassword", password);
    form.append("companyid", String(companyId));
    form.append("OrderResult", oldName);
    form.append("OrderGroupNew", newName);
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/UpdateGroupSecure.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const raw = await res.text();
    console.log("[UpdateGroup] raw response:", raw);
    try {
      const data = JSON.parse(raw);
      if (data.success) return { success: true, message: String(data.success) };
      if (data.error) return { success: false, message: String(data.error) };
      return { success: false, message: "Unexpected response" };
    } catch {
      return { success: false, message: "Unexpected response: " + raw.substring(0, 100) };
    }
  } catch (e) {
    console.error("[UpdateGroup] request failed:", e);
    return { success: false, message: "Network error" };
  }
}

async function toggleMenuGroupEnabled(groupId: number, enabled: string, companyId: number, userId: number, email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/ToggleMenuGroupEnabled.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ID: groupId,
        companyid: companyId,
        menuGroupEnabled: enabled,
        UserID: userId,
        UserEmail: email,
        UserPassword: password,
      }),
    });
    const data = await res.json();
    return data.success === true || data.Success === true;
  } catch {
    return false;
  }
}

const EditMenuGroups = ({ open, onOpenChange, companyId, userId, userEmail, userPassword, onNavigateToGroup }: EditMenuGroupsProps) => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MenuGroup | null>(null);

  // Video ad state for non-paid users after first group
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [pendingGroupName, setPendingGroupName] = useState("");
  const hasAddedFirstGroup = useRef(false);

  const isPaidUser = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (!stored) return false;
      const user = JSON.parse(stored);
      return String(user?.PaidUser) === "2";
    } catch {
      return false;
    }
  }, []);
  const fetchGroups = async () => {
    setLoading(true);
    const data = await loadMenuGroups(companyId);
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open && companyId > 0) {
      hasAddedFirstGroup.current = false;
      fetchGroups();
    }
  }, [open, companyId]);

  const actuallyAddGroup = async (name: string) => {
    setAddingGroup(true);
    const ok = await addMenuGroup(companyId, name, userId, userEmail, userPassword);
    setAddingGroup(false);
    if (ok) {
      toast.success(`"${name}" added`);
      setNewGroupName("");
      fetchGroups();
    } else {
      toast.error("Failed to add group");
    }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { toast.error("Please enter a group name"); return; }

    // Paid users always skip the ad
    if (isPaidUser()) {
      await actuallyAddGroup(name);
      return;
    }

    // If there are already groups (or one was added this session), show video ad
    const alreadyHasGroups = groups.length > 0 || hasAddedFirstGroup.current;

    if (alreadyHasGroups && ADVERT_SETTINGS.enabled && ADVERT_SETTINGS.videoAdsEnabled) {
      const advertId = VIDEO_TRIGGERS["afterFirstGroup"];
      const ad = advertId ? ADVERT_LIBRARY[advertId] : null;
      if (ad) {
        setPendingGroupName(name);
        setShowVideoAd(true);
        return;
      }
    }

    // First group (no existing groups) — add free
    hasAddedFirstGroup.current = true;
    await actuallyAddGroup(name);
  };

  const handleVideoDismissed = () => {
    setShowVideoAd(false);
    if (pendingGroupName) {
      actuallyAddGroup(pendingGroupName);
      setPendingGroupName("");
    }
  };

  const handleDelete = async (group: MenuGroup) => {
    console.log("[DeleteGroup] Starting delete for group:", group.ID, group.OrderGroup, "companyId:", companyId);

    // Step 1: Count products in this group
    const count = await countGroupProducts(companyId, group.ID);
    console.log("[DeleteGroup] Product count:", count);

    if (count !== 0) {
      setDeleteConfirm(null);
      if (count < 0) {
        toast.error("Could not verify group contents. Please try again.");
      } else {
        toast.error("Please delete all products in this group before deleting the group.");
      }
      return;
    }

    // Step 2: Count is 0, proceed with delete
    const result = await deleteMenuGroup(group.ID, companyId, userId, userEmail, userPassword);
    console.log("[DeleteGroup] Delete result:", result);
    setDeleteConfirm(null);

    if (result.success) {
      toast.success(result.message || `"${group.OrderGroup}" deleted`);
      fetchGroups();
    } else {
      toast.error(result.message || "Failed to delete group");
    }
  };

  const handleToggle = async (group: MenuGroup, enabled: boolean) => {
    const newVal = enabled ? "1" : "0";
    setGroups(prev => prev.map(g => g.ID === group.ID ? { ...g, menuGroupEnabled: newVal } : g));
    const ok = await toggleMenuGroupEnabled(group.ID, newVal, companyId, userId, userEmail, userPassword);
    if (!ok) {
      setGroups(prev => prev.map(g => g.ID === group.ID ? { ...g, menuGroupEnabled: enabled ? "0" : "1" } : g));
      toast.error("Failed to update toggle");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">Add Edit Menu Group</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(group => (
                <div
                  key={group.ID}
                  className="border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onNavigateToGroup?.(group.ID, group.OrderGroup)}
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
                    <Button variant="secondary" size="sm" onClick={() => onNavigateToGroup?.(group.ID, group.OrderGroup)}>
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

              {groups.length === 0 && !loading && (
                <p className="text-center text-muted-foreground py-4">No menu groups found</p>
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirm?.OrderGroup}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this menu group. The group must be empty (no products) before it can be deleted.
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

      {/* Video ad overlay for non-paid users */}
      <VideoAdvert
        advert={showVideoAd ? (ADVERT_LIBRARY[VIDEO_TRIGGERS["afterFirstGroup"]] ?? null) : null}
        visible={showVideoAd}
        onDismiss={handleVideoDismissed}
      />
    </>
  );
};

export default EditMenuGroups;
