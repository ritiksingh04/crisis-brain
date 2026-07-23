import { useState, useEffect, useRef, useCallback } from 'react';
import { CaseService, AmbService, testFirebase } from '../services/firebase';

// ─────────────────────────────────────────────────────────────
// Firebase Init
// ─────────────────────────────────────────────────────────────
export function useFirebaseInit() {
  const [ready, setReady] = useState(false);
  const [fbOK, setFbOK] = useState(false);

  useEffect(() => {
    testFirebase().then(ok => {
      setFbOK(ok);
      setReady(true);
    });
  }, []);

  return { ready, fbOK };
}

// ─────────────────────────────────────────────────────────────
// CASES
// ─────────────────────────────────────────────────────────────
export function useCases() {
  const [cases, setCases] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
    }

    unsubRef.current = CaseService.subscribe((liveCases) => {
      setCases(
        [...liveCases].sort((a, b) => (b.score || 0) - (a.score || 0))
      );
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, []);

  const updateCase = useCallback((id, patch) => {
    setCases(cs =>
      cs.map(c => (c.id === id ? { ...c, ...patch } : c))
    );
    CaseService.update(id, patch);
  }, []);

  const removeCase = useCallback(id => {
    setCases(cs => cs.filter(c => c.id !== id));
  }, []);

  const addCase = useCallback(c => {
    setCases(cs =>
      [...cs, c].sort((a, b) => (b.score || 0) - (a.score || 0))
    );
  }, []);

  return {
    cases,
    updateCase,
    removeCase,
    addCase
  };
}

// ─────────────────────────────────────────────────────────────
// Ambulances
// ─────────────────────────────────────────────────────────────

const DEFAULT_AMBS = [
  {
    id: "AMB001",
    team: "Alpha",
    driver: "Rahul",
    busy: false,
    assignedCase: null,
    lat: 28.62,
    lng: 77.21
  },
  {
    id: "AMB002",
    team: "Bravo",
    driver: "Amit",
    busy: false,
    assignedCase: null,
    lat: 28.64,
    lng: 77.28
  },
  {
    id: "AMB003",
    team: "Charlie",
    driver: "Vikas",
    busy: false,
    assignedCase: null,
    lat: 28.66,
    lng: 77.33
  }
];

export function useAmbulances() {
  const [ambs, setAmbs] = useState([]);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
    }

    unsubRef.current = AmbService.subscribe((list) => {
      if (list.length === 0) {
        setAmbs(DEFAULT_AMBS);
      } else {
        setAmbs(list);
      }
    });

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
      }
    };
  }, []);

  const updateAmb = useCallback((id, patch) => {
    setAmbs(list =>
      list.map(a => (a.id === id ? { ...a, ...patch } : a))
    );

    AmbService.update(id, patch);
  }, []);

  return {
    ambs,
    updateAmb
  };
}

// ─────────────────────────────────────────────────────────────
// Online Status
// ─────────────────────────────────────────────────────────────

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}