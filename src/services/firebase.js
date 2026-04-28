// ─── Firebase service — singleton pattern, prevents listener flooding ─────────
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore, collection, addDoc, updateDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp, enableNetwork
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const CONFIG = {
  apiKey:            "AIzaSyDcOZGe4cDWmLlAIFgaYtVfRq2sxxRypTE",
  authDomain:        "crisibrain.firebaseapp.com",
  projectId:         "crisibrain",
  storageBucket:     "crisibrain.firebasestorage.app",
  messagingSenderId: "1016747838685",
  appId:             "1:1016747838685:web:f0319f4958d007bb551f34"
};

// ─── singleton: only initialise once ─────────────────────────────────────────
const app  = getApps().length ? getApps()[0] : initializeApp(CONFIG);
export const db   = getFirestore(app);
export const auth = getAuth(app);

export let firebaseOK = false;

// ─── test connectivity with a 5s timeout ─────────────────────────────────────
export async function testFirebase() {
  try {
    await Promise.race([
      enableNetwork(db),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
    ]);
    firebaseOK = true;
    return true;
  } catch {
    firebaseOK = false;
    return false;
  }
}

// ─── LOCAL FALLBACK ───────────────────────────────────────────────────────────
const LS = {
  get:    (k, d=[]) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set:    (k, v)    => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del:    (k)       => { try { localStorage.removeItem(k); } catch {} },
  update: (k, id, patch) => {
    const arr = LS.get(k);
    LS.set(k, arr.map(x => x.id === id ? { ...x, ...patch } : x));
  },
  prepend:(k, item) => { const arr = LS.get(k); arr.unshift(item); LS.set(k, arr); }
};

// ─── CASE SERVICE ─────────────────────────────────────────────────────────────
let _casesUnsub = null;   // ← single listener ref, prevents duplicate subscriptions

export const CaseService = {
  // Call this ONCE per mount. Returns unsubscribe function.
  subscribe(cb) {
    if (_casesUnsub) { _casesUnsub(); _casesUnsub = null; } // clean up existing

    if (firebaseOK) {
      try {
        const q = query(collection(db, 'cases'), orderBy('score', 'desc'));
        _casesUnsub = onSnapshot(q,
          snap => {
            const cases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            LS.set('cb_cases', cases);
            cb(cases);
          },
          err => {
            console.warn('[Cases] Firestore error, switching to local:', err.code);
            _casesUnsub = null;
            firebaseOK  = false;
            cb(LS.get('cb_cases'));
          }
        );
        return () => { if (_casesUnsub) { _casesUnsub(); _casesUnsub = null; } };
      } catch (e) {
        console.warn('[Cases] subscribe failed:', e);
      }
    }

    // local poll (3 s interval)
    cb(LS.get('cb_cases'));
    const t = setInterval(() => cb(LS.get('cb_cases')), 3000);
    return () => clearInterval(t);
  },

  async add(data) {
    const payload = { ...data, createdAt: new Date().toISOString() };
    if (firebaseOK) {
      try {
        const ref = await addDoc(collection(db, 'cases'), { ...payload, createdAt: serverTimestamp() });
        return ref.id;
      } catch (e) { console.warn('[Cases] add failed, saving locally:', e.code); }
    }
    const id = 'CB-' + Date.now().toString(36).toUpperCase();
    LS.prepend('cb_cases', { id, ...payload, _local: true });
    const pending = LS.get('cb_pending', []);
    pending.push({ id, ...payload });
    LS.set('cb_pending', pending);
    return id;
  },

  async update(id, patch) {
    LS.update('cb_cases', id, patch);
    if (firebaseOK) {
      try { await updateDoc(doc(db, 'cases', id), patch); } catch {}
    }
  },

  async syncPending() {
    if (!firebaseOK) return;
    const pending = LS.get('cb_pending', []);
    if (!pending.length) return;
    for (const c of pending) {
      try { await addDoc(collection(db, 'cases'), c); } catch {}
    }
    LS.del('cb_pending');
  }
};

// ─── AMBULANCE SERVICE ────────────────────────────────────────────────────────
let _ambsUnsub = null;

const SEED_AMBS = [
  { id:'AMB-1', team:'Alpha', lat:28.6500, lng:77.3550, mapX:218, mapY:105, busy:false, assignedCase:null },
  { id:'AMB-2', team:'Beta',  lat:28.6050, lng:77.3100, mapX:55,  mapY:76,  busy:false, assignedCase:null },
  { id:'AMB-3', team:'Gamma', lat:28.6150, lng:77.3650, mapX:98,  mapY:145, busy:false, assignedCase:null },
  { id:'AMB-4', team:'Delta', lat:28.6750, lng:77.4800, mapX:572, mapY:270, busy:false, assignedCase:null },
];

export const AmbService = {
  subscribe(cb) {
    if (_ambsUnsub) { _ambsUnsub(); _ambsUnsub = null; }

    if (firebaseOK) {
      try {
        _ambsUnsub = onSnapshot(collection(db, 'ambulances'),
          snap => {
            const ambs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            LS.set('cb_ambs', ambs);
            cb(ambs.length ? ambs : SEED_AMBS);
          },
          () => cb(LS.get('cb_ambs', SEED_AMBS))
        );
        return () => { if (_ambsUnsub) { _ambsUnsub(); _ambsUnsub = null; } };
      } catch {}
    }

    const saved = LS.get('cb_ambs', null);
    cb(saved || SEED_AMBS);
    return () => {};
  },

  async update(id, patch) {
    const ambs = LS.get('cb_ambs', SEED_AMBS).map(a => a.id === id ? { ...a, ...patch } : a);
    LS.set('cb_ambs', ambs);
    if (firebaseOK) {
      try { await updateDoc(doc(db, 'ambulances', id), patch); } catch {}
    }
  }
};

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
const DEMO = {
  'dispatcher@crisisbrain.ai': { pass: 'dispatch123', role: 'dispatcher', name: 'Alex Chen' },
  'admin@crisisbrain.ai':      { pass: 'admin123',    role: 'admin',      name: 'Dr. Priya Sharma' },
  'amb1@crisisbrain.ai':       { pass: 'amb123',      role: 'ambulance',  name: 'AMB-1 Team' },
};

export const AuthService = {
  async signIn(email, password) {
    if (firebaseOK) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const user = { email, uid: cred.user.uid, role: 'dispatcher', name: email, loggedIn: true, src: 'firebase' };
        LS.set('cb_user', user);
        return { ok: true, user };
      } catch (e) {
        if (!['auth/network-request-failed','auth/internal-error'].includes(e.code)) {
          return { ok: false, error: 'Invalid credentials' };
        }
      }
    }
    const demo = DEMO[email.toLowerCase()];
    if (demo && demo.pass === password) {
      const user = { email, role: demo.role, name: demo.name, loggedIn: true, src: 'demo' };
      LS.set('cb_user', user);
      return { ok: true, user };
    }
    return { ok: false, error: 'Invalid email or password' };
  },
  signOut() { LS.del('cb_user'); try { signOut(auth); } catch {} },
  getUser:    () => LS.get('cb_user', null),
  isLoggedIn: () => { const u = LS.get('cb_user', null); return !!(u?.loggedIn); }
};
