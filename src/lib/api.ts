const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

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

export async function updateUserProfile(user: DigitalPerson, newImageBase64?: string): Promise<{ success: boolean; data?: DigitalPerson; error?: string }> {
  const url = SERVER_DOMAIN + "menu1/PHPwrite/User/UpdateUsersDetailsSecure.php";

  const payload: Record<string, unknown> = {
    PersonID: String(user.PersonID || user.ID || ""),
    Email: (user.Email || user.email || "") as string,
    Name: (user.Name || user.name || "") as string,
    Surname: (user.Surname || user.surname || "") as string,
    DateofBirth: (user.DateofBirth || "") as string,
    MobileNumber: (user.MobileNumber || "") as string,
    Imagepath: (user.Imagepath || "") as string,
    SelectImage: newImageBase64 || "0",
    LineOneAddress: ((user as any).LineOneAddress || "") as string,
    LineTwoAddress: ((user as any).LineTwoAddress || "") as string,
    LineThreeAddress: ((user as any).LineThreeAddress || "") as string,
    LineFourAddress: ((user as any).LineFourAddress || "") as string,
    LineCountryAddress: ((user as any).LineCountryAddress || "") as string,
    LineDeliveryNotesAddress: ((user as any).LineDeliveryNotesAddress || "") as string,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      return { success: true, data: result.data[0] as DigitalPerson };
    }

    return { success: false, error: result.ServerMessage || "Update failed" };
  } catch (err) {
    console.error("Profile update error:", err);
    return { success: false, error: "Network error. Please try again." };
  }
}
