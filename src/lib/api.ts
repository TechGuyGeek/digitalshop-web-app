const SERVER_DOMAIN = "https://app.techguygeek.co.uk/";

export interface DigitalPerson {
  PersonID?: string;
  Name?: string;
  Surname?: string;
  Email?: string;
  Password?: string;
  DateofBirth?: string;
  MobileNumber?: string;
  PaidUser?: string;
  ID?: string;
  Token?: string;
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

  if (!text || text === "User with that email doesn't exist!") {
    return null;
  }

  try {
    return JSON.parse(text) as DigitalPerson;
  } catch {
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
  const url = SERVER_DOMAIN + "Registration/registration2.php";

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
