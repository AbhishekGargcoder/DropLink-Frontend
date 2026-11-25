import { useCallback, useEffect, useRef, useState } from "react";
import {
  createPairingSession,
  getPairingStatus,
  getPairingUrl,
  type PairedDevice,
  type PairingStatus,
} from "../services/pairing.service";

interface PairingState {
  sessionId: string | null;
  qrToken: string | null;
  pairingUrl: string | null;
  expiresAt: string | null;
  status: PairingStatus | null;
  pairedDevice: PairedDevice | null;
  loading: boolean;
  error: string | null;
}

const initialState: PairingState = {
  sessionId: null,
  qrToken: null,
  pairingUrl: null,
  expiresAt: null,
  status: null,
  pairedDevice: null,
  loading: false,
  error: null,
};

export const usePairing = (isOpen: boolean) => {
  const [state, setState] = useState<PairingState>(initialState);
  const pollingRef = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current !== null) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const generateQR = async () => {
    stopPolling();

    setState({
      ...initialState,
      loading: true,
    });

    try {
      // create pairing session as soon as qr code appears and get qr token
      const session = await createPairingSession();
      const url = getPairingUrl(session.qrtoken);

      setState({
        sessionId: session.sessionId,
        qrToken: session.qrtoken,
        pairingUrl: url,
        expiresAt: session.expiresAt,
        status: "PENDING",
        pairedDevice: null,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState({
        ...initialState,
        error: err?.response?.data?.message || "Unable to generate QR code. Please check server connection.",
      });
    }
  };

  useEffect(() => {
    if (!isOpen || !state.sessionId || state.status !== "PENDING") {
      return;
    }
    const sessionId = state.sessionId;
// as soon as my qr-code generates, start long  polling for pairing status
//  every 2 seconds until the status is no longer pending or the modal is closed 
    const checkStatus = async () => {
      try {
        const result = await getPairingStatus(sessionId);
        setState((current) => {
          if (current.sessionId !== sessionId) {
            return current;
          }
          return {
            ...current,
            status: result.status,
            pairedDevice: result.pairedDevice,
          };
        });
        if (result.status !== "PENDING") {
          stopPolling(); // status is no longer pending, stop polling
        }
      } catch {
        // A temporary polling error should not destroy the QR session.
      }
    };

    // Immediate check
    void checkStatus();

    pollingRef.current = window.setInterval(() => {
      void checkStatus();
    }, 2000);

    return stopPolling;
  }, [isOpen, state.sessionId, state.status, stopPolling]);

  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      setState(initialState);
    }

    return stopPolling;
  }, [isOpen, stopPolling]);

  return {
    ...state,
    generateQR,
  };
};