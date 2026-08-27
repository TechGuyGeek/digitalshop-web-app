import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Profile from "@/pages/Profile";

const initialUser = {
  id: 41,
  email: "profile@example.test",
  first_name: "Current",
  last_name: "Profile",
  gender: "",
  mobile_number: "07123456789",
  line_one_address: "1 Current Street",
  line_two_address: "",
  line_three_address: "",
  line_four_address: "",
  line_country_address: "GB",
  delivery_notes: "Leave at door",
  image_path: "/Images/UserProfile/old.jpg",
  email_verified: true,
  paid_user: "0",
};

const mocks = vi.hoisted(() => ({
  currentUser: null as typeof initialUser | null,
  savedUser: null as typeof initialUser | null,
  saveProfile: vi.fn(),
  refreshProfile: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  registerActions: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    useAuth: () => {
      const [user, setUser] = React.useState(mocks.currentUser);
      return {
        user,
        status: "authenticated",
        logout: vi.fn(),
        deleteProfile: vi.fn(),
        saveProfile: async (input: unknown) => {
          const saved = await mocks.saveProfile(input);
          setUser(saved);
          return saved;
        },
        refreshProfile: async () => {
          const refreshed = await mocks.refreshProfile();
          setUser(refreshed);
          return refreshed;
        },
      };
    },
  };
});
vi.mock("@/lib/authClient", () => ({
  getMenuImageUrl: (path: string) => `proxy:${path}`,
  getProfileDeletionStatus: vi.fn(),
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/contexts/SiteNavExtras", () => ({ useRegisterNavActions: mocks.registerActions }));
vi.mock("@/components/WebcamCapture", () => ({
  default: ({ open, onCapture }: { open: boolean; onCapture: (base64: string) => void }) => open
    ? <button onClick={() => onCapture("camera-base64")}>Confirm camera image</button>
    : null,
}));
vi.mock("@/components/adverts/AdvertSlot", () => ({ default: () => null }));
vi.mock("@/components/adverts/VideoAdvert", () => ({ default: () => null }));
vi.mock("@/components/ProfileHelpAssistant", () => ({ default: () => null }));
vi.mock("@/hooks/useAdverts", () => ({ useAdverts: () => ({ showVideoAd: vi.fn(), dismissVideoAd: vi.fn(), videoAdvert: null, videoVisible: false }) }));
vi.mock("@/lib/companyApi", () => ({ getOwnedCompany: vi.fn() }));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, loading: vi.fn(), dismiss: vi.fn() },
}));

function savedUser(imagePath: string) {
  return { ...initialUser, image_path: imagePath };
}

function renderProfile() {
  return render(<MemoryRouter><Profile /></MemoryRouter>);
}

function nameInput() {
  return screen.getAllByRole("textbox")[0];
}

describe("Profile image immediate persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.currentUser = { ...initialUser };
    mocks.savedUser = savedUser("/Images/UserProfile/new.jpg");
    mocks.saveProfile.mockResolvedValue(mocks.savedUser);
    mocks.refreshProfile.mockResolvedValue(mocks.currentUser);

    class MockFileReader {
      result = "data:image/jpeg;base64,source-file";
      onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() { this.onload?.({} as ProgressEvent<FileReader>); }
    }
    class MockImage {
      width = 100;
      height = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) { this.onload?.(); }
    }
    vi.stubGlobal("FileReader", MockFileReader);
    Object.defineProperty(window, "Image", { configurable: true, value: MockImage });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,gallery-base64");
  });

  it("persists a Gallery image immediately and reloads the canonical image path", async () => {
    const { container } = renderProfile();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalled());
    mocks.refreshProfile.mockClear();
    mocks.refreshProfile.mockResolvedValue(mocks.savedUser);

    const galleryInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    expect(container.querySelector('input[type="file"][capture="environment"]')).not.toBeNull();
    expect(galleryInput).not.toHaveAttribute("capture");
    fireEvent.change(galleryInput, { target: { files: [new File(["image"], "gallery.jpg", { type: "image/jpeg" })] } });

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ image_base64: "gallery-base64" })));
    expect(mocks.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Current", last_name: "Profile" }));
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalledTimes(1));
    expect(mocks.toastSuccess).toHaveBeenCalledWith("SaveSuccessful");
    expect(screen.getByAltText("Profile")).toHaveAttribute("src", "proxy:/Images/UserProfile/new.jpg");
  });

  it("persists a confirmed desktop Camera image through the same update pipeline", async () => {
    renderProfile();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalled());
    mocks.refreshProfile.mockClear();
    mocks.refreshProfile.mockResolvedValue(mocks.savedUser);

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm camera image" }));

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ image_base64: "camera-base64" })));
    expect(mocks.refreshProfile).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("SaveSuccessful");
  });

  it("does not claim success or retain a false preview when image persistence fails", async () => {
    mocks.saveProfile.mockRejectedValueOnce(new Error("upload failed"));
    const { container } = renderProfile();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalled());
    mocks.refreshProfile.mockClear();

    const galleryInput = container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    fireEvent.change(galleryInput, { target: { files: [new File(["image"], "failed.jpg", { type: "image/jpeg" })] } });

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("SaveFailed"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.refreshProfile).not.toHaveBeenCalled();
    expect(screen.getByAltText("Profile")).toHaveAttribute("src", "proxy:/Images/UserProfile/old.jpg");
  });

  it("does not autosave unsaved text fields while persisting an image", async () => {
    renderProfile();
    await waitFor(() => expect(mocks.refreshProfile).toHaveBeenCalled());
    mocks.refreshProfile.mockClear();
    mocks.refreshProfile.mockResolvedValue(mocks.savedUser);

    fireEvent.change(nameInput(), { target: { value: "Unsaved name" } });
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm camera image" }));

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalled());
    expect(mocks.saveProfile).toHaveBeenCalledWith(expect.objectContaining({ first_name: "Current", image_base64: "camera-base64" }));
    expect(nameInput()).toHaveValue("Unsaved name");
  });
});
