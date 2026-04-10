import admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
} else {
  console.warn("FIREBASE credentials not fully set. Firebase Auth will not be fully functional.");
}

export const auth = admin.apps.length > 0 ? admin.auth() : null;

export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    let decodedToken;
    
    if (admin.apps.length > 0) {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } else if (process.env.NODE_ENV !== "production") {
      // Development Mock Mode: Decode JWT without verification
      try {
        const payload = idToken.split(".")[1];
        decodedToken = JSON.parse(Buffer.from(payload, "base64").toString());
        console.log("Using Mock Firebase Auth for:", decodedToken.email);
      } catch (err) {
        console.error("Failed to parse mock token:", err);
        return res.status(401).json({ message: "Unauthorized: Invalid mock token" });
      }
    } else {
      return res.status(401).json({ message: "Unauthorized: Firebase Admin not initialized" });
    }

    (req as any).firebaseUser = decodedToken;
    
    // Auto-populate req.user from DB for compatibility
    if (decodedToken.email) {
      const user = await storage.getUserByEmail(decodedToken.email);
      if (user) {
        (req as any).user = user;
      }
    }
    next();
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Try to see if user is already authenticated via session (legacy)
  if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No valid session or token" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    let decodedToken;
    
    if (admin.apps.length > 0) {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } else if (process.env.NODE_ENV !== "production") {
      // Development Mock Mode: Decode JWT without verification
      const payload = idToken.split(".")[1];
      decodedToken = JSON.parse(Buffer.from(payload, "base64").toString());
    } else {
      return res.status(401).json({ message: "Unauthorized: Firebase Admin not initialized" });
    }

    (req as any).firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};
