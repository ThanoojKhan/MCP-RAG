import { useEffect, useMemo, useState } from 'react';
import { backendStatusApi } from '../services/backend-status';

interface BackendWakeupModalProps {
  isOpen: boolean;
  onReady: () => void;
}

export const BackendWakeupModal = ({ isOpen, onReady }: BackendWakeupModalProps) => {
  const [isChecking, setIsChecking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const healthUrl = useMemo(() => backendStatusApi.getHealthUrl(), []);

  useEffect(() => {
    if (!isOpen) {
      setIsChecking(false);
      setElapsedSeconds(0);
      setAttempts(0);
      return;
    }

    let cancelled = false;

    const checkHealth = async () => {
      setIsChecking(true);
      setAttempts((current) => current + 1);

      const isAwake = await backendStatusApi.isAwake();

      if (cancelled) {
        return;
      }

      setIsChecking(false);

      if (isAwake) {
        onReady();
      }
    };

    void checkHealth();
    const interval = window.setInterval(() => {
      void checkHealth();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isOpen, onReady]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,7,12,0.8)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[32px] border border-[#f7c66b]/20 bg-[linear-gradient(180deg,rgba(12,18,28,0.96),rgba(18,24,36,0.94))] p-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[#f7c66b]/70">Backend Wake-Up</p>
        <h2 className="mt-3 font-display text-3xl text-[#fff8ef]">Render is waking the API.</h2>
        <p className="mt-3 text-sm leading-6 text-white/68">
          The backend was sleeping due to inactivity. We are checking the health endpoint automatically and will close
          this once the service is responding again.
        </p>

        <div className="mt-5 rounded-[24px] border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">Status</p>
              <p className="mt-2 text-lg text-[#fff8ef]">{isChecking ? 'Checking backend...' : 'Waiting for backend...'}</p>
            </div>
            <div className="rounded-full border border-[#64c4aa]/20 bg-[#64c4aa]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9dd8ca]">
              {elapsedSeconds}s
            </div>
          </div>
          <p className="mt-3 text-sm text-white/55">Health checks attempted: {attempts}</p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={healthUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#f7c66b] px-4 py-2 text-sm font-semibold text-[#17140f] transition hover:bg-[#ffd382]"
          >
            Open backend health page
          </a>
          <p className="text-xs leading-5 text-white/42">The backend page opens in a new tab so the app stays usable here.</p>
        </div>
      </div>
    </div>
  );
};
