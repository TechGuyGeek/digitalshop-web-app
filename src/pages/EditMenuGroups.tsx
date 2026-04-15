import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import VideoAdvert from "@/components/adverts/VideoAdvert";
import { ADVERT_LIBRARY, ADVERT_SETTINGS, VIDEO_TRIGGERS } from "@/lib/advertConfig";
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

async function addMenuGroup(
  companyId: number,
  groupName: string,
  userId: number,
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/AddGroupSecure.php";
  const form = new URLSearchParams();
  form.append("UserID", String(userId));
  form.append("UserEmail", email);
  form.append("UserPassword", password);
  form.append("OrderGroup", groupName);
  form.append("companyID", String(companyId));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text();

    try {
      const data = JSON.parse(text);
      const msg = data.ServerMessage || data.serverMessage || "";
      if (msg.toLowerCase().includes("added") || data.success === true || data.Success === true) {
        return { success: true, message: msg };
      }
      return { success: false, message: msg || "Unknown error" };
    } catch {
      return { success: false, message: text || "Invalid response" };
    }
  } catch {
    return { success: false, message: "Network error" };
  }
}

async function deleteMenuGroup(
  groupId: number,
  companyId: number,
  userId: number,
  email: string,
  password: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const form = new URLSearchParams();
    form.append("ID", String(groupId));
    form.append("companyid", String(companyId));
    form.append("UserID", String(userId));
    form.append("UserEmail", email);
    form.append("UserPassword", password);

    console.log("[DeleteGroup] Sending form body:", form.toString());

    const res = await fetch(SERVER_DOMAIN + "menu1/PHPwrite/CompanyMenu/DeletemenuGroup.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    const text = await res.text();
    console.log("[DeleteGroup] Raw response:", text);

    try {
      const data = JSON.parse(text);
      const canDelete = data.CanDelete === "1" || data.CanDelete === 1;
      const success = canDelete || data.success === true || data.Success === true || data.Result === true;
      return { success, message: data.ServerMessage || data.Message || "" };
    } catch {
      const lower = text.toLowerCase();
      if (lower.includes("deleted") || lower === "true") return { success: true };
      return { success: false, message: text };
    }
  } catch (err) {
    console.error("[DeleteGroup] Network error:", err);
    return { success: false, message: "Network error" };
  }
}

async function toggleMenuGroupEnabled(
  groupId: number,
  enabled: string,
  companyId: number,
  userId: number,
  email: string,
  password: string
): Promise<boolean> {
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

const EditMenuGroupsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const companyId = Number(searchParams.get("companyId") || "0");

  const [groups, setGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<MenuGroup | null>(null);
  const [showVideoAd, setShowVideoAd] = useState(false);
  const [pendingGroupName, setPendingGroupName] = useState("");

  const getStoredUser = () => {
    try {
      const stored = localStorage.getItem("digitalUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const getAuth = () => {
    const u = getStoredUser();
    if (!u) return null;
    return {
      userId: Number(u.PersonID || u.ID || 0),
      email: (u.Email || u.email || "") as string,
      password: (u.Password || u.password || u.Token || "") as string,
    };
  };

  const isPaidUser = () => {
    const u = getStoredUser();
    return String(u?.PaidUser) === "2";
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

  const actuallyAddGroup = async (name: string) => {
    const auth = getAuth();
    if (!auth || !auth.userId) {
      toast.error(t("Therewasanerror"));
      return;
    }

    setAddingGroup(true);
    const result = await addMenuGroup(companyId, name, auth.userId, auth.email, auth.password);
    setAddingGroup(false);

    if (result.success) {
      toast.success(t("SaveSuccessful"));
      setNewGroupName("");
      await fetchGroups();
    } else {
      toast.error(result.message || t("SaveFailed"));
    }
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      toast.error(t("GroupName"));
      return;
    }

    if (isPaidUser()) {
      await actuallyAddGroup(name);
      return;
    }

    const advertId = VIDEO_TRIGGERS.afterFirstGroup;
    const advert = advertId ? ADVERT_LIBRARY[advertId] : null;
    const needsAdvert = groups.length > 0 && ADVERT_SETTINGS.enabled && ADVERT_SETTINGS.videoAdsEnabled;

    if (needsAdvert && advert?.type === "video") {
      setPendingGroupName(name);
      setShowVideoAd(true);
      return;
    }

    await actuallyAddGroup(name);
  };

  const handleVideoComplete = async () => {
    const name = pendingGroupName;
    setShowVideoAd(false);
    setPendingGroupName("");
    if (name) {
      await actuallyAddGroup(name);
    }
  };

  const handleDelete = async (group: MenuGroup) => {
    const auth = getAuth();
    if (!auth) return;
    const ok = await deleteMenuGroup(group.ID, companyId, auth.userId, auth.email, auth.password);
    setDeleteConfirm(null);
    if (ok) {
      toast.success(t("Delete"));
      fetchGroups();
    } else {
      toast.error(t("Wasnotdeleted"));
    }
  };

  const handleToggle = async (group: MenuGroup, enabled: boolean) => {
    const auth = getAuth();
    if (!auth) return;
    const newVal = enabled ? "1" : "0";
    setGroups((prev) =>
      prev.map((g) => (g.ID === group.ID ? { ...g, menuGroupEnabled: newVal, MenuEnable: newVal } : g))
    );
    const ok = await toggleMenuGroupEnabled(group.ID, newVal, companyId, auth.userId, auth.email, auth.password);
    if (!ok) {
      setGroups((prev) =>
        prev.map((g) =>
          g.ID === group.ID ? { ...g, menuGroupEnabled: enabled ? "0" : "1", MenuEnable: enabled ? "0" : "1" } : g
        )
      );
      toast.error(t("SaveFailed"));
    }
  };

  const navigateToGroup = (groupId: number, groupName: string) => {
    navigate(`/group-products?groupId=${groupId}&companyId=${companyId}&groupName=${encodeURIComponent(groupName)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/company-profile")}>
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-lg font-bold text-foreground flex-1 text-center pr-10">{t("CompanyMenuGroupPageTitle")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div
                key={group.ID}
                className="border border-border rounded-lg p-4 space-y-3 cursor-pointer hover:border-primary/50 transition-colors bg-card"
                onClick={() => navigateToGroup(group.ID, group.OrderGroup)}
              >
                <h3 className="text-center text-lg font-bold text-foreground">{group.OrderGroup}</h3>
                <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <span className="text-sm text-muted-foreground">{t("TheItemisEnabled")}</span>
                  <Switch checked={(group.MenuEnable || group.menuGroupEnabled) === "1"} onCheckedChange={(v) => handleToggle(group, v)} />
                </div>
                <div className="grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button variant="secondary" size="sm" onClick={() => navigateToGroup(group.ID, group.OrderGroup)}>
                    {t("Add")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => toast.info(t("ComingSoon"))}>
                    {t("Edit")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(group)}>
                    {t("Delete")}
                  </Button>
                </div>
              </div>
            ))}

            {groups.length === 0 && <p className="text-center text-muted-foreground py-8">{t("NoOrdersToshow")}</p>}

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground text-center">{t("Groups")}</h4>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder={t("GroupName")}
                className="text-center"
              />
              <Button className="w-full" onClick={handleAddGroup} disabled={addingGroup || showVideoAd}>
                {addingGroup ? <Loader2 className="animate-spin mr-2" size={14} /> : null}
                {t("Add")}
              </Button>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Areyousureyouwanttodelete")} "{deleteConfirm?.OrderGroup}"?
            </AlertDialogTitle>
            <AlertDialogDescription>{t("PleasedeleteSubMenuItemsBeforeyoucandeletetheMainGroup")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VideoAdvert
        advert={showVideoAd ? (ADVERT_LIBRARY[VIDEO_TRIGGERS.afterFirstGroup] ?? null) : null}
        visible={showVideoAd}
        dismissible={false}
        onDismiss={() => {
          setShowVideoAd(false);
          setPendingGroupName("");
        }}
        onComplete={handleVideoComplete}
      />
    </div>
  );
};

export default EditMenuGroupsPage;
