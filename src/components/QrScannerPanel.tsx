import { Camera, CameraOff, CheckCircle2, FileImage, Keyboard, QrCode, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { formatEventDate } from '../domain/events';
import type { CheckInScanResult } from '../domain/checkin';
import type { KnotEvent } from '../domain/types';
import { useApp } from '../state/AppContext';

export function QrScannerPanel({ event }: { event: KnotEvent }) {
  const { scanCheckIn } = useApp();
  const [open, setOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<CheckInScanResult | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraActiveRef = useRef(false);
  const scanActionRef = useRef(scanCheckIn);
  const lastCameraScan = useRef({ payload: '', at: 0 });
  const scannerId = `qr-scanner-${useId().replaceAll(':', '')}`;
  scanActionRef.current = scanCheckIn;

  const processPayload = (payload: string) => {
    try { setResult(scanActionRef.current(event.id, payload)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The pass could not be checked.'); setResult(null); }
  };
  const processRef = useRef(processPayload);
  processRef.current = processPayload;

  const getScanner = async () => {
    if (scannerRef.current) return scannerRef.current;
    const { Html5Qrcode: Scanner } = await import('html5-qrcode');
    scannerRef.current = new Scanner(scannerId, { verbose: false });
    return scannerRef.current;
  };

  const stopCamera = async () => {
    const scanner = scannerRef.current;
    if (scanner && cameraActiveRef.current) {
      try { await scanner.stop(); scanner.clear(); } catch { /* Camera may already be stopped by the browser. */ }
    }
    cameraActiveRef.current = false; setCameraActive(false); setCameraVisible(false);
  };

  useEffect(() => { setResult(null); setError(''); void stopCamera(); }, [event.id]);

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner && cameraActiveRef.current) scanner.stop().then(() => scanner.clear()).catch(() => undefined);
  }, []);

  const startCamera = async () => {
    setCameraVisible(true); setBusy(true); setError(''); setResult(null);
    try {
      const scanner = await getScanner();
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (decoded) => {
        const now = Date.now();
        if (lastCameraScan.current.payload === decoded && now - lastCameraScan.current.at < 2000) return;
        lastCameraScan.current = { payload: decoded, at: now };
        processRef.current(decoded);
      }, () => undefined);
      cameraActiveRef.current = true; setCameraActive(true);
    } catch {
      setCameraVisible(false);
      setError('Camera scanning is unavailable or permission was denied. Use QR-image upload or the manual code instead.');
    } finally { setBusy(false); }
  };

  const scanImage = async (file: File | undefined, input: HTMLInputElement) => {
    if (!file) return;
    setBusy(true); setError(''); setResult(null);
    try {
      if (cameraActiveRef.current) await stopCamera();
      const scanner = await getScanner();
      const decoded = await scanner.scanFile(file, false);
      processPayload(decoded);
    } catch {
      setError('No readable Knot QR pass was found in that image. Try a clearer image or the manual code.');
    } finally { input.value = ''; setBusy(false); }
  };

  if (!open) return <button className="button button--secondary qr-open-button" onClick={() => { setOpen(true); setResult(null); setError(''); }}><QrCode /> Open QR check-in</button>;

  return <section className="qr-scanner-panel">
    <div className="section-mini-heading"><div><h2>QR check-in · {event.title}</h2><p>Only confirmed native registrations are eligible. Duplicate scans never create another attendance record.</p></div><button className="icon-button" aria-label="Close QR check-in" onClick={() => { void stopCamera(); setOpen(false); }}><X /></button></div>
    <div className="qr-scanner-layout">
      <div className="qr-camera-column"><div id={scannerId} className={`qr-camera-view ${cameraVisible ? 'qr-camera-view--active' : ''}`} />{cameraActive ? <button className="button button--secondary" disabled={busy} onClick={() => void stopCamera()}><CameraOff /> Stop camera</button> : <button className="button button--primary" disabled={busy} onClick={() => void startCamera()}><Camera /> Start camera</button>}</div>
      <div className="qr-fallbacks"><label className="qr-file-button button button--secondary"><FileImage /> Scan QR image<input className="qr-file-input" type="file" accept="image/*" disabled={busy} onChange={(input) => void scanImage(input.target.files?.[0], input.target)} /></label><form onSubmit={(input) => { input.preventDefault(); if (manual.trim()) { processPayload(manual); setManual(''); } }}><label>Manual pass code<div className="qr-manual-row"><input value={manual} onChange={(input) => setManual(input.target.value)} placeholder="48-character participant code" autoCapitalize="off" autoCorrect="off" /><button className="button button--secondary" type="submit" disabled={!manual.trim()}><Keyboard /> Check in code</button></div></label></form><p><ShieldCheck />Camera access begins only when you start it. Image and manual fallbacks use the same eligibility and duplicate checks.</p></div>
    </div>
    {busy && <div className="qr-scan-status">Reading check-in pass…</div>}
    {error && <div className="form-error">{error}</div>}
    {result && <div className={`qr-scan-result qr-scan-result--${result.status}`} role="status"><CheckCircle2 /><div><strong>{result.status === 'checked_in' ? 'Checked in' : result.status === 'duplicate' ? 'Duplicate scan handled' : 'Pass not checked in'}</strong><p>{result.message}</p>{result.checkedInAt && <small>Recorded {formatEventDate(result.checkedInAt, true)}</small>}</div></div>}
  </section>;
}
