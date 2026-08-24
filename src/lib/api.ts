const SERVER_DOMAIN = "https://web.gpsshops.com/";

export interface DigitalPerson {
  PersonID?: number | string;
  Name?: string;
  name?: string;
  Surname?: string;
  surname?: string;
  Email?: string;
  email?: string;
  Password?: string;
  password?: string;
  DateofBirth?: string;
  MobileNumber?: string;
  PaidUser?: string;
  Paiduser?: string;
  ID?: string;
  Token?: string;
  ServerMessage?: string;
  imagename?: string;
  Imagepath?: string;
  hash?: string;
  active?: number;
  LastLoggedOn?: string;
  PurchaseStated?: string;
  [key: string]: unknown; // allow additional fields
}

export async function loginUser(email: string, password: string): Promise<DigitalPerson | null> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/User/login2.php";

  const formData = new URLSearchParams();
  formData.append("Email", email);
  formData.append("password", password);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    
    // "Success" means valid login — return the user object
    if (parsed.ServerMessage === "Success") {
      return parsed as DigitalPerson;
    }

    // Any other ServerMessage is an error
    if (parsed.ServerMessage) {
      console.warn("Server message:", parsed.ServerMessage);
      return null;
    }
    
    return parsed as DigitalPerson;
  } catch {
    // If not JSON, check for plain text error
    if (text.includes("doesn't exist") || text.includes("error")) {
      return null;
    }
    console.error("Login parse error:", text);
    return null;
  }
}

export async function registerUser(user: {
  name: string;
  surname: string;
  dateOfBirth: string;
  email: string;
  password: string;
  mobileNumber: string;
  language?: string;
}): Promise<string> {
  const lang = user.language || "en-GB";
  const url = SERVER_DOMAIN + "menu1/Registration/registration2.php";

  const formData = new URLSearchParams();
  formData.append("user_name", user.name);
  formData.append("user_surname", user.surname);
  formData.append("user_age", user.dateOfBirth);
  formData.append("user_email", user.email);
  formData.append("password", user.password);
  formData.append("str_Mobile", user.mobileNumber);
  formData.append("whatLanAmI", lang);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });

  const text = await response.text();

  // Backend returns HTML on success, not JSON
  // Check for known error patterns first
  const lower = text.toLowerCase();
  if (lower.includes("already exists")) {
    return "User with this email already exists!";
  }
  if (lower.includes("unsuccessful") || lower.includes("error")) {
    return "Registration failed. Please try again.";
  }
  // Success: backend outputs HTML email template and/or "Success!" text
  if (lower.includes("success") || lower.includes("email has been sent") || text.includes("<html") || text.includes("<!DOCTYPE")) {
    return "SUCCESS";
  }
  // Fallback: treat non-empty as potential success
  return text ? "SUCCESS" : "Registration failed. No response from server.";
}

export interface CompanyDetails {
  companyid: number;
  PersonID?: number;
  companyname?: string;
  companyphoto?: string;
  CompanyMobile?: string;
  CompanyEmail?: string;
  OpeningTimes?: string;
  ClosingTimes?: string;
  TableNumbers?: string;
  MenuNotifications?: string;
  OrderEnable?: string;
  TakeawayEnable?: string;
  DeliveryEnable?: string;
  PayOnPhoneEnable?: string;
  LineOneAddress?: string;
  LineTwoAddress?: string;
  LineThreeAddress?: string;
  LineFourAddress?: string;
  LineCountryAddress?: string;
  LineDeliveryNotesAddress?: string;
  CompanyDescription?: string;
  LastLoggedOn?: string;
}

export async function fetchCompanyById(companyId: number): Promise<CompanyDetails | null> {
  const url = SERVER_DOMAIN + "menu1/PHPread/ClientMenu/DoesCompanyExistCompanyIDnewUpgraded.php";
  const formData = new URLSearchParams();
  formData.append("companyID", String(companyId));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const text = await response.text();
    if (!text || text.includes("doesn't exist")) return null;
    const parsed = JSON.parse(text);
    const company = Array.isArray(parsed) ? parsed[0] : parsed;
    if (!company || !company.companyid) return null;
    return company as CompanyDetails;
  } catch (err) {
    console.error("fetchCompanyById error:", err);
    return null;
  }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const url = SERVER_DOMAIN + "menu1/PHPread/User/forgotpassword2.php";
  const formData = new URLSearchParams();
  formData.append("Email", email);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    const text = await response.text();
    if (!text) return "No response from server. Please try again.";
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return "Network error. Please check your connection and try again.";
  }
}
