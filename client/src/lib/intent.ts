const INTENT_KEY = "lernentech_pending_intent";

export interface BookingIntent {
  type: "booking";
  tutorId: number;
  tutorName: string;
  sessionType: "online" | "physical";
  location?: string;
  selectedDate: string;
  selectedTime: string;
  selectedSubject?: string;
  sessionRate: number;
  timestamp: number;
}

export interface EnrollmentIntent {
  type: "enrollment";
  courseSlug?: string;
  programSlug?: string;
  timestamp: number;
}

export interface MessageIntent {
  type: "message";
  tutorId: number;
  tutorName: string;
  content?: string;
  timestamp: number;
}

export type PendingIntent = BookingIntent | EnrollmentIntent | MessageIntent;

const INTENT_EXPIRY_MS = 30 * 60 * 1000;

export function saveIntent(intent: PendingIntent) {
  try {
    sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch {
    localStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  }
}

export function getIntent(): PendingIntent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY) || localStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const intent: PendingIntent = JSON.parse(raw);
    if (Date.now() - intent.timestamp > INTENT_EXPIRY_MS) {
      clearIntent();
      return null;
    }
    return intent;
  } catch {
    return null;
  }
}

export function clearIntent() {
  try {
    sessionStorage.removeItem(INTENT_KEY);
    localStorage.removeItem(INTENT_KEY);
  } catch {}
}

export function getIntentRedirectPath(intent: PendingIntent): string {
  switch (intent.type) {
    case "booking":
      return `/tutors/${intent.tutorId}?continue_booking=true`;
    case "enrollment":
      if (intent.courseSlug) return `/courses/${intent.courseSlug}?auto_enroll=true`;
      if (intent.programSlug) return `/programs/${intent.programSlug}?auto_enroll=true`;
      return "/courses";
    case "message":
      return `/tutors/${intent.tutorId}?continue_message=true`;
    default:
      return "/dashboard";
  }
}
