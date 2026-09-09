import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("staging parity source contracts", () => {
  it("keeps the required discovery presentation order", () => {
    const viewShops = source("src/pages/ViewShops.tsx");
    expect(viewShops.indexOf('t("PaidView")')).toBeLessThan(viewShops.indexOf('t("FreeView")'));
    expect(viewShops.indexOf('t("FreeView")')).toBeLessThan(viewShops.indexOf('t("ViewGlobalShops")'));
    expect(viewShops.indexOf('t("ViewGlobalShops")')).toBeLessThan(viewShops.indexOf('t("Scan")'));
  });

  it("keeps Global and local discovery-radius controls separate", () => {
    const profile = source("src/pages/CompanyProfile.tsx");
    expect(profile).toContain("Show on Global Shops");
    expect(profile).toContain("discovery_radius_meters: discoveryRadiusMeters");
    expect(profile).toContain("company.global_discovery_effective");
    expect(profile).toContain("effective_discovery_radius_meters");
  });

  it("uses authenticated canonical admin and owner/customer contracts", () => {
    const admin = source("src/pages/AdminShops.tsx");
    const adminApi = source("src/lib/adminShopsApi.ts");
    const customer = source("src/pages/CustomerProfileReadonly.tsx");
    const v1 = source("src/lib/v1Api.ts");
    expect(admin).not.toMatch(/getallshops\.php|AdminKey/i);
    expect(admin).toContain("Total Shops:");
    expect(adminApi).toContain("admin-shops.php");
    expect(adminApi).toContain("authenticatedFetch");
    expect(customer).toContain("fetchV1AuthorizedCustomerProfile(orderId)");
    expect(customer).not.toMatch(/RetrievUserProfiledetails\.php|user_id|userid/i);
    expect(v1).toContain("company-customer-profile.php?order_id=");
    expect(v1).toContain("company-customer-moderation.php");
  });

  it("does not carry legacy owner-order customer contact columns into the Web model", () => {
    const orders = source("src/lib/companyOrders.ts");
    expect(orders).toContain("authorized customer projection");
    expect(orders).toContain('"customer_email"');
    expect(orders).toContain('"customer_mobile"');
    expect(orders).toContain("customerEmail: \"\"");
  });

  it("keeps public customer-to-company communication on public company fields", () => {
    const shop = source("src/pages/ShopProfile.tsx");
    expect(shop).toContain("buildContactLinks(company?.CompanyMobile || \"\", company?.CompanyEmail || \"\")");
    expect(shop).toContain("companyContact.sms");
    expect(shop).toContain("companyContact.whatsapp");
    expect(shop).toContain("companyContact.email");
  });

  it("fails closed for explicit card-only Web checkout", () => {
    const basket = source("src/pages/Basket.tsx");
    const publicApi = source("src/lib/publicShopsApi.ts");
    expect(publicApi).toContain("PaymentMethod?: string");
    expect(basket).toContain("paymentMethod === 1");
    expect(basket).toContain("card checkout is unavailable");
  });
});
