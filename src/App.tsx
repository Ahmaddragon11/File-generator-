import React, { useState, useEffect } from "react";
import { 
  FileCode, 
  FileText, 
  FileAudio, 
  FileVideo, 
  Image as ImageIcon, 
  FileArchive, 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  HardDrive, 
  Download, 
  Sparkles, 
  RefreshCw, 
  FileQuestion, 
  Info, 
  Layers, 
  Share2, 
  AlertCircle,
  FileSpreadsheet,
  Database,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Settings,
  QrCode,
  Edit3,
  Zap,
  ArrowRight,
  Gauge,
  Activity,
  UserCheck,
  Smartphone
} from "lucide-react";
import { FileMetadata } from "./types";

export default function App() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Administrative / Owner states
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generator form states
  const [fileName, setFileName] = useState("ملف_اختبار_الشبكة_السريع");
  const [selectedExt, setSelectedExt] = useState("pdf");
  const [customExt, setCustomExt] = useState("");
  const [isCustomExt, setIsCustomExt] = useState(false);
  const [sizeInput, setSizeInput] = useState<string>("10");
  const [unit, setUnit] = useState<'B' | 'KB' | 'MB' | 'GB'>('MB');
  const [type, setType] = useState<'zeros' | 'random' | 'custom'>('zeros');
  const [customText, setCustomText] = useState("منصة توليد الملفات - هذا النص يتكرر لاختبار حجم وبنية الملفات ");
  
  // Advanced variables
  const [filePassword, setFilePassword] = useState("");
  const [maxDownloads, setMaxDownloads] = useState("");

  // Editing mode states
  const [editingFile, setEditingFile] = useState<FileMetadata | null>(null);
  const [editName, setEditName] = useState("");
  const [editExt, setEditExt] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editMaxDownloads, setEditMaxDownloads] = useState("");

  // Search, Filter & sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"latest" | "size_desc" | "size_asc" | "downloads">("latest");

  // In-App Browser Speed Test State
  const [speedTestFile, setSpeedTestFile] = useState<FileMetadata | null>(null);
  const [speedTestProgress, setSpeedTestProgress] = useState(0);
  const [speedTestRate, setSpeedTestRate] = useState(0);
  const [speedTestRateAverage, setSpeedTestRateAverage] = useState(0);
  const [speedTestMegabytes, setSpeedTestMegabytes] = useState(0);
  const [speedTestStatus, setSpeedTestStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [speedTestPassword, setSpeedTestPassword] = useState("");
  const [speedSamples, setSpeedSamples] = useState<number[]>([]);

  // Qr code overlay
  const [qrFile, setQrFile] = useState<FileMetadata | null>(null);

  // Telemetry detail tab selector (which file history is currently active)
  const [activeTelemetryFile, setActiveTelemetryFile] = useState<string | null>(null);

  // Recipient Shared View State
  const [recipientFileId, setRecipientFileId] = useState<string | null>(null);
  const [recipientFile, setRecipientFile] = useState<FileMetadata | null>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientPassword, setRecipientPassword] = useState("");
  const [recipientVerified, setRecipientVerified] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  // Notifications
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Parse URL on load to check if recipient query parameter is set (?id=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("fileId");
    if (id) {
      setRecipientFileId(id);
      loadRecipientFile(id);
    } else {
      fetchFiles();
    }
  }, []);

  // Show dynamic toast helper
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Fetch file inventory (Owner)
  const fetchFiles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/files");
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        showToast("فشل استرداد بيانات السجل من السيرفر", "error");
      }
    } catch (error) {
      console.error("Fetch files error:", error);
      showToast("فشل الاتصال بسيرفر الملفات التفاعلي", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // 2. Fetch single file for recipient download portal
  const loadRecipientFile = async (id: string) => {
    setRecipientLoading(true);
    setRecipientError(null);
    try {
      const response = await fetch(`/api/files/${id}`);
      if (response.ok) {
        const fileMetadata: FileMetadata = await response.json();
        setRecipientFile(fileMetadata);
        // If there is no password, unlock right away
        if (!fileMetadata.password && !(fileMetadata as any).passwordProtected) {
          setRecipientVerified(true);
        }
      } else {
        if (response.status === 404) {
          setRecipientError("الملف غير متوفر حالياً أو ربما تم حذفه أو تدميره ذاتياً لتجاوز مرات التنزيل.");
        } else {
          setRecipientError("فشل في قراءة تفاصيل الملف من خلال الرابط.");
        }
      }
    } catch (error) {
      console.error("Load single file error:", error);
      setRecipientError("حدث خطأ في شبكة الاتصال أثناء جلب مواصفات الرابط.");
    } finally {
      setRecipientLoading(false);
    }
  };

  // 3. Verify password for shared recipient portal
  const handleVerifyRecipientPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientFileId) return;

    try {
      const response = await fetch(`/api/verify-password/${recipientFileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: recipientPassword })
      });

      if (response.ok) {
        const res = await response.json();
        if (res.valid) {
          setRecipientVerified(true);
          showToast("تم التحقق من كلمة المرور وتحرير رابط التنزيل المباشر!", "success");
        } else {
          showToast("كلمة المرور غير صحيحة، يرجى المحاولة مجدداً.", "error");
        }
      } else {
        showToast("خطأ أثناء تواصل المتصفح مع بوابة الحماية", "error");
      }
    } catch (e) {
      showToast("عذراً، تعذر اختبار كلمة المرور", "error");
    }
  };

  // Handle URL Copying
  const handleCopyLink = async (fileId: string) => {
    // Generates a link pointing to the Recipient Landing Portal inside this app
    const url = `${window.location.protocol}//${window.location.host}/?id=${fileId}`;
    let success = false;
    
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        success = true;
      }
    } catch (e) {
      console.warn("Clipboard API failed, running textbox fallback...", e);
    }

    if (!success) {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        success = document.execCommand("copy");
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }

    if (success) {
      setCopiedId(fileId);
      showToast("تم نسخ رابط بوابة الاستلام التفاعلية الخاصة بهذا الملف! يمكنك إرساله للآخرين الآن.", "success");
      setTimeout(() => setCopiedId(null), 3000);
      fetchFiles(true);
    } else {
      showToast("تعذر نسخ الرابط تلقائياً، يرجى مشاركته كعنوان ويب طبيعي.", "error");
    }
  };

  // Handle Raw Direct Download Url Copying
  const handleCopyDirectLink = async (fileId: string, passwordValue?: string) => {
    let url = `${window.location.protocol}//${window.location.host}/api/download/${fileId}`;
    if (passwordValue) {
      url += `?password=${encodeURIComponent(passwordValue)}`;
    }
    
    let success = false;
    try {
      await navigator.clipboard.writeText(url);
      success = true;
    } catch (e) {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      success = document.execCommand("copy");
      document.body.removeChild(input);
    }

    if (success) {
      showToast("تم نسخ الرابط المباشر (Direct Stream URL) الصالح للاستخدام مباشرة في IDM أو curl!", "success");
    }
  };

  // Convert raw values back to slider/inputs
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 بايت";
    const k = 1024;
    const sizes = ["بايت (Byte)", "كيلوبايت (KB)", "ميغابايت (MB)", "جيجابايت (GB)"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${val} ${sizes[i]}`;
  };

  // Helper calculating real bytes
  const getCurrentSizeBytes = (): number => {
    const sizeVal = parseFloat(sizeInput) || 0;
    if (sizeVal <= 0) return 0;
    const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    return Math.round(sizeVal * multipliers[unit]);
  };

  // 4. Create new simulated file Entry
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalExt = isCustomExt ? customExt.trim() : selectedExt;
    if (!finalExt) {
      showToast("الرجاء تحديد نوع أو كتابة امتداد الملف", "error");
      return;
    }

    if (!fileName.trim()) {
      showToast("الرجاء إدخال اسم مميز للملف", "error");
      return;
    }

    const calculatedSize = getCurrentSizeBytes();
    if (calculatedSize <= 0) {
      showToast("حجم الملف يجب أن يكون أكبر من 0", "error");
      return;
    }

    // Limit check for node memory chunk safety
    if (calculatedSize > 4 * 1024 * 1024 * 1024) {
      showToast("تجاوزت الحد الأقصى الآمن للمولد وهو 4 جيجابايت لتجنيب التحميل الفشل", "error");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          extension: finalExt,
          size: calculatedSize,
          unit,
          type,
          customText: type === "custom" ? customText : "",
          maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
          password: filePassword || undefined
        })
      });

      if (response.ok) {
        const fileObj = await response.json();
        showToast(`تم توليد الملف الحفظي "${fileObj.name}.${fileObj.extension}" بنجاح!`, "success");
        
        // Reset Inputs
        setFileName("ملف_اختبار_الشبكة_السريع");
        setFilePassword("");
        setMaxDownloads("");
        setShowAdvanced(false);
        fetchFiles(true);
      } else {
        const payload = await response.json();
        showToast(payload.error || "خطأ أثناء إنشاء الملف", "error");
      }
    } catch (e) {
      showToast("تعذر التخاطب مع السيرفر السحابي لتوليد الملف", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Save changes from editing modal dialog (Calls PUT Api)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFile) return;

    try {
      const response = await fetch(`/api/files/${editingFile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          extension: editExt,
          maxDownloads: editMaxDownloads ? Number(editMaxDownloads) : null,
          password: editPassword || null
        })
      });

      if (response.ok) {
        showToast("تم تحديث مواصفات وإعدادات الملف بنجاح في السيرفر!", "success");
        setEditingFile(null);
        fetchFiles(true);
      } else {
        showToast("فشل في حفظ التحديثات، تحقق من الاتصال", "error");
      }
    } catch (err) {
      showToast("حدث خطأ أثناء الاتصال بالخادم لحفظ التعديلات", "error");
    }
  };

  // Open Edit Dialog
  const startEditing = (file: FileMetadata) => {
    setEditingFile(file);
    setEditName(file.name);
    setEditExt(file.extension);
    setEditPassword(file.password || "");
    setEditMaxDownloads(file.maxDownloads ? String(file.maxDownloads) : "");
  };

  // 6. Delete file permanently
  const handleDeleteFile = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ تحذير: هل تريد إزالة ملف "${name}" وإبطال رابط تنزيله تماماً؟ لن يتاح لأي شخص مع الرابط تحميل البيانات مجدداً.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (response.ok) {
        showToast("تم إتلاف الملف وحذفه نهائياً من قاعدة البيانات والسيرفر", "success");
        setFiles(prev => prev.filter(f => f.id !== id));
        if (activeTelemetryFile === id) setActiveTelemetryFile(null);
      } else {
        showToast("أخفق السيرفر في حذف مدخلة الملف", "error");
      }
    } catch (error) {
      showToast("خطأ فادح في التواصل مع السيرفر أثناء الحذف", "error");
    }
  };

  // Real browser-driven download speedtest with readable response streams
  const handleRunSpeedTest = async (file: FileMetadata, customPass?: string) => {
    setSpeedTestFile(file);
    setSpeedTestStatus('running');
    setSpeedTestProgress(0);
    setSpeedTestRate(0);
    setSpeedTestMegabytes(0);
    setSpeedSamples([]);

    let url = `/api/download/${file.id}`;
    const key = customPass || speedTestPassword || file.password;
    if (key) {
      url += `?password=${encodeURIComponent(key)}`;
    }

    try {
      const startTime = performance.now();
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          showToast("الملف محمي برمز مرور، يرجى تعبئته لبدء الفحص", "error");
          setSpeedTestStatus('error');
          return;
        }
        throw new Error("فشل الرد من الخادم لتبادل البيانات");
      }

      if (!response.body) {
        throw new Error("قالب القراءة من البث المباشر غير مدعوم في متصفحك حالياً.");
      }

      const reader = response.body.getReader();
      let chunkCount = 0;
      let totalReceived = 0;
      const totalEstimated = file.size;

      let lastSampleTime = startTime;
      let lastSampleBytes = 0;
      const collectedSamples: number[] = [];

      while(true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        totalReceived += value.length;
        setSpeedTestMegabytes(Number((totalReceived / (1024 * 1024)).toFixed(1)));

        // Increment sample calculations periodically
        const currentMs = performance.now();
        const durationFromLastMs = currentMs - lastSampleTime;

        if (durationFromLastMs >= 120) {
          const deltaBytes = totalReceived - lastSampleBytes;
          // compute Mbps: (bytes * 8) / seconds / 1,000,000
          const mbps = (deltaBytes * 8) / (durationFromLastMs / 1000) / 1000000;
          const cappedMbps = parseFloat(mbps.toFixed(1));
          
          if (cappedMbps > 0) {
            setSpeedTestRate(Math.round(cappedMbps));
            collectedSamples.push(cappedMbps);
            setSpeedSamples(prev => [...prev.slice(-15), Math.round(cappedMbps)]);
          }

          lastSampleTime = currentMs;
          lastSampleBytes = totalReceived;
        }

        const percentage = totalEstimated ? Math.min(100, Math.round((totalReceived / totalEstimated) * 100)) : 50;
        setSpeedTestProgress(percentage);
      }

      const finalMs = performance.now();
      const totalDurationSecs = (finalMs - startTime) / 1000;
      const finalAvgMbps = (totalReceived * 8) / totalDurationSecs / 1000000;

      setSpeedTestRateAverage(parseFloat(finalAvgMbps.toFixed(1)));
      setSpeedTestProgress(100);
      setSpeedTestStatus('completed');
      showToast("تم الانتهاء من فحص واختبار سرعة البث والشبكة بالكامل بنجاح!", "success");
      
      // Sync list silently to increment counts
      fetchFiles(true);

    } catch (e) {
      console.error(e);
      setSpeedTestStatus('error');
      showToast("انقطع البث أو تعذر استكمال فحص سرعة التنزيل بسبب الشبكة", "error");
    }
  };

  // Presets applicator
  const applyPreset = (p: { name: string; ext: string; size: number; unit: 'B' | 'KB' | 'MB' | 'GB'; type: 'zeros' | 'random' | 'custom' }) => {
    setFileName(p.name);
    setIsCustomExt(false);
    setSelectedExt(p.ext);
    setSizeInput(String(p.size));
    setUnit(p.unit);
    setType(p.type);
    showToast(`تم استيراد مواصفات القالب: ${p.name}.${p.ext}`, "info");
  };

  // Get elegant file icon
  const getFileIcon = (ext: string) => {
    const low = ext.toLowerCase();
    if (["pdf", "docx", "doc", "txt", "xlsx", "xls", "pptx", "rtf", "csv"].includes(low)) {
      return <FileText className="w-8 h-8 text-indigo-500" />;
    }
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(low)) {
      return <ImageIcon className="w-8 h-8 text-amber-500" />;
    }
    if (["mp3", "wav", "ogg", "flac"].includes(low)) {
      return <FileAudio className="w-8 h-8 text-emerald-500" />;
    }
    if (["mp4", "mkv", "avi", "mov", "webm"].includes(low)) {
      return <FileVideo className="w-8 h-8 text-pink-500" />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(low)) {
      return <FileArchive className="w-8 h-8 text-purple-500" />;
    }
    return <FileCode className="w-8 h-8 text-cyan-500" />;
  };

  const getFileCategory = (ext: string): string => {
    const low = ext.toLowerCase();
    if (["pdf", "docx", "doc", "txt", "xlsx", "xls", "pptx", "rtf", "json", "html", "csv"].includes(low)) return "docs";
    if (["jpg", "jpeg", "png", "gif", "svg", "webp", "mp3", "wav", "mp4", "mkv", "mov"].includes(low)) return "media";
    if (["zip", "rar", "7z", "tar", "gz"].includes(low)) return "archives";
    return "system";
  };

  // Filtering files array
  const filteredFiles = files.filter(f => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const matchesSearch = `${f.name}.${f.extension}`.toLowerCase().includes(cleanQuery) || f.id.toLowerCase().includes(cleanQuery);
    if (categoryFilter === "all") return matchesSearch;
    return matchesSearch && getFileCategory(f.extension) === categoryFilter;
  });

  // Sorting files array
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === "size_desc") {
      return b.size - a.size;
    }
    if (sortBy === "size_asc") {
      return a.size - b.size;
    }
    if (sortBy === "downloads") {
      return (b.downloadCount || 0) - (a.downloadCount || 0);
    }
    return 0;
  });

  const totalFilesCount = files.length;
  const totalDownloads = files.reduce((sum, f) => sum + (f.downloadCount || 0), 0);
  const totalSimulatedBytes = files.reduce((sum, f) => sum + f.size, 0);

  // Determine if the file has a near self-destruction state
  const isNearDestruct = (f: FileMetadata) => {
    if (!f.maxDownloads) return false;
    const remaining = f.maxDownloads - f.downloadCount;
    return remaining > 0 && remaining <= 2;
  };

  // Recipient / Shared View component
  if (recipientFileId) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white font-sans" id="recipient-full-layout">
        
        {/* Glow backdrop decorative bubbles */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand bar */}
        <header className="border-b border-white/5 py-4 px-6 bg-slate-950/40 backdrop-blur" id="recipient-header">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md">
                ⚡
              </div>
              <span className="font-extrabold text-sm tracking-tight">بوابة التحميل المباشرة الفورية</span>
            </div>
            <a 
              href="/" 
              onClick={() => {
                window.history.pushState({}, "", "/");
                setRecipientFileId(null);
                setRecipientFile(null);
                fetchFiles();
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 transition"
              id="back-to-console-link"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>الذهاب للمنصة والمولد الرئيسي</span>
            </a>
          </div>
        </header>

        {/* Portal Body */}
        <main className="flex-1 max-w-xl mx-auto w-full px-4 py-16 flex flex-col justify-center" id="recipient-content">
          {recipientLoading ? (
            <div className="bg-slate-950/50 border border-slate-800 p-12 rounded-3xl text-center space-y-4" id="recipient-loading-card">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mx-auto animate-bounce" />
              <h3 className="font-bold text-lg">جاري استيراد بنود الملف الآمن...</h3>
              <p className="text-slate-400 text-xs">نتصل الآن بخوادم البث المباشر الفوري</p>
            </div>
          ) : recipientError ? (
            <div className="bg-slate-950/50 border border-rose-950 p-8 rounded-3xl text-center space-y-5" id="recipient-error-card">
              <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-bold text-lg text-rose-300">أخفق رابط التحميل أو انتهت صلاحيته</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">{recipientError}</p>
              <button
                onClick={() => {
                  window.history.pushState({}, "", "/");
                  setRecipientFileId(null);
                  setRecipientFile(null);
                  fetchFiles();
                }}
                className="mt-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
                id="back-btn-from-error"
              >
                إنشاء ملفك المخصص الآن مجاناً 🚀
              </button>
            </div>
          ) : recipientFile ? (
            <div className="bg-slate-950/70 border border-white/5 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur" id="recipient-download-portal">
              
              {/* Card visual detail header */}
              <div className="text-center space-y-3 pb-6 border-b border-white/5">
                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 mx-auto flex items-center justify-center shadow-inner group transition-transform group-hover:scale-105">
                  {getFileIcon(recipientFile.extension)}
                </div>
                <div>
                  <h2 className="font-black text-xl text-white break-all">{recipientFile.name}.{recipientFile.extension}</h2>
                  <p className="text-slate-500 text-xs font-mono mt-1">ID: {recipientFile.id}</p>
                </div>

                <div className="inline-flex gap-2 items-center bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-500/20">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span className="font-mono">{formatBytes(recipientFile.size)}</span>
                </div>
              </div>

              {/* Password Protection Barrier if not verified */}
              {!recipientVerified ? (
                <form onSubmit={handleVerifyRecipientPassword} className="space-y-4 pt-4" id="recipient-password-gate">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 text-xs flex gap-2.5">
                    <Lock className="w-5 h-5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-bold">محتوى ملف مشفر ومحمي بكلمة مرور</p>
                      <p className="text-slate-400">لقد قام صاحب الملف بحماية رابط الشحن هذا، يرجى تزويد رمز المرور لفتح قفل التحميل والبث المباشر.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="rec-pass-input" className="block text-xs font-bold text-slate-400">أدخل كلمة مرور الملف المطلوبة:</label>
                    <input
                      id="rec-pass-input"
                      type="password"
                      value={recipientPassword}
                      onChange={(e) => setRecipientPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 text-center font-mono text-sm tracking-widest focus:outline-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition active:scale-95"
                    id="rec-lock-submit-btn"
                  >
                    فك قفل هذا الملف الآن 🔓
                  </button>
                </form>
              ) : (
                /* Unlocked Actions Portal */
                <div className="space-y-6 pt-2 animate-fadeIn" id="recipient-unlocked-panel">
                  
                  {/* Limits and diagnostics header */}
                  <div className="grid grid-cols-2 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 text-xs text-slate-400">
                    <div>
                      <span>مرات التنزيل السابقة:</span>
                      <p className="font-bold text-white text-sm mt-1">{recipientFile.downloadCount} تنزيلات</p>
                    </div>
                    <div>
                      <span>تدمير ذاتي مبرمج:</span>
                      <p className="font-bold text-amber-400 text-sm mt-1">
                        {recipientFile.maxDownloads ? `${recipientFile.maxDownloads} تنزيل أقصى` : "غير محدود ♾️"}
                      </p>
                    </div>
                  </div>

                  {recipientFile.maxDownloads && (
                    <div className="bg-slate-900 border border-amber-500/30 text-[11px] p-3 text-amber-200 rounded-xl flex items-center justify-between">
                      <span>تنبيه: سيتم إتلاف هذا الملف تلقائياً فوراً بمجرد تخطيه الحد الأقصى للتنزيلات.</span>
                      <span className="font-bold text-white uppercase bg-amber-500/25 px-1.5 py-0.5 rounded">
                        المتبقي: {Math.max(0, recipientFile.maxDownloads - recipientFile.downloadCount)} تنزيل
                      </span>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="space-y-3" id="recipient-cta-buttons">
                    
                    {/* Primary direct download trigger */}
                    <a
                      href={`/api/download/${recipientFile.id}${recipientPassword ? `?password=${encodeURIComponent(recipientPassword)}` : ""}`}
                      onClick={() => {
                        // silently reload file state to increment visual counter in a second
                        setTimeout(() => recipientFileId && loadRecipientFile(recipientFileId), 1500);
                      }}
                      className="w-full block bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-center py-4 rounded-xl shadow-lg shadow-indigo-600/10 active:scale-95 transition flex items-center justify-center gap-2 text-base"
                      id="recipient-direct-dl-btn"
                    >
                      <Download className="w-5 h-5 animate-bounce" />
                      <span>بدء التحميل المباشر للملف مجاناً ⬇️</span>
                    </a>

                    {/* Integrated dynamic browser speed test toggle */}
                    <button
                      type="button"
                      onClick={() => handleRunSpeedTest(recipientFile, recipientPassword)}
                      disabled={speedTestStatus === 'running'}
                      className="w-full border border-white/10 hover:border-indigo-500 hover:bg-indigo-500/10 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      id="recipient-speedtest-btn"
                    >
                      <Gauge className="w-4 h-4 text-indigo-400" />
                      <span>بث تجريبي واختبار سرعة التحميل الحية ⏱️</span>
                    </button>
                    
                  </div>

                  {/* In-App Speed Test Area rendered inside the card widget */}
                  {speedTestFile && speedTestFile.id === recipientFile.id && (
                    <div className="bg-slate-900 rounded-2xl p-5 border border-white/10 space-y-4 animate-fadeIn" id="recipient-in-card-speedtest">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold text-white">اختبار سرعة التنزيل المباشر بالمتصفح:</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          speedTestStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                          speedTestStatus === 'running' ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {speedTestStatus === 'completed' ? 'تم الاختبار' :
                           speedTestStatus === 'running' ? 'جاري البث والقياس...' : 'حدث حظر'}
                        </span>
                      </div>

                      {/* Speed gauge metrics */}
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block pb-1">السرعة اللحظية في هذه الثانية</span>
                          <span className="text-2xl font-black text-indigo-400 font-mono">
                            {speedTestStatus === 'running' ? speedTestRate : '--'} <span className="text-xs text-white">Mbps</span>
                          </span>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block pb-1">متوسط سرعة اتصالاتك الإجمالية</span>
                          <span className="text-2xl font-black text-emerald-400 font-mono">
                            {speedTestRateAverage > 0 ? speedTestRateAverage : '--'} <span className="text-xs text-white">Mbps</span>
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic progressive indicator bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>التحميل التراكمي: {speedTestMegabytes} MB</span>
                          <span className="font-mono">{speedTestProgress}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full transition-all duration-150"
                            style={{ width: `${speedTestProgress}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Advanced summary output rating */}
                      {speedTestStatus === 'completed' && (
                        <div className="bg-slate-950 p-3 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1.5 text-right font-light">
                          <p className="font-bold text-white">📋 تقرير جودة استهلاك وعرض النطاق الترددي للشبكة:</p>
                          <p>• إجمالي البيانات المستهلكة للاختبار: <span className="font-bold text-white">{formatBytes(recipientFile.size)}</span></p>
                          <p>• سرعة خط الإنترنت المقدرة: <span className="font-bold text-emerald-400">{speedTestRateAverage} ميجابت/ثانية</span></p>
                          <p>• توصية الخادم: {speedTestRateAverage > 75 ? "سرعة خارقة، اتصال الألياف مميز لدعم عرض 4K والبث بسلاسة." : "سيرفر البث يخدمك بشكل مستقر وكافٍ لمختلف الأحجام والألعاب."}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code trigger for quick mobile access */}
                  <div className="pt-2 border-t border-white/5 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQrFile(recipientFile)}
                      className="text-xs text-slate-400 hover:text-white transition flex items-center gap-2"
                      id="recipient-show-qr-btn"
                    >
                      <QrCode className="w-4 h-4 text-slate-500" />
                      <span>عرض رمز QR للمسح من الموبايل أو التبلت</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : null}
        </main>

        {/* Footer info lockup */}
        <footer className="border-t border-white/5 py-6 px-4 bg-slate-950 text-center space-y-2" id="recipient-footer">
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            تم تشفير وبث هذا الرابط بواسطة مولد الملفات اللحظي. لا نشغل مساحات فعلية في التخزين، مما يبقي روابط المشاركة نشطة بكفاءة طاقة قصوى وصديقة للبيئة السحابية.
          </p>
          <div className="text-[10px] text-slate-650">
            مولد البيانات الفوري والسيرفر السحابي © {new Date().getFullYear()}
          </div>
        </footer>

        {/* Floating QR Modal overlay for Recipient portal code */}
        {qrFile && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-xs w-full text-center space-y-4">
              <h4 className="font-bold text-sm text-white">امسح الرمز ضوئياً للتحميل من الهاتف:</h4>
              <div className="bg-white p-3 rounded-xl inline-block">
                <img 
                  referrerPolicy="no-referrer"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.protocol}//${window.location.host}/?id=${qrFile.id}`)}`}
                  alt="QR Code"
                  className="w-44 h-44"
                />
              </div>
              <p className="text-xs text-slate-400">مثالي لمشاركة الملف مع هواتف الأندرويد، الآيفون، والأقراص اللوحية.</p>
              <button 
                onClick={() => setQrFile(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        )}

      </div>
    );
  }

  // Primary Workspace View (Admin Dashboard & Generator console)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" id="owner-console-layout">
      
      {/* Dynamic top active floating UI alert toast */}
      {toast && (
        <div 
          className={`fixed top-6 left-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl border max-w-md animate-bounce transform text-sm font-semibold transition-all duration-300 ${
            toast.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-indigo-50 border-indigo-200 text-indigo-800"
          }`}
          id="system-toast-alert"
        >
          {toast.type === "success" && <Check className="w-5 h-5 text-emerald-600 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          {toast.type === "info" && <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />}
          <div className="flex-1 text-right">{toast.message}</div>
        </div>
      )}

      {/* Styled glowing header with detailed microcopy details */}
      <header className="relative bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white overflow-hidden py-12 border-b border-indigo-900/30" id="main-admin-header">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6" id="header-inner">
            <div className="space-y-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>بروتوكول البث والتدفق بالبايتات الفورية ⚡</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight" id="main-title">
                مولد ومسؤول الملفات <span className="text-transparent bg-clip-text bg-gradient-to-l from-indigo-300 to-amber-200">بأي حجم وصيغة</span>
              </h1>
              <p className="text-slate-300 max-w-2xl text-sm leading-relaxed font-light">
                أنشئ ملفات افتراضية بدقة بايت متناهية لأي صيغة تريدها مع روابط تنزيل مباشرة سريعة وصالحة للمشاركة الفورية. تحكّم في الخواص المتقدمة لحماية روابط التنزيل بكلمة مرور أو مبرر التدمير الذاتي التلقائي فور التحميل.
              </p>
            </div>

            {/* Dashboard counters lockup */}
            <div className="grid grid-cols-3 gap-3 md:w-96 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur" id="stats-board">
              <div className="text-center p-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">سجل الروابط</p>
                <p className="text-xl md:text-2xl font-black text-white mt-1 font-mono">{totalFilesCount}</p>
              </div>
              <div className="text-center p-2 border-x border-white/10">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">التنزيلات النشطة</p>
                <p className="text-xl md:text-2xl font-black text-amber-300 mt-1 font-mono">{totalDownloads}</p>
              </div>
              <div className="text-center p-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">حجم التدفق الكلي</p>
                <p className="text-sm md:text-base font-black text-indigo-300 mt-2 truncate font-mono" title={formatBytes(totalSimulatedBytes)}>
                  {formatBytes(totalSimulatedBytes).split(" ")[0]} <span className="text-[10px] block text-slate-400">{formatBytes(totalSimulatedBytes).split(" ")[1]}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout Column */}
      <main className="max-w-6xl mx-auto px-4 py-8" id="console-grid">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Dashboard control form side */}
          <div className="lg:col-span-5 space-y-6" id="owner-creator-column">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Plus className="w-5 h-5 animate-pulse" />
                  </div>
                  <h2 className="font-extrabold text-slate-800 text-base">لوحة إعداد وتوليد الملف</h2>
                </div>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">سيرفر نشط</span>
              </div>

              <form onSubmit={handleCreateFile} className="p-6 space-y-5" id="owner-build-form">
                
                {/* 1. Name */}
                <div className="space-y-1.5">
                  <label htmlFor="form-filename" className="block text-xs font-bold text-slate-700">
                    اسم الملف المطلوب:
                  </label>
                  <input
                    id="form-filename"
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="مثال: iso_game_core"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm bg-slate-50/50"
                    required
                  />
                  <p className="text-[10px] text-slate-400">ستضاف الصيغة تلقائياً في نهاية الاسم عند التنزيل.</p>
                </div>

                {/* 2. Format / extension */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">طبيعة صيغة وامتداد الملف:</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomExt(!isCustomExt);
                        if (!isCustomExt) setCustomExt("");
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                      id="owner-toggle-ext"
                    >
                      {isCustomExt ? "● تحديد من الشائع" : "✎ كتابة امتداد يدوي مخصص"}
                    </button>
                  </div>

                  {isCustomExt ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={customExt}
                        onChange={(e) => setCustomExt(e.target.value)}
                        placeholder="مثل: dmg, exe, sql, apk, tgz"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm bg-indigo-50/20 text-indigo-900 placeholder:text-slate-400 text-left dir-ltr font-mono"
                        required
                      />
                      <p className="text-[10px] text-slate-400">يرجى كتابة الامتداد بأحرف إنجليزية فقط وبدون إضافة النقطة.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-1.5" id="preset-grid">
                      {["pdf", "zip", "txt", "xlsx", "mp3", "mp4", "jpg", "bin"].map((ext) => (
                        <button
                          key={ext}
                          type="button"
                          onClick={() => setSelectedExt(ext)}
                          className={`py-1.5 px-1 rounded-lg border transition text-xs font-mono font-semibold text-center ${
                            selectedExt === ext
                              ? "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-xs"
                              : "border-slate-200/60 hover:bg-slate-50 text-slate-500"
                          }`}
                        >
                          .{ext}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Size and units */}
                <div className="space-y-2">
                  <label htmlFor="form-size" className="block text-xs font-bold text-slate-700">حجم محتوى الجيل المحدد:</label>
                  <div className="flex gap-2">
                    <input
                      id="form-size"
                      type="number"
                      min="1"
                      step="any"
                      value={sizeInput}
                      onChange={(e) => setSizeInput(e.target.value)}
                      placeholder="أدخل رقماً"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm text-left font-mono"
                      required
                    />
                    <select
                      aria-label="وحدة الحجم"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value as any)}
                      className="px-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="B">بايت (Byte)</option>
                      <option value="KB">كيلوبايت (KB)</option>
                      <option value="MB">ميغابايت (MB)</option>
                      <option value="GB">جيجابايت (GB)</option>
                    </select>
                  </div>
                  
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>التمثيل الدقيق الحسابي:</span>
                    <span className="font-mono font-bold text-indigo-600 bg-white border px-2 py-0.5 rounded">
                      {getCurrentSizeBytes().toLocaleString()} Bytes
                    </span>
                  </div>
                </div>

                {/* 4. Generation Pattern Type */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-700">تعبئة البيانات (طبيعة الحشو):</span>
                  <div className="flex gap-1 bg-slate-150/40 p-1 rounded-lg border border-slate-200/50 text-[11px]" id="fill-tabs">
                    {[
                      { id: "zeros", label: "أصفار (Zero)" },
                      { id: "random", label: "عشوائي (Random)" },
                      { id: "custom", label: "نص مخصص" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setType(tab.id as any)}
                        className={`flex-1 py-1.5 rounded-md font-bold text-center transition ${
                          type === tab.id
                            ? "bg-white text-indigo-700 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {type === "custom" && (
                    <div className="space-y-1 mt-2 animate-fadeIn">
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none text-xs text-right bg-slate-50"
                        placeholder="مثال: نص ترحيبي يتكرر..."
                      ></textarea>
                    </div>
                  )}
                </div>

                {/* 5. Collapse Panel: Optional Advanced Settings */}
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
                    id="owner-advanced-accordion"
                  >
                    <div className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" />
                      <span>اتفاقيات الحماية والتحكم المتقدم (اختياري)</span>
                    </div>
                    <span>{showAdvanced ? "▲ إغلاق" : "▼ توسيع"}</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-3 pt-2 animate-fadeIn text-right" id="advanced-configs">
                      {/* Password protect */}
                      <div className="space-y-1.5">
                        <label htmlFor="form-pass" className="text-[11px] font-bold text-slate-600 block">قم بحماية الرابط بكلمة مرور:</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                          <input
                            id="form-pass"
                            type="text"
                            value={filePassword}
                            onChange={(e) => setFilePassword(e.target.value)}
                            placeholder="مثل: Admin@2026 (اتركها فارغة بدون قفل)"
                            className="w-full pr-9 pl-4 py-2 rounded-lg border border-slate-200 focus:outline-none text-xs bg-slate-50/30 text-right font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">ستجبر بوابة التنزيل المتلقي على تعبئة الكلمة لفك التشفير.</p>
                      </div>

                      {/* Max downloads limit */}
                      <div className="space-y-1.5">
                        <label htmlFor="form-max-dl" className="text-[11px] font-bold text-slate-600 block">تدمير ذاتي آمن (العدد الأقصى للتنزيلات):</label>
                        <input
                          id="form-max-dl"
                          type="number"
                          min="1"
                          value={maxDownloads}
                          onChange={(e) => setMaxDownloads(e.target.value)}
                          placeholder="مثال: 5 تنزيلات فقط ثم يتم حذف الملف نهائياً"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none text-xs bg-slate-50/30 font-mono text-left"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit buttons */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إعداد مصفوفات السيرفر...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>توليد الملف وحفظ الرابط فوراً ✨</span>
                    </>
                  )}
                </button>

              </form>
            </div>

            {/* Quality Standard explanation */}
            <div className="bg-slate-900 text-slate-300 rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-white">
                <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
                <h3 className="font-bold text-xs">💡 كفاءة معمارية البث اللحظي On-The-Fly:</h3>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 font-light font-sans">
                عند إرسالك الرابط لشخص آخر، المتصفح يحمّل الملف حياً دون كتابته على مجلدات السيرفر، مما يعني إمكانية قياس أداء الإنترنت وتخطيط النطاق الترددي لملفات تصل مساحتها إلى 1 جيجابايت أو غيرها بلحظة واحدة وبدون أي تعليق للسيرفر.
              </p>
            </div>

          </div>

          {/* Right Inventory list Panel */}
          <div className="lg:col-span-7 space-y-6" id="owner-inventory-column">
            
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md shadow-slate-100 p-6 space-y-6">
              
              {/* Header toolbar stats */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-150/80">
                <div>
                  <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600 animate-pulse" />
                    <span>الملفات والروابط النشطة بالسيرفر:</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">تتبع روابط التحميل، وفحوصات السرعة، وإحصائيات النشاط المتكاملة.</p>
                </div>

                <button
                  onClick={() => fetchFiles()}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition flex items-center justify-center gap-1.5 self-start"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>تحديث السجل</span>
                </button>
              </div>

              {/* Categorization Filtering tabs with count labels */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                {[
                  { id: "all", label: "الكل" },
                  { id: "docs", label: "مستندات" },
                  { id: "media", label: "ميديا ووسائط" },
                  { id: "archives", label: "مضغوطة" },
                  { id: "system", label: "باقي الأنواع" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-center transition ${
                      categoryFilter === tab.id
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sorting and Search filter */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-7 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم الملف، الصيغة، أو معرّف المعاملة ID..."
                    className="w-full pr-8 pl-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50 text-right"
                  />
                </div>
                <div className="sm:col-span-5 flex items-center gap-2">
                  <label htmlFor="owner-sort" className="text-[10px] text-slate-400 font-bold shrink-0">ترتيب الحصيلة:</label>
                  <select
                    id="owner-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full text-xs px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 focus:outline-none"
                  >
                    <option value="latest">الأحدث إنشاءً أولاً</option>
                    <option value="size_desc">الأكبر حجماً أولاً</option>
                    <option value="size_asc">الأصغر حجماً أولاً</option>
                    <option value="downloads">الأكثر تنزيلاً ورواجاً</option>
                  </select>
                </div>
              </div>

              {/* Inventory rendering */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-2xl border border-slate-150 border-dashed text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="text-slate-500 text-sm font-semibold">جاري مزامنة سجلات الملفات من خوادم السحابة...</p>
                </div>
              ) : sortedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-150 text-center space-y-4">
                  <div className="p-3.5 bg-slate-200/60 rounded-full text-slate-400 shadow-inner">
                    <FileQuestion className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-700 text-sm">لم يتم العثور على أي ملفات مطابقة</h4>
                    <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
                      {searchQuery || categoryFilter !== "all" 
                        ? "ليس هناك ملف بالاسم الحشو أو الصيغة المزودة حالياً، يرجى تصفير البحث."
                        : "لوحتك البرمجية فارغة. قم بكتابة مواصفات ملفك باليسار ليتواجد بالسيرفر في أقل من ثانية."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5" id="console-items-list">
                  {sortedFiles.map((file) => {
                    const privateDirectUr = `${window.location.protocol}//${window.location.host}/api/download/${file.id}${file.password ? "?password=" + encodeURIComponent(file.password) : ""}`;
                    const hasPassword = !!file.password;
                    
                    return (
                      <div 
                        key={file.id} 
                        className={`p-4 bg-white border rounded-2xl transition hover:shadow-md ${
                          activeTelemetryFile === file.id ? "border-indigo-500 ring-1 ring-indigo-500/10" : "border-slate-150"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          
                          {/* Left contents info lockup */}
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 shrink-0">
                              {getFileIcon(file.extension)}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-800 text-sm break-all">
                                  {file.name}.{file.extension}
                                </h4>
                                {hasPassword && (
                                  <span className="p-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100 flex items-center" title="محمي بكلمة مرور">
                                    <Lock className="w-3 h-3" />
                                  </span>
                                )}
                                {file.maxDownloads && (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isNearDestruct(file) ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" : "bg-slate-100 text-slate-600 border"
                                  }`}>
                                    تدمير ذاتي: {file.downloadCount}/{file.maxDownloads}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                <span className="font-extrabold text-indigo-600 font-mono">
                                  {formatBytes(file.size)}
                                </span>
                                <span className="border-r border-slate-200 h-3 shrink-0"></span>
                                <span className="dir-ltr text-[10px] text-slate-400">
                                  {new Date(file.createdAt).toLocaleDateString("ar-EG", {
                                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                  })}
                                </span>
                                {file.downloadCount > 0 && (
                                  <>
                                    <span className="border-r border-slate-200 h-3 shrink-0"></span>
                                    <span className="text-emerald-600 font-extrabold text-[11px] bg-emerald-50 px-1 py-0.5 rounded">
                                      ⬇️ {file.downloadCount} تنزيل
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Details footer */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span className="bg-slate-50 px-1 rounded">ID: {file.id}</span>
                                <span>•</span>
                                <span>{file.type === "zeros" ? "حشو بالأصفار" : file.type === "random" ? "حشو عشوائي" : "نصك المخصص"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action tools lockup */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                            
                            {/* Copy landing link */}
                            <button
                              onClick={() => handleCopyLink(file.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                                copiedId === file.id
                                  ? "bg-emerald-600 text-white"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/50"
                              }`}
                              title="احصل على رابط المشاركة للآخرين"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>{copiedId === file.id ? "تم نسخ الرابط!" : "نسخ رابط الشحن"}</span>
                            </button>

                            {/* Options action dropdown trigger / Toggle advanced panel */}
                            <button
                              onClick={() => startEditing(file)}
                              className="p-1 px-2 hover:bg-slate-150 hover:text-slate-900 border text-slate-500 rounded-lg text-xs transition flex items-center gap-1"
                              title="تعديل خصائص ومسميات الملف"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>تعديل</span>
                            </button>

                            <button
                              onClick={() => setQrFile(file)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border text-slate-500 rounded-lg transition"
                              title="توليد رمز QR"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Set active telemetry analytics detail tab */}
                            <button
                              onClick={() => {
                                setActiveTelemetryFile(activeTelemetryFile === file.id ? null : file.id);
                              }}
                              className={`p-1.5 rounded-lg transition border flex items-center gap-1 text-xs font-bold ${
                                activeTelemetryFile === file.id
                                  ? "bg-slate-900 text-white border-slate-950"
                                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                              }`}
                              title="عرض تحليلات وسجل شبكة التنزيل للتجربة"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>النشاط ({file.downloadHistory?.length || 0})</span>
                            </button>

                            {/* Purge delete entry */}
                            <button
                              onClick={() => handleDeleteFile(file.id, `${file.name}.${file.extension}`)}
                              className="p-1.5 text-rose-500 hover:text-white hover:bg-rose-600 border border-slate-150 hover:border-rose-650 rounded-lg transition"
                              title="حذف نهائي فوري"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                          </div>
                        </div>

                        {/* Interactive local speed gauge calculator directly inside owner admin item */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Zap className="text-amber-500 w-4 h-4 animate-bounce" />
                            <span>اختبار الأداء واستقرار البث المحلي لشبكتك:</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {file.password && (
                              <input
                                type="text"
                                placeholder="رمز المرور للفحص"
                                value={speedTestPassword}
                                onChange={(e) => setSpeedTestPassword(e.target.value)}
                                className="px-2 py-1 rounded border text-[11px] w-32 font-mono text-center"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRunSpeedTest(file)}
                              disabled={speedTestStatus === 'running'}
                              className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Gauge className="w-3.5 h-3.5" />
                              <span>فحص السرعة بالمتصفح ⏱️</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyDirectLink(file.id, file.password)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border rounded-lg transition font-semibold"
                              title="تحميل خارجي بالمتصفح"
                            >
                              رابط تنزيل مباشر
                            </button>
                          </div>
                        </div>

                        {/* Live active speedometer simulation for this item */}
                        {speedTestFile && speedTestFile.id === file.id && (
                          <div className="mt-3 bg-slate-900 text-white p-4 rounded-xl space-y-3 border border-indigo-500/20 animate-fadeIn" id="owner-speedtest">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                              <span className="font-bold text-white flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                <span>جاري البث والقياس الملي-ثانوي للشبكة:</span>
                              </span>
                              <span className="font-mono font-bold text-indigo-400">{speedTestProgress}%</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-center">
                              <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-[9px] text-slate-400 block">السرعة اللحظية للتنزيل</span>
                                <span className="text-lg font-black text-indigo-300 font-mono">
                                  {speedTestStatus === 'running' ? speedTestRate : '--'} <span className="text-[10px] text-white">Mbps</span>
                                </span>
                              </div>
                              <div className="bg-white/5 p-2 rounded-lg">
                                <span className="text-[9px] text-slate-400 block">المعدل العام (النطاق المقدر)</span>
                                <span className="text-lg font-black text-emerald-400 font-mono">
                                  {speedTestRateAverage > 0 ? speedTestRateAverage : '--'} <span className="text-[10px] text-white">Mbps</span>
                                </span>
                              </div>
                            </div>

                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-indigo-500 h-full transition-all duration-100"
                                style={{ width: `${speedTestProgress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Expandable Activity log list (Chronological downloads telemetry chart) */}
                        {activeTelemetryFile === file.id && (
                          <div className="mt-3 bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-indigo-600" />
                                <span>سجل نشاط التحميل وعناوين البث المقاسة:</span>
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">الحد الأقصى للتسجيل: ٣٠ حدثاً</span>
                            </div>

                            {!file.downloadHistory || file.downloadHistory.length === 0 ? (
                              <p className="text-xs text-slate-400 text-center py-4">
                                لم يتم فحص أو تحميل هذا الملف مؤخراً. قم بالتحميل أو نسخ الرابط لتسجيل الفحوصات هنا.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5" id="telemetry-log-items">
                                {file.downloadHistory.map((history, hIdx) => (
                                  <div 
                                    key={hIdx} 
                                    className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 transition"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">#{file.downloadHistory!.length - hIdx}</span>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-700 font-mono text-[11px]">{history.ipIndicator}</p>
                                        <p className="text-[9px] text-slate-400">
                                          {new Date(history.timestamp).toLocaleTimeString("ar-EG", {
                                            hour: "2-digit", minute: "2-digit", second: "2-digit"
                                          })} - {new Date(history.timestamp).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {history.speedMbps && (
                                      <div className="text-left font-mono space-y-0.5">
                                        <span className="text-[10px] text-slate-400 block text-right">معدل البث</span>
                                        <span className="text-indigo-600 font-bold bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded text-[11px]">
                                          🚀 {history.speedMbps} Mbps
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Dynamic diagnostic analysis footer tips */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-4">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Smartphone className="w-5 h-5 text-indigo-600 animate-bounce" />
                <span>تبادل الملفات على الهواتف والشاشات اللمسية:</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 leading-relaxed font-sans" id="owner-diagnostics-cols">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">• محاكاة التحميل بالمتصفح:</p>
                  <p className="text-slate-500 font-light text-[11px]">عند استخدامك 'فحص السرعة اللحظية' يقوم المتصفح بتحميل بايتات حرة وقراءتها لتسجيل الثبات، وبمجرد الانتهاء يتم تفريغ الكاش الميموري كلياً لحفظ المساحات من الامتلاء المكتبي.</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800">• سقف التنزيل التدميري:</p>
                  <p className="text-slate-500 font-light text-[11px]">قمنا بتمديد السقف إلى 4 جيجابايت للملف الواحد. إذا كنت تود إجراء فحص سرعة فائقة لألياف الجيجابت Fiber لشركتك، ننصحك باستخدام ملف بسعة 500 ميغابايت أو 1 جيجابايت.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* FOOTER BAR FOR OWNERS CHANNELS */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 mt-20" id="main-owner-footer">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <span className="font-extrabold text-white text-base">منصة ومولد المنسقات العشوائية</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-500/30">الإصدار المستقر 1.3.0</span>
          </div>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            بوابة التحميلات حرة، آمنة، تعمل بدون قيود تخزينية فعلية وتعتمد بالكامل على هيكلية البث المستقر لحماية الأجهزة والحفاظ على أقصى أداء ممكن للتحميلات والسرعة.
          </p>
          <div className="text-[10px] text-slate-600 pt-3 border-t border-slate-800">
            تم التنفيذ بأرقى معايير التقنية العربية السحابية المتقدمة © {new Date().getFullYear()} جميع الحقوق محفوظة
          </div>
        </div>
      </footer>

      {/* Modal Dialog for Inline Files Editing (PUT) */}
      {editingFile && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-fadeIn">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-base">تعديل مواصفات وإعدادات الملف المولد:</h3>
              <button 
                onClick={() => setEditingFile(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-full hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChanges} className="space-y-4 text-right" id="edit-metadata-form">
              <div className="space-y-1.5">
                <label htmlFor="edit-filename-input" className="block text-xs font-bold text-slate-600">اسم الملف:</label>
                <input
                  id="edit-filename-input"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-ext-input" className="block text-xs font-bold text-slate-600">امتداد الملف (الصيغة):</label>
                <input
                  id="edit-ext-input"
                  type="text"
                  value={editExt}
                  onChange={(e) => setEditExt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-sm font-mono text-left"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-pass-input" className="block text-xs font-bold text-slate-600">تعديل كلمة حماية المرور:</label>
                <input
                  id="edit-pass-input"
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="اتركها فارغة لإلغاء القفل"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-xs font-mono text-right"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="edit-max-dl-input" className="block text-xs font-bold text-slate-600">تغيير حد التدمير الذاتي (أقصى تنزيل):</label>
                <input
                  id="edit-max-dl-input"
                  type="number"
                  min="1"
                  value={editMaxDownloads}
                  onChange={(e) => setEditMaxDownloads(e.target.value)}
                  placeholder="بدون حد"
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-xs font-mono text-left"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  id="edit-save-submit"
                >
                  حفظ التعديلات السحابية 💾
                </button>
                <button
                  type="button"
                  onClick={() => setEditingFile(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition font-semibold"
                >
                  إلغاء التغيير
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating QR Modal overlay for Workspace admin popup */}
      {qrFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-xs w-full text-center space-y-4 font-sans animate-fadeIn">
            <h4 className="font-bold text-sm text-white">رمز استجابة المسح الجوال (QR Code):</h4>
            <div className="bg-white p-3 rounded-xl inline-block">
              <img 
                referrerPolicy="no-referrer"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${window.location.protocol}//${window.location.host}/?id=${qrFile.id}`)}`}
                alt="QR Code"
                className="w-44 h-44"
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              افتح كاميرا الهاتف وامسح الرمز ضوئياً للذهاب فوراً لبوابة التحميل وتبادل الملف الوهمي المختار لاسلكياً.
            </p>
            <button 
              onClick={() => setQrFile(null)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs transition"
            >
              إلغاء النافذة
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
