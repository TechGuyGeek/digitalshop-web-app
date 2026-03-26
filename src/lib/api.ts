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
    
    // Handle server error messages (e.g. {"ServerMessage":"User with that email doesn't exist!"})
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

  return await response.text();
}
