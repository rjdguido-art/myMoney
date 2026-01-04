import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId =
  process.env.FIREBASE_PROJECT_ID ??
  process.env.PROJECT_ID ??
  process.env.project_id;
const privateKeyId =
  process.env.FIREBASE_PRIVATE_KEY_ID ??
  process.env.PRIVATE_KEY_ID ??
  process.env.private_key_id;
const privateKeyRaw =
  process.env.FIREBASE_PRIVATE_KEY ??
  process.env.PRIVATE_KEY ??
  process.env.private_key;
const clientEmail =
  process.env.FIREBASE_CLIENT_EMAIL ??
  process.env.CLIENT_EMAIL ??
  process.env.client_email ??
  (projectId ? `firebase-adminsdk-fbsvc@${projectId}.iam.gserviceaccount.com` : undefined);

const missing = [
  !projectId && "FIREBASE_PROJECT_ID/project_id",
  !privateKeyId && "FIREBASE_PRIVATE_KEY_ID/private_key_id",
  !privateKeyRaw && "FIREBASE_PRIVATE_KEY/private_key",
  !clientEmail && "FIREBASE_CLIENT_EMAIL/client_email",
].filter(Boolean);

if (missing.length) {
  throw new Error(`Missing Firebase Admin environment variables: ${missing.join(", ")}`);
}

const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId,
          privateKeyId,
          privateKey,
          clientEmail,
        }),
      });

export const firebaseAdminAuth = getAuth(app);
