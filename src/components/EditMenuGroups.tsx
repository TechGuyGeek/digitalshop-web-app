import { useEffect, useState } from "react";
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

interface MenuGroup {
  ID: number;
  OrderGroup: string;
  companyid: number;
  menuGroupEnabled?: string;
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

async function deleteMenuGroup(groupId: number, companyId: number, userId: number, email: string, password: string): Promise<boolean> {
  try {
    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/DeletemenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ID: groupId,
        companyid: companyId,
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

  const fetchGroups = async () => {
    setLoading(true);
    const data = await loadMenuGroups(companyId);
    setGroups(data);
    setLoading(false);
  };

  useEffect(() => {
    if (open && companyId > 0) {
      fetchGroups();
    }
  }, [open, companyId]);

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) { toast.error("Please enter a group name"); return; }
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

  const handleDelete = async (group: MenuGroup) => {
    const ok = await deleteMenuGroup(group.ID, companyId, userId, userEmail, userPassword);
    setDeleteConfirm(null);
    if (ok) {
      toast.success(`"${group.OrderGroup}" deleted`);
      fetchGroups();
    } else {
      toast.error("Failed to delete group");
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">The Item is Enabled</span>
                    <Switch
                      checked={group.menuGroupEnabled === "1"}
                      onCheckedChange={(v) => handleToggle(group, v)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => toast.info("Add items coming soon")}>
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
    </>
  );
};

export default EditMenuGroups;
