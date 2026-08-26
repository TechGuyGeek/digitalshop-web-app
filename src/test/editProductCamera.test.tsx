import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AddProduct from "@/pages/AddProduct";
import EditProduct from "@/pages/EditProduct";

const mocks = vi.hoisted(() => ({
  listProducts: vi.fn().mockResolvedValue([]),
  updateProduct: vi.fn().mockResolvedValue({ id: 7 }),
}));

vi.mock("@/lib/menuApi", () => ({
  listProducts: mocks.listProducts,
  updateProduct: mocks.updateProduct,
  createProduct: vi.fn(),
}));

vi.mock("@/lib/companyApi", () => ({ SERVER_DOMAIN: "https://stage-web.gpsshops.com/" }));
vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/ProfileHelpAssistant", () => ({ default: () => null }));
vi.mock("@/components/adverts/VideoAdvert", () => ({ default: () => null }));
vi.mock("@/components/WebcamCapture", () => ({
  default: ({ open, onCapture }: { open: boolean; onCapture: (base64: string) => void }) => (
    open ? (
      <div data-testid="webcam-capture">
        <button onClick={() => onCapture("desktop-camera-image")}>Use Webcam Photo</button>
      </div>
    ) : null
  ),
}));

const originalUserAgent = navigator.userAgent;
const originalMaxTouchPoints = navigator.maxTouchPoints;

function setDevice({ userAgent, maxTouchPoints = 0, mediaDevices = true }: {
  userAgent: string;
  maxTouchPoints?: number;
  mediaDevices?: boolean;
}) {
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: maxTouchPoints });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices ? { getUserMedia: vi.fn() } : undefined,
  });
}

function renderEditProduct() {
  return render(
    <MemoryRouter initialEntries={["/edit-product?productId=7&groupId=3&companyId=2&name=Tea&price=5.00"]}>
      <EditProduct />
    </MemoryRouter>,
  );
}

function renderAddProduct() {
  return render(
    <MemoryRouter initialEntries={["/add-product?groupId=3&companyId=2"]}>
      <AddProduct />
    </MemoryRouter>,
  );
}

function fileInputs(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
}

describe("Edit Product camera and gallery routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDevice({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36" });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: originalUserAgent });
    Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: originalMaxTouchPoints });
  });

  it("keeps Edit Product Gallery on the normal file picker", () => {
    const { container } = renderEditProduct();
    const [cameraInput, galleryInput] = fileInputs(container);
    const cameraClick = vi.fn();
    const galleryClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });
    Object.defineProperty(galleryInput, "click", { configurable: true, value: galleryClick });

    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));

    expect(galleryClick).toHaveBeenCalledOnce();
    expect(cameraClick).not.toHaveBeenCalled();
    expect(screen.queryByTestId("webcam-capture")).not.toBeInTheDocument();
  });

  it("opens WebcamCapture for desktop Edit Product Camera", () => {
    const { container } = renderEditProduct();
    const [cameraInput] = fileInputs(container);
    const cameraClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    expect(screen.getByTestId("webcam-capture")).toBeInTheDocument();
    expect(cameraClick).not.toHaveBeenCalled();
  });

  it("keeps an unsupported desktop camera in the webcam error path", () => {
    setDevice({
      userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
      mediaDevices: false,
    });
    const { container } = renderEditProduct();
    const [cameraInput] = fileInputs(container);
    const cameraClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    expect(screen.getByTestId("webcam-capture")).toBeInTheDocument();
    expect(cameraClick).not.toHaveBeenCalled();
  });

  it("uses the camera-specific input for mobile Edit Product Camera", () => {
    setDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148" });
    const { container } = renderEditProduct();
    const [cameraInput] = fileInputs(container);
    const cameraClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    expect(cameraClick).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("webcam-capture")).not.toBeInTheDocument();
  });

  it("handles iPadOS desktop user agents as mobile camera capture", () => {
    setDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", maxTouchPoints: 5 });
    const { container } = renderEditProduct();
    const [cameraInput] = fileInputs(container);
    const cameraClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));

    expect(cameraClick).toHaveBeenCalledOnce();
    expect(screen.queryByTestId("webcam-capture")).not.toBeInTheDocument();
  });

  it("passes a captured webcam image through the Edit Product update pipeline", async () => {
    renderEditProduct();

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    fireEvent.click(screen.getByRole("button", { name: "Use Webcam Photo" }));
    expect(screen.getByAltText("Tea")).toHaveAttribute("src", "data:image/jpeg;base64,desktop-camera-image");

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    await waitFor(() => expect(mocks.updateProduct).toHaveBeenCalledWith(2, 7, expect.objectContaining({
      image_base64: "desktop-camera-image",
    })));
  });

  it("keeps Add Product camera and gallery paths working independently", async () => {
    const { container } = renderAddProduct();
    await waitFor(() => expect(mocks.listProducts).toHaveBeenCalled());
    const [cameraInput, galleryInput] = fileInputs(container);
    const cameraClick = vi.fn();
    const galleryClick = vi.fn();
    Object.defineProperty(cameraInput, "click", { configurable: true, value: cameraClick });
    Object.defineProperty(galleryInput, "click", { configurable: true, value: galleryClick });

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(screen.getByTestId("webcam-capture")).toBeInTheDocument();
    expect(cameraClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
    expect(galleryClick).toHaveBeenCalledOnce();
  });
});
