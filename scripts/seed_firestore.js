/**
 * CrisisBrain — Firestore Seed Script
 * Run once to initialise ambulances collection:
 *
 *   node scripts/seed_firestore.js
 *
 * Requires: npm install firebase-admin
 * You need a service account JSON from Firebase Console →
 *   Project Settings → Service Accounts → Generate new private key
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── Replace with path to your downloaded service account JSON ────────────────
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId:  'crisibrain'
});

const db = admin.firestore();

const AMBULANCES = [
  { id:'AMB-1', name:'Ambulance 1', team:'Alpha Team', lat:28.6500, lng:77.3550, busy:false, assignedCase:null, phone:'+91-98001-00001' },
  { id:'AMB-2', name:'Ambulance 2', team:'Beta Team',  lat:28.6050, lng:77.3100, busy:false, assignedCase:null, phone:'+91-98001-00002' },
  { id:'AMB-3', name:'Ambulance 3', team:'Gamma Team', lat:28.6150, lng:77.3650, busy:false, assignedCase:null, phone:'+91-98001-00003' },
  { id:'AMB-4', name:'Ambulance 4', team:'Delta Team', lat:28.6750, lng:77.4800, busy:false, assignedCase:null, phone:'+91-98001-00004' },
];

const STAFF = [
  { uid:'dispatcher-demo', email:'dispatcher@crisisbrain.ai', name:'Alex Chen',         role:'dispatcher' },
  { uid:'admin-demo',      email:'admin@crisisbrain.ai',      name:'Dr. Priya Sharma',  role:'admin' },
  { uid:'amb1-demo',       email:'amb1@crisisbrain.ai',       name:'AMB-1 Team',        role:'ambulance' },
];

async function seed() {
  console.log('Seeding ambulances…');
  for (const amb of AMBULANCES) {
    const { id, ...data } = amb;
    await db.collection('ambulances').doc(id).set(data, { merge: true });
    console.log(`  ✓ ${id}`);
  }

  console.log('Seeding staff profiles…');
  for (const s of STAFF) {
    const { uid, ...data } = s;
    await db.collection('staff').doc(uid).set(data, { merge: true });
    console.log(`  ✓ ${s.email}`);
  }

  console.log('\n✅ Firestore seed complete.');
  console.log('Next: create matching Firebase Auth accounts in the console.');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
