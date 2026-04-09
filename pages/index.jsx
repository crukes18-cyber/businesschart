"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

const STATUS_COLORS = { "완료": "#1D9E75", "펜딩": "#F59E0B", "진행": "#378ADD", "취소": "#EF4444" };
const STATUS_BG = { "완료": "#EAF3DE", "펜딩": "#FEF3C7", "진행": "#E6F1FB", "취소": "#FDEDEC" };
const STATUSES = ["완료", "펜딩", "진행", "취소"];
const now = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; };

// 날짜 변환 헬퍼 (표시용: 2026.04.08 ↔ input용: 2026-04-08)
const toInputDate = (d) => d ? d.replace(/\./g, "-") : "";
const toDisplayDate = (d) => d ? d.replace(/-/g, ".") : "";

const DEFAULT_RECORDS = [
  { id: 1, requestDate: "2025.07.28", dueDate: "2025.08.15", completeDate: "2025.08.10", brand: "Alpha Sports", brandManager: "James K.", woojooManager: "김은석", content: "첫 접촉 — 유럽 친환경 인증 소재 관심 확인", status: "완료", nextStep: "인증서 및 소재 사양서 발송", pendingReason: "—", memos: [{ id: 1, text: "유럽 OEKO-TEX 인증 관련 문의 — 인증서 사본 첨부 완료", date: "2025.08.12 09:30" }] },
  { id: 2, requestDate: "2025.09.01", dueDate: "2025.09.20", completeDate: "2025.09.15", brand: "B", brandManager: "", woojooManager: "이지은", content: "첫 미팅 — 소재 라인업 소개, SS26 니즈 청취", status: "완료", nextStep: "스와치 발송 요청", pendingReason: "—", memos: [] },
  { id: 3, requestDate: "2025.09.10", dueDate: "2025.09.25", completeDate: "2025.09.20", brand: "C", brandManager: "James K.", woojooManager: "김은석", content: "소재 승인 완료 — SS26 500yds 발주 확정", status: "완료", nextStep: "발주서 접수 및 생산 일정 공유", pendingReason: "—", memos: [] },
  { id: 4, requestDate: "2025.09.30", dueDate: "2025.10.15", completeDate: "2025.10.08", brand: "D", brandManager: "", woojooManager: "박성민", content: "스와치 전달, DNT-4034 foil print 타당성 논의", status: "펜딩", nextStep: "가먼트 워시 샘플 제작 착수", pendingReason: "워시 테스트 결과 대기", memos: [{ id: 1, text: "가먼트 워시 테스트 3회 진행 예정, 결과 2주 후 공유", date: "2025.10.10 14:20" }, { id: 2, text: "1차 워시 테스트 완료 — 수축률 2.1%, 기준 이내\n2차 테스트 다음 주 진행", date: "2025.10.18 11:00" }] },
  { id: 5, requestDate: "2025.10.10", dueDate: "2025.11.01", completeDate: "2025.10.20", brand: "E", brandManager: "Sarah L.", woojooManager: "최현아", content: "첫 미팅 — FW26 소재 니즈 파악, Woven-touch 관심 확인", status: "진행", nextStep: "스와치 3종 선별 발송", pendingReason: "—", memos: [] },
  { id: 6, requestDate: "2025.10.25", dueDate: "2025.11.20", completeDate: "2025.11.05", brand: "F", brandManager: "", woojooManager: "김은석", content: "인트로 미팅 — 친환경 소재 관심, 워터리스 다잉 소개", status: "펜딩", nextStep: "소재 카탈로그 발송", pendingReason: "—", memos: [] },
  { id: 7, requestDate: "2025.11.01", dueDate: "2025.11.30", completeDate: "2025.11.15", brand: "G", brandManager: "Sarah L.", woojooManager: "최현아", content: "스와치 리뷰 — 2종 긍정, 추가 색상 옵션 요청", status: "완료", nextStep: "색상 개발 착수", pendingReason: "—", memos: [] },
];

const EMPTY = { requestDate: "", dueDate: "", completeDate: "", brand: "", brandManager: "", woojooManager: "", content: "", status: "펜딩", nextStep: "", pendingReason: "", memos: [], updatedAt: "" };

// ─── Login / Signup Gate ─────────────────────────────────────────────────────
function AuthGate({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const triggerShake = (msg) => { setError(msg); setShake(true); setTimeout(()=>setShake(false),500); };

  const handleLogin = async () => {
    if (!userId.trim()||!password.trim()) return triggerShake("아이디와 비밀번호를 입력해주세요.");
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      const user = (data.users||[]).find(u=>u.userId===userId && u.password===password);
      if (!user) { setLoading(false); return triggerShake("아이디 또는 비밀번호가 올바르지 않아요."); }
      if (typeof window !== "undefined") sessionStorage.setItem("buyer_user", JSON.stringify({ userId: user.userId, name: user.name }));
      onLogin({ userId: user.userId, name: user.name });
    } catch { triggerShake("서버 오류가 발생했어요."); }
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!userId.trim()||!password.trim()||!name.trim()) return triggerShake("모든 항목을 입력해주세요.");
    if (userId.length < 3) return triggerShake("아이디는 3자 이상이어야 해요.");
    if (password.length < 4) return triggerShake("비밀번호는 4자 이상이어야 해요.");
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, password })
      });
      const data = await res.json();
      if (res.status === 409) { setLoading(false); return triggerShake(data.error); }
      if (!data.ok) { setLoading(false); return triggerShake("가입 중 오류가 발생했어요."); }
      if (typeof window !== "undefined") sessionStorage.setItem("buyer_user", JSON.stringify({ userId, name }));
      onLogin({ userId, name });
    } catch { triggerShake("서버 오류가 발생했어요."); }
    setLoading(false);
  };

  const inp = { width:"100%", boxSizing:"border-box", padding:"11px 14px", border:"1.5px solid #ddd", borderRadius:10, fontSize:14, outline:"none", fontFamily:"inherit" };

  return (
    <div style={{ minHeight:"100vh", background:"#f8f8f6", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{ background:"white", borderRadius:16, padding:"40px 36px", boxShadow:"0 8px 40px rgba(0,0,0,0.10)", width:360, animation:shake?"shake 0.4s ease":"none" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:52,height:52,borderRadius:14,background:"#2C3E50",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 4px 14px rgba(44,62,80,0.3)" }}>
            <span style={{ fontSize:24 }}>📋</span>
          </div>
          <div style={{ fontSize:18,fontWeight:700,color:"#1a1a1a" }}>바이어 기록 카드</div>
          <div style={{ fontSize:12,color:"#999",marginTop:4 }}>우주글로벌 내부 전용</div>
        </div>
        <div style={{ display:"flex", background:"#f5f5f3", borderRadius:10, padding:4, marginBottom:20, gap:4 }}>
          {[["login","로그인"],["signup","회원가입"]].map(([m,label])=>(
            <button key={m} onClick={()=>{setMode(m);setError("");}} style={{ flex:1,padding:"8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,
              background:mode===m?"white":"transparent",color:mode===m?"#1a1a1a":"#999",
              boxShadow:mode===m?"0 1px 4px rgba(0,0,0,0.1)":"none",transition:"all .15s" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {mode==="signup" && (
            <div>
              <label style={{ fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5 }}>이름</label>
              <input value={name} onChange={e=>{setName(e.target.value);setError("");}} placeholder="홍길동" style={inp}/>
            </div>
          )}
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5 }}>아이디</label>
            <input value={userId} onChange={e=>{setUserId(e.target.value);setError("");}} placeholder="아이디 입력" style={inp} autoFocus/>
          </div>
          <div>
            <label style={{ fontSize:12,fontWeight:600,color:"#555",display:"block",marginBottom:5 }}>비밀번호</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleSignup())}
              placeholder="비밀번호 입력" style={inp}/>
          </div>
        </div>
        {error && <div style={{ fontSize:12,color:"#EF4444",marginTop:10,padding:"8px 12px",background:"#FEF2F2",borderRadius:8 }}>⚠ {error}</div>}
        <button onClick={mode==="login"?handleLogin:handleSignup} disabled={loading}
          style={{ width:"100%",padding:"12px",marginTop:16,background:"#2C3E50",color:"white",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1 }}>
          {loading?"처리 중...":(mode==="login"?"로그인":"가입하기")}
        </button>
        <div style={{ marginTop:14,padding:"10px 12px",background:"#F8FAFC",borderRadius:8,fontSize:11,color:"#94A3B8",textAlign:"center",lineHeight:1.6 }}>
          이 페이지는 우주글로벌 내부 인원만 접근할 수 있습니다
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function BuyerCard() {
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const s = sessionStorage.getItem("buyer_user");
    return s ? JSON.parse(s) : null;
  });
  if (!currentUser) return <AuthGate onLogin={(user)=>setCurrentUser(user)} />;
  return <BuyerApp currentUser={currentUser} onLogout={()=>{ sessionStorage.removeItem("buyer_user"); setCurrentUser(null); }} />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
function BuyerApp({ currentUser, onLogout }) {
  const [records, setRecords] = useState(DEFAULT_RECORDS);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState("info");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [filterManager, setFilterManager] = useState("전체");
  const [memoText, setMemoText] = useState("");
  const [syncStatus, setSyncStatus] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (!showLogs) return;
    fetch("/api/logs").then(r=>r.json()).then(d=>setLogs(d.logs||[])).catch(()=>{});
  }, [showLogs]);

  const writeLog = (action, target) => {
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.userId, userName: currentUser.name, action, target })
    }).catch(()=>{});
  };
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [undoStack, setUndoStack] = useState([]);
  const [undoNotice, setUndoNotice] = useState(null);

  // 페이지 로드 시 Google Sheets에서 불러오기
  useEffect(() => {
    setSyncStatus("loading");
    fetch("/api/records")
      .then(r => r.json())
      .then(data => {
        if (data.records) setRecords(data.records);
        setSyncStatus("idle");
      })
      .catch(() => setSyncStatus("error"));
  }, []);

  const handleExcelDownload = () => {
    const rows = [
      ["브랜드", "브랜드담당", "우주담당", "의뢰일", "납기일", "완료일", "상태", "진행내용", "다음단계", "펜딩사유"],
      ...records.map(r => [
        r.brand || "", r.brandManager || "", r.woojooManager || "",
        r.requestDate || "", r.dueDate || "", r.completeDate || "",
        r.status || "", r.content || "", r.nextStep || "", r.pendingReason || ""
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const BOM = "﻿";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}`;
    a.href = url; a.download = `바이어기록카드_${dateStr}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (data.ok) {
        setSyncStatus("saved");
        setLastSaved(new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }));
        setTimeout(() => setSyncStatus("idle"), 3000);
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
  };

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);
  const managers = useMemo(() => { const s = new Set(records.map((r) => r.woojooManager).filter(Boolean)); return ["전체", ...Array.from(s).sort()]; }, [records]);
  const filtered = useMemo(() => records.filter((r) => {
    if (filterStatus !== "전체" && r.status !== filterStatus) return false;
    if (filterManager !== "전체" && r.woojooManager !== filterManager) return false;
    if (search) { const q = search.toLowerCase(); return [r.brand, r.brandManager, r.content, r.nextStep, r.woojooManager].some((v) => (v||"").toLowerCase().includes(q)); }
    return true;
  }), [records, filterStatus, filterManager, search]);
  const stats = useMemo(() => ({ total: records.length, done: records.filter((r) => r.status === "완료").length, waiting: records.filter((r) => r.status === "펜딩").length, progress: records.filter((r) => r.status === "진행").length }), [records]);

  const handleAdd = () => {
    const mx = records.reduce((m, r) => Math.max(m, r.id), 0);
    const newRecord = { ...form, id: mx+1, memos: [], updatedAt: now() };
    setRecords((p) => [...p, newRecord]);
    writeLog("기록 추가", `${form.brand} (${form.woojooManager})`);
    setModal(null); setForm({ ...EMPTY }); showToast("✓ 기록 추가됨");
  };
  const startEdit = (r) => { setEditingId(r.id); setForm({ ...r }); setModal("edit"); };
  const handleEdit = () => {
    const u = { ...form, id: editingId, updatedAt: now() };
    setRecords((p) => p.map((r) => r.id === editingId ? u : r));
    if (detail && detail.id === editingId) setDetail(u);
    writeLog("기록 수정", `${form.brand} (${form.woojooManager})`);
    setModal(null); setEditingId(null); setForm({ ...EMPTY }); showToast("✓ 수정됨");
  };

  const requestDelete = (id) => {
    const rec = records.find(r => r.id === id);
    setConfirmDelete({ id, name: `${rec?.brand || rec?.content?.slice(0,20)}` });
    setModal(null);
    setDetail(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    const snapshot = records;
    const rec = records.find(r => r.id === confirmDelete.id);
    setRecords(p => p.filter(r => r.id !== confirmDelete.id));
    writeLog("기록 삭제", `${rec?.brand} (${rec?.woojooManager})`);
    setConfirmDelete(null);
    showToast("✓ 삭제됨");
    const tid = setTimeout(() => setUndoNotice(null), 5000);
    setUndoStack(s => [...s, { snapshot, label: `"${rec?.buyer}" 기록 삭제` }]);
    setUndoNotice({ message: `"${rec?.buyer}" 기록이 삭제됐어요.`, timeoutId: tid });
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setRecords(last.snapshot);
    setUndoStack(s => s.slice(0, -1));
    if (undoNotice?.timeoutId) clearTimeout(undoNotice.timeoutId);
    setUndoNotice(null);
    showToast("✓ 되돌리기 완료");
  };

  const openDetail = (r, tab) => { setDetail(r); setDetailTab(tab || "info"); setMemoText(""); setModal("detail"); };
  const updateStatus = (id, status) => { const rec = records.find((r) => r.id === id); if (!rec) return; const u = { ...rec, status }; setRecords((p) => p.map((r) => r.id === id ? u : r)); if (detail && detail.id === id) setDetail(u); showToast(`✓ 상태 → "${status}"`); };

  const addMemo = () => {
    if (!memoText.trim()) return;
    const memo = { id: Date.now(), text: memoText.trim(), date: now() };
    const u = { ...detail, memos: [...detail.memos, memo] };
    setRecords((p) => p.map((r) => r.id === detail.id ? u : r));
    setDetail(u); setMemoText("");
    showToast("✓ 메모 추가됨");
  };
  const deleteMemo = (memoId) => { const u = { ...detail, memos: detail.memos.filter((m) => m.id !== memoId) }; setRecords((p) => p.map((r) => r.id === detail.id ? u : r)); setDetail(u); };

  const S = {
    page: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 1200, margin: "0 auto", padding: "20px 24px", color: "#1a1a1a", fontSize: 13, background: "#f8f8f6", minHeight: "100vh" },
    btn: (t) => ({ padding: "8px 16px", borderRadius: 8, border: t === "primary" ? "none" : "1px solid #ddd", background: t === "primary" ? "#2C3E50" : "#fff", color: t === "primary" ? "#fff" : "#333", fontSize: 12, fontWeight: 600, cursor: "pointer" }),
    badge: (st) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: STATUS_BG[st] || "#f0f0f0", color: STATUS_COLORS[st] || "#666" }),
    input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, boxSizing: "border-box", background: "#fafaf8" },
    textarea: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, boxSizing: "border-box", minHeight: 60, resize: "vertical", background: "#fafaf8" },
    label: { display: "block", fontSize: 11, fontWeight: 600, marginBottom: 5, color: "#555" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
    formModal: { background: "#fff", borderRadius: 14, padding: 28, width: 560, maxWidth: "92vw", maxHeight: "90vh", overflow: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.18)" },
    detailModal: { background: "#fff", borderRadius: 14, width: 600, maxWidth: "92vw", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" },
    tab: (a) => ({ padding: "10px 20px", border: "none", borderBottom: a ? "2px solid #2C3E50" : "2px solid transparent", background: "transparent", fontWeight: a ? 700 : 400, fontSize: 13, cursor: "pointer", color: a ? "#2C3E50" : "#999" }),
    ib: { background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 14, opacity: 0.35, lineHeight: 1 },
    cell: (w) => ({ width: w, minWidth: w, padding: "10px 10px", fontSize: 12, display: "flex", alignItems: "center", borderRight: "1px solid #f5f5f0", flexShrink: 0 }),
    cellF: { flex: 1, padding: "10px 10px", fontSize: 12, display: "flex", alignItems: "center", minWidth: 0 },
    hCell: (w) => ({ width: w, minWidth: w, padding: "10px 10px", borderRight: "1px solid #3d5266", flexShrink: 0 }),
    hCellF: { flex: 1, padding: "10px 10px", minWidth: 0 },
  };

  const renderForm = (isEdit) => (
    <div style={S.overlay} onClick={() => setModal(null)}>
      <div style={S.formModal} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 20px", fontSize: 17, fontWeight: 700 }}>{isEdit ? "기록 수정" : "새 기록 추가"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><label style={S.label}>브랜드</label><input style={S.input} value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} placeholder="브랜드명" /></div>
          <div><label style={S.label}>브랜드 담당</label><input style={S.input} value={form.brandManager} onChange={(e) => setForm((f) => ({ ...f, brandManager: e.target.value }))} placeholder="담당자 이름" /></div>
          <div><label style={S.label}>의뢰일</label><input type="date" style={S.input} value={toInputDate(form.requestDate)} onChange={(e) => setForm((f) => ({ ...f, requestDate: toDisplayDate(e.target.value) }))} /></div>
          <div><label style={S.label}>납기일</label><input type="date" style={S.input} value={toInputDate(form.dueDate)} onChange={(e) => setForm((f) => ({ ...f, dueDate: toDisplayDate(e.target.value) }))} /></div>
          <div><label style={S.label}>완료일</label><input type="date" style={S.input} value={toInputDate(form.completeDate)} onChange={(e) => setForm((f) => ({ ...f, completeDate: toDisplayDate(e.target.value) }))} /></div>
          <div><label style={S.label}>상태</label><div style={{ display: "flex", gap: 6 }}>{STATUSES.map((st) => (<button key={st} onClick={() => setForm((f) => ({ ...f, status: st }))} style={{ ...S.badge(st), cursor: "pointer", border: form.status === st ? "2px solid " + STATUS_COLORS[st] : "2px solid transparent", padding: "5px 14px", fontSize: 12 }}>{st}</button>))}</div></div>
          <div style={{ gridColumn: "1 / -1" }}><label style={S.label}>우주 담당</label><input style={S.input} value={form.woojooManager} onChange={(e) => setForm((f) => ({ ...f, woojooManager: e.target.value }))} placeholder="우주글로벌 담당자" /></div>
        </div>
        <div style={{ marginTop: 12 }}><label style={S.label}>진행 내용</label><textarea style={S.textarea} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} /></div>
        <div style={{ marginTop: 12 }}><label style={S.label}>조치 / 다음 단계</label><textarea style={{ ...S.textarea, minHeight: 45 }} value={form.nextStep} onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))} /></div>
        <div style={{ marginTop: 12 }}><label style={S.label}>펜딩 사유</label><input style={S.input} value={form.pendingReason} onChange={(e) => setForm((f) => ({ ...f, pendingReason: e.target.value }))} /></div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}><button style={S.btn()} onClick={() => setModal(null)}>취소</button><button style={S.btn("primary")} onClick={isEdit ? handleEdit : handleAdd} disabled={!form.brand || !form.content}>{isEdit ? "저장" : "추가"}</button></div>
      </div>
    </div>
  );

  const renderDetail = () => { if (!detail) return null; const r = detail; return (
    <div style={S.overlay} onClick={() => setModal(null)}>
      <div style={S.detailModal} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div><h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{r.brand}</h3><div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{r.brandManager || ""}</div></div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={S.badge(r.status)}>{r.status}</span><button style={{ ...S.ib, fontSize: 18, opacity: 0.6 }} onClick={() => setModal(null)}>✕</button></div>
          </div>
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid #e8e8e4" }}>
            <button style={S.tab(detailTab === "info")} onClick={() => setDetailTab("info")}>기본 정보</button>
            <button style={S.tab(detailTab === "memo")} onClick={() => setDetailTab("memo")}>메모 {r.memos.length > 0 && <span style={{ background: "#2C3E50", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>{r.memos.length}</span>}</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {detailTab === "info" && (
            <div style={{ padding: "16px 24px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, paddingBottom: 16, borderBottom: "1px solid #f0f0ec" }}>
                {[["의뢰일", r.requestDate], ["납기일", r.dueDate], ["완료일", r.completeDate]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13, fontWeight: 500, color: l === "납기일" && v ? "#D85A30" : "#333" }}>{v || "—"}</div></div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "16px 0", borderBottom: "1px solid #f0f0ec" }}>
                {[["브랜드 담당", r.brandManager], ["우주 담당", r.woojooManager]].map(([l, v]) => (
                  <div key={l}><div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 2 }}>{l}</div><div style={{ fontSize: 13 }}>{v || "—"}</div></div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}><div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>진행 내용</div><div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{r.content}</div></div>
              <div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>조치 / 다음 단계</div><div style={{ fontSize: 13, lineHeight: 1.7 }}>{r.nextStep || "—"}</div></div>
              {r.pendingReason && r.pendingReason !== "—" && (<div style={{ marginTop: 14 }}><div style={{ fontSize: 10, color: "#999", fontWeight: 600, marginBottom: 4 }}>펜딩 사유</div><div style={{ fontSize: 13 }}>{r.pendingReason}</div></div>)}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                <button style={S.btn()} onClick={() => { setModal(null); setTimeout(() => startEdit(r), 100); }}>수정</button>
                <button style={{ ...S.btn(), color: "#EF4444", borderColor: "#fcc" }} onClick={() => requestDelete(r.id)}>삭제</button>
              </div>
            </div>
          )}
          {detailTab === "memo" && (
            <div style={{ padding: "16px 24px", minHeight: 250 }}>
              {r.memos.length === 0 ? (
                <div style={{ textAlign: "center", color: "#bbb", padding: "40px 0" }}><div style={{ fontSize: 32, marginBottom: 8 }}>📝</div><div>아직 메모가 없습니다</div><div style={{ fontSize: 11, marginTop: 4 }}>아래에서 메모를 추가해보세요</div></div>
              ) : r.memos.map((m) => (
                <div key={m.id} style={{ background: "#f0f4f8", borderRadius: "12px 12px 12px 4px", padding: "10px 14px", marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontSize: 10, color: "#999" }}>{m.date}</div><button style={{ ...S.ib, fontSize: 12, opacity: 0.3 }} onClick={() => deleteMemo(m.id)}>✕</button></div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", marginTop: 2 }}>{m.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {detailTab === "memo" && (
          <div style={{ display: "flex", gap: 8, padding: "12px 20px", borderTop: "1px solid #e8e8e4", background: "#fafaf8", alignItems: "flex-end", flexShrink: 0 }}>
            <textarea value={memoText} onChange={(e) => setMemoText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addMemo(); } }} placeholder="메모 입력... (Shift+Enter: 줄바꿈)" style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 12, resize: "none", minHeight: 36, maxHeight: 100, background: "#fff", outline: "none" }} />
            <button onClick={addMemo} disabled={!memoText.trim()} style={{ ...S.btn("primary"), padding: "8px 14px", opacity: !memoText.trim() ? 0.4 : 1 }}>전송</button>
          </div>
        )}
      </div>
    </div>
  ); };

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: -0.5 }}>바이어 기록 카드</h1>
          <p style={{ fontSize: 12, color: "#999", margin: 0 }}>
            Buyer Record Card · 의뢰일 / 납기일 / 완료일 관리
            {lastSaved && <span style={{ marginLeft: 8, color: "#bbb" }}>· 마지막 저장: {lastSaved}</span>}
          </p>
        </div>
        {/* 유저 + 버튼 */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#999", fontWeight:600 }}>👤 {currentUser.name} ({currentUser.userId})</span>
          <button onClick={()=>setShowLogs(true)}
            style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #ddd",cursor:"pointer",fontSize:12,fontWeight:600,background:"white",color:"#555" }}>
            📋 변경 이력
          </button>
          <button onClick={onLogout}
            style={{ padding:"8px 12px",borderRadius:8,border:"1px solid #fcc",cursor:"pointer",fontSize:12,fontWeight:600,background:"white",color:"#EF4444" }}>
            로그아웃
          </button>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <button onClick={handleExcelDownload}
            style={{ padding:"8px 16px", borderRadius:"8px 0 0 8px", border:"none", cursor:"pointer",
              fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6,
              background:"#16A34A", color:"white" }}>
            <span>⬇️</span> 엑셀 저장
          </button>
          <button onClick={handleSave} disabled={syncStatus==="saving"||syncStatus==="loading"}
          style={{ padding:"8px 18px", borderRadius:8, border:"none", cursor: syncStatus==="saving"?"not-allowed":"pointer",
            fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:6,
            background: syncStatus==="saved"?"#1D9E75": syncStatus==="error"?"#EF4444":"#2C3E50",
            color:"white", opacity: syncStatus==="saving"?0.7:1, transition:"background .3s",
              borderRadius:"0 8px 8px 0" }}>
            {syncStatus==="loading" && <><span>⏳</span> 불러오는중</>}
            {syncStatus==="saving"  && <><span>⏳</span> 저장중...</>}
            {syncStatus==="saved"   && <><span>✅</span> 저장됨</>}
            {syncStatus==="error"   && <><span>❌</span> 오류</>}
            {syncStatus==="idle"    && <><span>☁️</span> 저장</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[{ l: "전체", v: stats.total, c: "#2C3E50" }, { l: "완료", v: stats.done, c: "#1D9E75" }, { l: "펜딩", v: stats.waiting, c: "#F59E0B" }, { l: "진행", v: stats.progress, c: "#378ADD" }].map(({ l, v, c }) => (
          <div key={l} style={{ textAlign: "center", padding: "12px 8px", background: "#fff", border: "1px solid #e8e8e4", borderRadius: 10, flex: 1 }}><div style={{ fontSize: 24, fontWeight: 700, color: c }}>{v}</div><div style={{ fontSize: 11, color: "#888" }}>{l}</div></div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "1px solid #e0e0dc", fontSize: 12, background: "#fff", outline: "none" }} placeholder="🔍 검색..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e0e0dc", fontSize: 12, background: "#fff" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}><option value="전체">상태: 전체</option>{STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select>
        <select style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e0e0dc", fontSize: 12, background: "#fff" }} value={filterManager} onChange={(e) => setFilterManager(e.target.value)}>{managers.map((m) => <option key={m} value={m}>{m === "전체" ? "담당자: 전체" : m}</option>)}</select>
        <button style={S.btn("primary")} onClick={() => { setForm({ ...EMPTY }); setModal("add"); }}>+ 새 기록</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", background: "#2C3E50", color: "#fff", fontWeight: 600, fontSize: 11, borderRadius: "12px 12px 0 0", minWidth: 900 }}>
          <div style={S.hCell(36)}>No</div><div style={S.hCell(70)}>담당자</div><div style={S.hCell(78)}>의뢰일</div><div style={S.hCell(78)}>납기일</div><div style={S.hCell(78)}>완료일</div><div style={S.hCell(100)}>브랜드</div><div style={S.hCell(80)}>브랜드담당</div><div style={S.hCellF}>진행 내용</div><div style={S.hCell(55)}>상태</div><div style={{ ...S.hCellF, maxWidth: 150 }}>다음 단계</div><div style={S.hCell(110)}>최종수정</div><div style={S.hCell(70)}>관리</div>
        </div>
        {filtered.length === 0 ? (<div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: "1px solid #e8e8e4", textAlign: "center", padding: 40, color: "#999" }}>검색 결과가 없습니다</div>) : (
          <div style={{ background: "#fff", borderRadius: "0 0 12px 12px", border: "1px solid #e8e8e4", overflow: "hidden", minWidth: 900 }}>
            {filtered.map((r, idx) => (
              <div key={r.id} style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #f0f0ec", cursor: "pointer", background: idx % 2 !== 0 ? "#fafaf8" : "#fff" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f0f4f8"} onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 !== 0 ? "#fafaf8" : "#fff"}>
                <div style={S.cell(36)} onClick={() => openDetail(r)}><span style={{ color: "#aaa", fontWeight: 600 }}>{r.id}</span></div>
                <div style={S.cell(70)} onClick={() => openDetail(r)}><span style={{ fontSize: 11, color: "#2C3E50", fontWeight: 600 }}>{r.woojooManager || "—"}</span></div>
                <div style={S.cell(78)} onClick={() => openDetail(r)}><span style={{ fontSize: 11, color: "#666" }}>{r.requestDate || "—"}</span></div>
                <div style={S.cell(78)} onClick={() => openDetail(r)}><span style={{ fontSize: 11, color: r.dueDate ? "#D85A30" : "#ccc", fontWeight: r.dueDate ? 600 : 400 }}>{r.dueDate || "—"}</span></div>
                <div style={S.cell(78)} onClick={() => openDetail(r)}><span style={{ fontSize: 11, color: "#666" }}>{r.completeDate || "—"}</span></div>
                <div style={S.cell(100)} onClick={() => openDetail(r)}><span style={{ fontWeight: 600, color: "#2C3E50", fontSize: 12 }}>{r.brand}</span></div>
                <div style={S.cell(80)} onClick={() => openDetail(r)}><span style={{ fontSize: 12 }}>{r.brandManager || "—"}</span></div>
                <div style={S.cellF} onClick={() => openDetail(r)}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.content}</span></div>
                <div style={S.cell(55)}><select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)} onClick={(e) => e.stopPropagation()} style={{ border: "none", background: "transparent", fontSize: 11, fontWeight: 600, color: STATUS_COLORS[r.status], cursor: "pointer", outline: "none", width: "100%" }}>{STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select></div>
                <div style={{ ...S.cellF, maxWidth: 150 }} onClick={() => openDetail(r)}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11, color: "#666" }}>{r.nextStep || "—"}</span></div>
                <div style={S.cell(110)} onClick={() => openDetail(r)}><span style={{ fontSize:10, color:"#aaa" }}>{r.updatedAt || "—"}</span></div>
                <div style={S.cell(70)}>
                  <button style={{ ...S.ib, position: "relative" }} onClick={(e) => { e.stopPropagation(); openDetail(r, "memo"); }}>📝{r.memos.length > 0 && <span style={{ position: "absolute", top: -4, right: -6, background: "#EF4444", color: "#fff", borderRadius: 10, padding: "0 4px", fontSize: 9, fontWeight: 700, minWidth: 14, textAlign: "center" }}>{r.memos.length}</span>}</button>
                  <button style={S.ib} onClick={(e) => { e.stopPropagation(); startEdit(r); }}>✏️</button>
                  <button style={S.ib} onClick={(e) => { e.stopPropagation(); requestDelete(r.id); }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 16 }}>총 {filtered.length}건{filtered.length !== records.length ? ` (전체 ${records.length}건 중)` : ""}</div>

      {/* Modals */}
      {modal === "add" && renderForm(false)}
      {modal === "edit" && renderForm(true)}
      {modal === "detail" && renderDetail()}

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ background:"white",borderRadius:16,padding:"28px 28px 24px",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.25)" }}>
            <div style={{ width:48,height:48,borderRadius:"50%",background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22 }}>🗑</div>
            <div style={{ textAlign:"center",marginBottom:8 }}>
              <div style={{ fontSize:16,fontWeight:700,color:"#1a1a1a",marginBottom:6 }}>기록 삭제</div>
              <div style={{ fontSize:13,color:"#64748B",lineHeight:1.6 }}>
                <span style={{ fontWeight:600,color:"#334155" }}>'{confirmDelete.name}'</span>을 삭제할까요?
              </div>
              <div style={{ fontSize:12,color:"#94A3B8",marginTop:8 }}>삭제 후 5초 이내에 되돌릴 수 있어요.</div>
            </div>
            <div style={{ display:"flex",gap:8,marginTop:20 }}>
              <button onClick={()=>setConfirmDelete(null)} style={{ flex:1,padding:"10px",borderRadius:8,border:"1px solid #ddd",background:"white",cursor:"pointer",fontSize:13,fontWeight:600,color:"#666" }}>취소</button>
              <button onClick={handleDelete} style={{ flex:1,padding:"10px",borderRadius:8,border:"none",background:"#EF4444",color:"white",cursor:"pointer",fontSize:13,fontWeight:700 }}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 되돌리기 토스트 */}
      {undoNotice && (
        <div style={{ position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",borderRadius:12,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,zIndex:9999,boxShadow:"0 8px 32px rgba(0,0,0,0.3)",minWidth:300 }}>
          <span style={{ fontSize:13,color:"white",fontWeight:500 }}>{undoNotice.message}</span>
          <button onClick={handleUndo} style={{ background:"#378ADD",border:"none",borderRadius:7,padding:"5px 14px",cursor:"pointer",fontSize:13,fontWeight:700,color:"white",flexShrink:0 }}>되돌리기</button>
          <button onClick={()=>{ clearTimeout(undoNotice.timeoutId); setUndoNotice(null); }} style={{ background:"none",border:"none",cursor:"pointer",color:"#666",fontSize:16,padding:0,lineHeight:1 }}>✕</button>
        </div>
      )}

      {/* 일반 토스트 */}
      {/* 변경 이력 모달 */}
      {showLogs && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <div style={{ background:"white",borderRadius:16,width:600,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ padding:"20px 24px",borderBottom:"1px solid #e8e8e4",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0 }}>
              <div>
                <div style={{ fontSize:16,fontWeight:700,color:"#1a1a1a" }}>📋 변경 이력</div>
                <div style={{ fontSize:12,color:"#999",marginTop:2 }}>최근 100건</div>
              </div>
              <button onClick={()=>setShowLogs(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#999" }}>✕</button>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:"16px 24px" }}>
              {logs.length===0 ? (
                <div style={{ textAlign:"center",color:"#bbb",padding:"40px 0" }}>
                  <div style={{ fontSize:28,marginBottom:8 }}>📭</div>
                  <div>아직 변경 이력이 없어요</div>
                </div>
              ) : logs.map((log,i) => (
                <div key={i} style={{ display:"flex",gap:12,padding:"10px 0",borderBottom:"1px solid #f5f5f0",alignItems:"flex-start" }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:"#2C3E50",marginTop:6,flexShrink:0 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                      <span style={{ fontSize:12,fontWeight:700,color:"#1a1a1a" }}>{log.userName}</span>
                      <span style={{ fontSize:11,color:"#aaa" }}>({log.userId})</span>
                      <span style={{ padding:"2px 8px",borderRadius:6,background:"#f0f4f8",color:"#2C3E50",fontSize:11,fontWeight:600 }}>{log.action}</span>
                    </div>
                    <div style={{ fontSize:12,color:"#666",marginTop:2 }}>{log.target}</div>
                    <div style={{ fontSize:11,color:"#ccc",marginTop:2 }}>{log.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding:"14px 24px",borderTop:"1px solid #e8e8e4",flexShrink:0 }}>
              <button onClick={()=>{ fetch("/api/logs").then(r=>r.json()).then(d=>setLogs(d.logs||[])); }}
                style={{ padding:"8px 16px",borderRadius:8,border:"1px solid #ddd",background:"white",cursor:"pointer",fontSize:13,color:"#666" }}>
                🔄 새로고침
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (<div style={{ position: "fixed", bottom: 24, right: 24, background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, padding: "10px 18px", fontSize: 13, boxShadow: "0 2px 8px rgba(0,0,0,0.1)", zIndex: 9999 }}>{toast}</div>)}
    </div>
  );
}
