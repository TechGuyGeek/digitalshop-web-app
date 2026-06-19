// Single AI service interface for the frontend.
// The UI must never call AI providers directly — always go through this module.
// Swap providers server-side by setting the AI_PROVIDER secret (lovable | gpsshops);
// the frontend contract does not change.

import { supabase } from "@/integrations/supabase/client";

export type ChatRole = "system" | "user" | "assistant";
export interface ChatMessage { role: ChatRole; content: string }

export interface Registration {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  password: string;
  gender: string;
}

export interface RegistrationAIResponse {
  registration: Registration;
  missing_fields: string[];
  complete: boolean;
  reply: string;
}

export const EMPTY_REGISTRATION: Registration = {
  first_name: "",
  last_name: "",
  email: "",
  mobile_number: "",
  password: "",
  gender: "",
};

export const RegistrationAIService = {
  async chat(messages: ChatMessage[], partial: Partial<Registration> = {}): Promise<RegistrationAIResponse> {
    const { data, error } = await supabase.functions.invoke("ai-registration", {
      body: { messages, partial },
    });
    if (error) throw error;
    if (!data || typeof data !== "object" || !("registration" in data)) {
      throw new Error("Invalid AI response");
    }
    return data as RegistrationAIResponse;
  },
};

// Generic facade for future AI features (each goes through one backend function).
export const AIService = {
  registration: RegistrationAIService,
};