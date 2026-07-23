import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from "firebase/firestore";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDcOZGe4cDWmLlAIFgaYtVfRq2sxxRypTE",
  authDomain: "crisibrain.firebaseapp.com",
  projectId: "crisibrain",
  storageBucket: "crisibrain.firebasestorage.app",
  messagingSenderId: "1016747838685",
  appId: "1:1016747838685:web:f0319f4958d007bb551f34"
};

const app = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export async function testFirebase() {
  try {
    await getDocs(collection(db, "cases"));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}
// ─────────────────────────────────────────────────────────────
// Case Service
// ─────────────────────────────────────────────────────────────

export const CaseService = {

  subscribe(callback) {
    const q = query(
      collection(db, "cases"),
      orderBy("score", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const cases = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        callback(cases);
      },
      (error) => {
        console.error("Cases Listener:", error);
      }
    );
  },

  async add(data) {
    try {
      const ref = await addDoc(
        collection(db, "cases"),
        {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      return ref.id;

    } catch (err) {
      console.error("Add Case:", err);
      throw err;
    }
  },

  async update(id, patch) {
    try {
      await updateDoc(
        doc(db, "cases", id),
        {
          ...patch,
          updatedAt: serverTimestamp()
        }
      );
    } catch (err) {
      console.error("Update Case:", err);
      throw err;
    }
  },

  async delete(id) {
    try {
      await deleteDoc(
        doc(db, "cases", id)
      );
    } catch (err) {
      console.error("Delete Case:", err);
      throw err;
    }
  },

  async get(id) {
    const snap = await getDoc(
      doc(db, "cases", id)
    );

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...snap.data()
    };
  },

  async getPending() {

    const q = query(
      collection(db, "cases"),
      where("status", "==", "pending"),
      orderBy("score", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

};
// ─────────────────────────────────────────────────────────────
// Ambulance Service
// ─────────────────────────────────────────────────────────────

export const AmbService = {

  subscribe(callback) {

    const q = query(
      collection(db, "ambulances"),
      orderBy("id")
    );

    return onSnapshot(
      q,
      (snapshot) => {

        const ambulances = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        callback(ambulances);

      },
      (error) => {
        console.error("Ambulance Listener:", error);
      }
    );

  },

  async update(id, patch) {

    try {

      await updateDoc(
        doc(db, "ambulances", id),
        {
          ...patch,
          updatedAt: serverTimestamp()
        }
      );

    } catch (err) {

      console.error("Update Ambulance:", err);
      throw err;

    }

  },

  async get(id) {

    const snap = await getDoc(
      doc(db, "ambulances", id)
    );

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...snap.data()
    };

  }

};
// ─────────────────────────────────────────────────────────────
// AI Log Service
// ─────────────────────────────────────────────────────────────

export const AILogService = {

  subscribe(callback) {

    const q = query(
      collection(db, "ai_logs"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(
      q,
      (snapshot) => {

        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        callback(logs);

      },
      (error) => {
        console.error("AI Logs:", error);
      }
    );

  },

  async add(log) {

    await addDoc(
      collection(db, "ai_logs"),
      {
        ...log,
        createdAt: serverTimestamp()
      }
    );

  }

};
// ─────────────────────────────────────────────────────────────
// Analytics Service
// ─────────────────────────────────────────────────────────────

export const AnalyticsService = {

  subscribe(callback) {

    const unsubCases = onSnapshot(
      collection(db, "cases"),
      (caseSnap) => {

        const cases = caseSnap.docs.map(d => d.data());

        getDocs(collection(db, "ambulances"))
          .then(ambSnap => {

            const ambs = ambSnap.docs.map(d => d.data());

            callback({

              totalCases: cases.length,

              pendingCases:
                cases.filter(c => c.status === "pending").length,

              assignedCases:
                cases.filter(c => c.status === "assigned").length,

              resolvedCases:
                cases.filter(c => c.status === "resolved").length,

              criticalCases:
                cases.filter(c => (c.score || 0) >= 80).length,

              availableAmbulances:
                ambs.filter(a => !a.busy).length,

              busyAmbulances:
                ambs.filter(a => a.busy).length

            });

          });

      }
    );

    return unsubCases;

  }

};
// ─────────────────────────────────────────────────────────────
// Authentication Service
// ─────────────────────────────────────────────────────────────
export const AuthService = {

  async signIn(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const user = {
        uid: cred.user.uid,
        email: cred.user.email,
        name: cred.user.displayName || cred.user.email,
        role: "dispatcher",
        loggedIn: true
      };

      return {
        ok: true,
        user
      };

    } catch (err) {
      return {
        ok: false,
        error: err.message
      };
    }
  },

  async signOut() {
    await signOut(auth);
  },

  getUser() {
    return auth.currentUser;
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  isLoggedIn() {
    return auth.currentUser !== null;
  }

};
