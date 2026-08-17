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
import { createMenuGroup, deleteMenuGroup, listMenuGroups, updateMenuGroup, asLegacyGroup } from "@/lib/menuApi";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { ADVERT_LIBRARY, VIDEO_TRIGGERS, ADVERT_SETTINGS } from "@/lib/advertConfig";
import MenuGroupImagePicker from "@/components/MenuGroupImagePicker";
import { fetchMenuGroupImages, type MenuGroupImageMap } from "@/lib/menuGroupImages";

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
  onNavigateToGroup?: (groupId: number, groupName: string) => void;
}

const EditMenuGroups = ({ open, onOpenChange, companyId, onNavigateToGroup }: EditMenuGroupsProps) => {
  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MenuGroup | null>(null);
  const [editGroup, setEditGroup] = useState<MenuGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [groupImages, setGroupImages] = useState<MenuGroupImageMap>({});
  const [imageGroup, setImageGroup] = useState<MenuGroup | null>(null);

  // Video ad state for non-paid users after first group
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [pendingGroupName, setPendingGroupName] = useState("");
  const hasAddedFirstGroup = useRef(false);

  const isPaidUser = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem("digitalUser");
      if (!stored) return false;
      const user = JSON.parse(stored);
      return String(user?.PaidUser ?? user?.Paiduser) === "2";
    } catch {
      return false;
    }
  }, []);
  const fetchGroups = async () => {
    setLoading(true);
    const data = await listMenuGroups();
    setGroups(data.map(asLegacyGroup));
    setGroupImages(await fetchMenuGroupImages(companyId));
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
    let ok = false;
    try { await createMenuGroup(name); ok = true; } catch {}
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

    let result: { success: boolean; message: string } = { success: false, message: "Delete failed" };
    try { await deleteMenuGroup(group.ID); result = { success: true, message: "Deleted" }; } catch (e: any) { result.message = e?.message || "Delete failed"; }
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
    try { await updateMenuGroup(group.ID, { enabled }); } catch {
      setGroups(prev => prev.map(g => g.ID === group.ID ? { ...g, menuGroupEnabled: enabled ? "0" : "1" } : g));
      toast.error("Failed to update toggle");
    }
  };

  const openEdit = (group: MenuGroup) => {
    setEditGroup(group);
    setEditName(group.OrderGroup);
  };

  const handleSaveEdit = async () => {
    if (!editGroup) return;
    const newName = editName.trim();
    if (!newName) { toast.error("Please enter a group name"); return; }
    if (newName === editGroup.OrderGroup) { setEditGroup(null); return; }
    setSavingEdit(true);
    let result: { success: boolean; message: string } = { success: false, message: "Update failed" };
    try { await updateMenuGroup(editGroup.ID, { name: newName }); result = { success: true, message: "Updated" }; } catch (e: any) { result.message = e?.message || "Update failed"; }
    setSavingEdit(false);
    if (result.success) {
      toast.success(result.message || "Group updated");
      setEditGroup(null);
      fetchGroups();
    } else {
      toast.error(result.message || "Failed to update group");
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
                    <Button variant="secondary" size="sm" onClick={() => openEdit(group)}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setImageGroup(group)}>
                      Image
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

      <MenuGroupImagePicker open={!!imageGroup} onOpenChange={(open) => !open && setImageGroup(null)}
        companyId={companyId} groupId={imageGroup?.ID || 0} groupName={imageGroup?.OrderGroup || ""}
        current={imageGroup ? groupImages[String(imageGroup.ID)] : null}
        auth={{ userId: 0, email: "", password: "" }}
        onSaved={(meta) => { if (imageGroup) setGroupImages((prev) => ({ ...prev, [String(imageGroup.ID)]: meta })); }} />

      {/* Video ad overlay for non-paid users */}
      <VideoAdvert
        advert={showVideoAd ? (ADVERT_LIBRARY[VIDEO_TRIGGERS["afterFirstGroup"]] ?? null) : null}
        visible={showVideoAd}
        onDismiss={handleVideoDismissed}
      />

      {/* Edit group dialog */}
      <Dialog open={!!editGroup} onOpenChange={(o) => { if (!o && !savingEdit) setEditGroup(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">Edit Menu Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Group name"
              className="text-center"
              disabled={savingEdit}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setEditGroup(null)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditMenuGroups;
