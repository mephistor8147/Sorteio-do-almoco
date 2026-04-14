import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Menu as MenuIcon, 
  Lock, 
  Leaf, 
  Clock, 
  Users, 
  ChevronRight,
  Trophy,
  Settings,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  LogOut,
  Database,
  UserPlus,
  Dices,
  Calendar,
  Sparkles,
  AlertCircle,
  Download,
  Upload,
  Check,
  X,
  ChevronDown,
  Camera,
  Edit2
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch,
  deleteDoc,
  updateDoc,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

// --- Types ---
interface Employee {
  id: string;
  name: string;
  position: number;
  photoUrl?: string;
  isActive: boolean;
}

interface AppSettings {
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroDescription: string;
  lotteryTime: string;
  lotteryDays: number[];
  lastLotteryDate: string | null;
  headerTitleLine1: string;
  headerTitleLine2: string;
  headerSubtitle: string;
  queueTitleLine1: string;
  queueTitleLine2: string;
  queueSubtitle: string;
}

interface LotteryHistory {
  id: string;
  timestamp: string;
  winnerName: string;
  winnerId: string;
  fullList: { id: string; name: string; photoUrl?: string }[];
}

// --- Constants ---
const DEFAULT_SETTINGS: AppSettings = {
  heroTitleLine1: 'SABOR',
  heroTitleLine2: 'AMAZÔNICO',
  heroSubtitle: 'Tropical Dining',
  heroDescription: 'Bem-vindo ao Edifício Amazonas. Desfrute de uma experiência gastronômica única inspirada na natureza.',
  lotteryTime: '11:00',
  lotteryDays: [1, 2, 3, 4, 5], // Seg-Sex
  lastLotteryDate: null,
  headerTitleLine1: 'EDIFÍCIO',
  headerTitleLine2: 'AMAZONAS',
  headerSubtitle: 'Gourmet Experience',
  queueTitleLine1: 'FILA DE',
  queueTitleLine2: 'SERVIÇO',
  queueSubtitle: 'Ordem de Prioridade'
};

const ADMIN_EMAILS = ['l2xbrasil@gmail.com', 'sorteioadm@sorteio.com'];

const MOCK_QUEUE: Employee[] = [
  { id: '1', name: 'Ricardo Oliveira', position: 1, isActive: true },
  { id: '2', name: 'Ana Beatriz Silva', position: 2, isActive: true },
  { id: '3', name: 'Marcos Vinícius', position: 3, isActive: true },
  { id: '4', name: 'Juliana Costa', position: 4, isActive: true },
  { id: '5', name: 'Felipe Santos', position: 5, isActive: true },
];

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 text-center">
          <div className="glass p-10 rounded-[40px] max-w-md space-y-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-bold uppercase tracking-tight text-white">Ops! Algo deu errado.</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Ocorreu um erro inesperado. Tente recarregar a página ou limpar os dados do navegador.
            </p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-brand-primary text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg transition-all active:scale-95"
            >
              Resetar e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Skeletons ---

const SkeletonItem = () => (
  <div className="glass p-5 md:p-6 rounded-[32px] border border-white/5 animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-4 md:gap-6">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-white/10 rounded-full" />
        <div className="h-2 w-20 bg-white/5 rounded-full" />
      </div>
    </div>
    <div className="w-10 h-10 rounded-2xl bg-white/5" />
  </div>
);

const SkeletonQueue = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map(i => <SkeletonItem key={i} />)}
  </div>
);

const SkeletonHistoryItem = () => (
  <div className="glass p-6 rounded-[32px] border border-white/5 animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-6">
      <div className="w-12 h-12 rounded-2xl bg-white/5" />
      <div className="space-y-2">
        <div className="h-4 w-40 bg-white/10 rounded-full" />
        <div className="h-2 w-24 bg-white/5 rounded-full" />
      </div>
    </div>
    <div className="w-20 h-4 bg-white/5 rounded-full" />
  </div>
);

const SkeletonHistory = () => (
  <div className="space-y-4">
    {[1, 2, 3].map(i => <SkeletonHistoryItem key={i} />)}
  </div>
);

const SkeletonSettings = () => (
  <div className="glass p-8 rounded-[40px] border border-white/5 animate-pulse space-y-8">
    <div className="space-y-4">
      <div className="h-4 w-32 bg-white/10 rounded-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-12 bg-white/5 rounded-2xl" />
        <div className="h-12 bg-white/5 rounded-2xl" />
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-4 w-40 bg-white/10 rounded-full" />
      <div className="h-24 bg-white/5 rounded-2xl" />
    </div>
  </div>
);

// --- Components ---

const Header = ({ onAdminClick, isAuthenticated, settings }: { onAdminClick: () => void, isAuthenticated: boolean, settings: AppSettings }) => (
  <header className="px-6 py-8 flex items-center justify-between sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20">
        <Leaf className="text-white fill-white" size={20} />
      </div>
      <div>
        <h1 className="text-sm font-black tracking-[0.2em] text-white leading-none">
          {settings.headerTitleLine1} <span className="block sm:inline">{settings.headerTitleLine2}</span>
        </h1>
        <p className="text-[10px] font-bold tracking-[0.3em] text-brand-secondary mt-1 uppercase">{settings.headerSubtitle}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <button 
        onClick={onAdminClick}
        className={`w-10 h-10 rounded-2xl glass flex items-center justify-center transition-all ${isAuthenticated ? 'text-brand-secondary' : 'text-white/70 hover:text-white'}`}
      >
        {isAuthenticated ? <Settings size={18} /> : <Lock size={18} />}
      </button>
    </div>
  </header>
);

const Login = ({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      console.log("Attempting Google login...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login successful:", result.user.email);
      onLogin();
    } catch (err: any) {
      console.error("Google Login Error:", err);
      let message = "Erro ao fazer login com Google.";
      
      if (err.code === 'auth/unauthorized-domain') {
        message = "Domínio não autorizado. Adicione este domínio no Console do Firebase.";
      } else if (err.code === 'auth/popup-blocked') {
        message = "Popup bloqueado pelo navegador. Por favor, permita popups.";
      } else if (err.code === 'auth/popup-closed-by-user') {
        message = "Login cancelado pelo usuário.";
      }
      
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin();
    } catch (err: any) {
      console.error("Email Login Error:", err);
      let message = "Erro ao fazer login.";
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "E-mail ou senha incorretos.";
      } else if (err.code === 'auth/invalid-email') {
        message = "E-mail inválido.";
      } else if (err.code === 'auth/too-many-requests') {
        message = "Muitas tentativas falhas. Tente novamente mais tarde.";
      }
      
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-brand-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <button onClick={onBack} className="absolute top-6 left-6 text-white/30 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-primary rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl rotate-3">
            <Lock size={28} />
          </div>
          <h2 className="text-2xl font-light uppercase tracking-tight text-white">Acesso Restrito</h2>
          <p className="text-brand-secondary text-[8px] font-black uppercase tracking-[0.3em] mt-1">Área Administrativa</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4 mb-8">
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">E-mail</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemplo.com"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Senha</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-primary text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-[8px] uppercase tracking-[0.3em]">
            <span className="bg-brand-bg px-4 text-white/30">Ou continue com</span>
          </div>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-brand-bg font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[10px] font-bold text-center uppercase tracking-widest mt-2"
            >
              {error}
            </motion.p>
          )}
          
          <p className="text-white/30 text-[8px] text-center uppercase tracking-widest leading-relaxed">
            Apenas administradores autorizados têm acesso às configurações do sistema.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const AdminPanel = ({ 
  onLogout, 
  queue, 
  onAdd, 
  onRemove,
  onToggleActive,
  settings,
  onUpdateSettings,
  onShuffle,
  onSetQueue,
  onUpdateEmployee,
  onDeleteHistoryItem,
  history,
  onClearHistory,
  isLoadingQueue,
  isLoadingHistory,
  isLoadingSettings
}: { 
  onLogout: () => void, 
  queue: Employee[], 
  onAdd: (name: string, photoUrl?: string) => void,
  onRemove: (id: string) => void,
  onToggleActive: (id: string, currentStatus: boolean) => void,
  settings: AppSettings,
  onUpdateSettings: (settings: AppSettings) => void,
  onShuffle: () => Promise<any>,
  onSetQueue: (queue: Employee[]) => void,
  onUpdateEmployee: (id: string, name: string, photoUrl?: string) => void,
  onDeleteHistoryItem: (id: string) => void,
  history: LotteryHistory[],
  onClearHistory: () => void,
  isLoadingQueue: boolean,
  isLoadingHistory: boolean,
  isLoadingSettings: boolean
}) => {
  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'settings' | 'lottery' | 'database' | 'history'>('queue');

  const [isShufflingLocal, setIsShufflingLocal] = useState(false);

  const handleShuffleClick = async () => {
    console.log('Botão Sortear Agora clicado');
    setIsShufflingLocal(true);
    try {
      await onShuffle();
    } catch (e) {
      console.error('Erro ao chamar onShuffle:', e);
    }
    setIsShufflingLocal(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setNewPhotoUrl(base64);
      setIsUploading(false);
    };
    reader.onerror = () => {
      setIsUploading(false);
      alert("Erro ao ler arquivo.");
    };
    reader.readAsDataURL(file);
  };
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [dbStatus, setDbStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    if (dbStatus) {
      const timer = setTimeout(() => setDbStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [dbStatus]);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(queue, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fila_funcionarios_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDbStatus({ type: 'success', message: 'Dados exportados com sucesso!' });
    } catch (e) {
      setDbStatus({ type: 'error', message: 'Erro ao exportar dados.' });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          const isValid = json.every(item => item.id && item.name && typeof item.position === 'number');
          if (isValid) {
            const mapped = json.map(item => ({
              ...item,
              isActive: typeof item.isActive === 'boolean' ? item.isActive : true
            }));
            onSetQueue(mapped);
            setDbStatus({ type: 'success', message: 'Fila importada com sucesso!' });
          } else {
            setDbStatus({ type: 'error', message: 'Formato de arquivo inválido.' });
          }
        } else {
          setDbStatus({ type: 'error', message: 'O arquivo deve ser uma lista (array).' });
        }
      } catch (error) {
        setDbStatus({ type: 'error', message: 'Erro ao processar o arquivo JSON.' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportXlsx = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(queue);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Fila");
      XLSX.writeFile(workbook, `fila_funcionarios_${new Date().toISOString().split('T')[0]}.xlsx`);
      setDbStatus({ type: 'success', message: 'Dados exportados para Excel com sucesso!' });
    } catch (e) {
      setDbStatus({ type: 'error', message: 'Erro ao exportar para Excel.' });
    }
  };

  const handleImportXlsx = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (Array.isArray(json)) {
          const mapped = json.map((item, idx) => ({
            id: String(item.id || Math.random().toString(36).substr(2, 9)),
            name: String(item.name || item.Nome || 'Sem Nome'),
            position: typeof item.position === 'number' ? item.position : idx + 1,
            photoUrl: item.photoUrl || item.Foto || '',
            isActive: typeof item.isActive === 'boolean' ? item.isActive : true
          }));
          
          onSetQueue(mapped);
          setDbStatus({ type: 'success', message: 'Fila importada do Excel com sucesso!' });
        }
      } catch (error) {
        setDbStatus({ type: 'error', message: 'Erro ao processar o arquivo Excel.' });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const days = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
  ];

  const toggleDay = (dayId: number) => {
    const current = tempSettings.lotteryDays || [];
    const updated = current.includes(dayId) 
      ? current.filter(d => d !== dayId)
      : [...current, dayId];
    setTempSettings({ ...tempSettings, lotteryDays: updated });
  };

  return (
    <div className="min-h-screen bg-brand-bg p-4 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-light uppercase tracking-tight text-white">Painel <span className="font-black">Admin</span></h2>
            <p className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.4em] mt-2">Gerenciamento Local</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-6 py-4 sm:py-3 rounded-2xl glass text-red-400 hover:bg-red-500/10 transition-all text-xs font-black uppercase tracking-widest w-full sm:w-auto"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-white/5 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('queue')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-brand-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Fila
          </button>
          <button 
            onClick={() => setActiveTab('lottery')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'lottery' ? 'bg-brand-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Sorteio
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-brand-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Configurações
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'database' ? 'bg-brand-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Banco de Dados
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-brand-primary text-white' : 'text-white/40 hover:text-white'}`}
          >
            Histórico
          </button>
        </div>

        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-6">
                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                  <Users className="text-brand-secondary" size={20} /> {editingId ? 'Editar Funcionário' : 'Adicionar Funcionário'}
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group">
                      <input 
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label 
                        htmlFor="photo-upload"
                        className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-brand-secondary hover:border-brand-secondary/50 cursor-pointer transition-all overflow-hidden"
                      >
                        {newPhotoUrl ? (
                          <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          isUploading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-brand-secondary" /> : <Camera size={24} />
                        )}
                      </label>
                    </div>
                    <input 
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do funcionário..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm md:text-base"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          if (newName.trim()) {
                            if (editingId) {
                              onUpdateEmployee(editingId, newName, newPhotoUrl || undefined);
                              setEditingId(null);
                            } else {
                              onAdd(newName, newPhotoUrl || undefined);
                            }
                            setNewName('');
                            setNewPhotoUrl('');
                          }
                        }}
                        className="h-14 flex-1 sm:w-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        {editingId ? <Check size={24} /> : <Plus size={24} />}
                      </button>
                      {editingId && (
                        <button 
                          onClick={() => {
                            setEditingId(null);
                            setNewName('');
                            setNewPhotoUrl('');
                          }}
                          className="h-14 w-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-red-400 transition-all"
                        >
                          <X size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="Ou cole a URL da foto aqui..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-white/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-[10px]"
                    />
                    {newPhotoUrl && (
                      <button 
                        onClick={() => setNewPhotoUrl('')}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Fila Atual ({queue.length})</h3>
                <div className="space-y-3">
                  {isLoadingQueue ? (
                    <SkeletonQueue />
                  ) : (
                    queue.map((emp) => (
                      <div key={emp.id} className={`glass p-4 md:p-5 rounded-[24px] md:rounded-[32px] flex items-center justify-between group transition-opacity ${!emp.isActive ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 font-bold text-sm overflow-hidden">
                            {emp.photoUrl ? (
                              <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              emp.position
                            )}
                          </div>
                          <div>
                            <span className="text-white font-bold uppercase tracking-tight text-sm md:text-base block">{emp.name}</span>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${emp.isActive ? 'text-green-400' : 'text-red-400'}`}>
                              {emp.isActive ? 'Ativo no Sorteio' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingId(emp.id);
                              setNewName(emp.name);
                              setNewPhotoUrl(emp.photoUrl || '');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="w-10 h-10 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onToggleActive(emp.id, emp.isActive)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${emp.isActive ? 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white' : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'}`}
                            title={emp.isActive ? 'Desativar' : 'Ativar'}
                          >
                            {emp.isActive ? <Check size={16} /> : <X size={16} />}
                          </button>
                          <button 
                            onClick={() => onRemove(emp.id)}
                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Status do Sistema</h3>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Banco de Dados</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-[8px] font-black uppercase rounded-full">Local Ativo</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Versão</span>
                  <span className="text-white/40 text-[10px] font-bold">v1.1.1</span>
                </div>
              </div>

              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Ações Rápidas</h3>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => {
                      if(confirm('Limpar toda a fila?')) {
                        queue.forEach(e => onRemove(e.id));
                      }
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left group"
                  >
                    <Database size={18} className="text-white/40 group-hover:text-brand-secondary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Limpar Fila</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lottery' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              {isLoadingSettings ? (
                <SkeletonSettings />
              ) : (
                <div className="glass p-8 rounded-[40px] space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                      <Calendar className="text-brand-secondary" size={20} /> Programação Automática
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Dias da Semana</label>
                      <div className="flex flex-wrap gap-2">
                        {days.map(day => (
                          <button
                            key={day.id}
                            onClick={() => toggleDay(day.id)}
                            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              (tempSettings.lotteryDays || []).includes(day.id)
                                ? 'bg-brand-primary border-brand-primary text-white'
                                : 'bg-white/5 border-white/10 text-white/40 hover:text-white'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Horário do Sorteio</label>
                      <input 
                        type="time"
                        value={tempSettings.lotteryTime || '11:00'}
                        onChange={(e) => setTempSettings({ ...tempSettings, lotteryTime: e.target.value })}
                        className="w-full sm:w-48 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                      />
                    </div>

                    <button 
                      onClick={() => onUpdateSettings(tempSettings)}
                      className="w-full sm:w-auto px-12 bg-brand-primary hover:bg-brand-primary/80 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
                    >
                      Salvar Programação
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass p-8 rounded-[40px] space-y-6 text-center">
                <div className="w-20 h-20 bg-brand-secondary/10 rounded-3xl flex items-center justify-center text-brand-secondary mx-auto">
                  <Dices size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold uppercase tracking-tight text-white">Sorteio Casual</h3>
                  <p className="text-white/40 text-[10px] font-medium leading-relaxed">Realize um sorteio agora mesmo, independente da programação.</p>
                </div>
                <button 
                  onClick={handleShuffleClick}
                  disabled={isShufflingLocal}
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-bg font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-brand-secondary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isShufflingLocal ? (
                    <div className="w-5 h-5 border-2 border-brand-bg/30 border-t-brand-bg rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {isShufflingLocal ? 'Sorteando...' : 'Sortear Agora'}
                </button>
                {queue.filter(e => e.isActive).length < 2 && (
                  <p className="text-red-400/60 text-[8px] font-bold uppercase tracking-widest animate-pulse">
                    Mínimo de 2 funcionários ativos necessário
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="glass p-8 rounded-[40px] space-y-6 relative overflow-hidden group">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                  <Download size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white">Exportar Dados</h3>
                  <p className="text-white/40 text-xs leading-relaxed">Baixe a lista atual de funcionários para backup ou transferência.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={handleExportXlsx}
                    className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-[10px]"
                  >
                    <Download size={16} /> Exportar XLSX
                  </button>
                  <button 
                    onClick={handleExport}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-[10px]"
                  >
                    <Download size={16} /> Exportar JSON
                  </button>
                </div>
              </div>

              <div className="glass p-8 rounded-[40px] space-y-6 relative overflow-hidden group">
                <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-secondary">
                  <Upload size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white">Importar Dados</h3>
                  <p className="text-white/40 text-xs leading-relaxed">Carregue uma lista de funcionários. Isso substituirá a fila atual.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-bg font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer text-[10px]">
                    <Plus size={16} /> Importar XLSX
                    <input 
                      type="file" 
                      accept=".xlsx, .xls" 
                      className="hidden" 
                      onChange={handleImportXlsx}
                    />
                  </label>
                  <label className="w-full bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all flex items-center justify-center gap-3 cursor-pointer text-[10px]">
                    <Plus size={16} /> Importar JSON
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={handleImport}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white">Limpeza de Dados</h3>
                  <p className="text-white/40 text-xs">Ações irreversíveis para manutenção do sistema.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todo o histórico de sorteios?')) {
                      onClearHistory();
                    }
                  }}
                  className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-red-400">Limpar Histórico</span>
                    <Clock size={16} className="text-white/20 group-hover:text-red-400" />
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">Remove permanentemente todos os registros de sorteios realizados.</p>
                </button>

                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar toda a fila de funcionários?')) {
                      queue.forEach(e => onRemove(e.id));
                    }
                  }}
                  className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-red-400">Limpar Fila</span>
                    <Users size={16} className="text-white/20 group-hover:text-red-400" />
                  </div>
                  <p className="text-[10px] text-white/30 leading-relaxed">Remove todos os funcionários cadastrados no sistema.</p>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {dbStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest ${
                    dbStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {dbStatus.message}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <Trophy className="text-brand-secondary" size={20} /> Histórico de Sorteios
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={() => {
                    if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
                      onClearHistory();
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            <div className="space-y-4">
              {isLoadingHistory ? (
                <SkeletonHistory />
              ) : history.length === 0 ? (
                <div className="glass p-12 rounded-[40px] text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                    <Clock size={32} />
                  </div>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Nenhum sorteio registrado ainda.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="space-y-2">
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                      className="glass p-6 rounded-[32px] flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                          <Trophy size={24} />
                        </div>
                        <div>
                          <h4 className="text-white font-bold uppercase tracking-tight">Vencedor: {item.winnerName}</h4>
                          <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">
                            {new Date(item.timestamp).toLocaleDateString('pt-BR')} às {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-brand-secondary text-[10px] font-black uppercase tracking-widest">
                          {expandedHistory === item.id ? 'Ocultar Lista' : 'Ver Lista Completa'}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Excluir este registro do histórico?')) {
                              onDeleteHistoryItem(item.id);
                            }
                          }}
                          className="p-2 rounded-lg bg-white/5 text-white/20 hover:bg-red-500/10 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronDown size={16} className={`text-white/20 transition-transform ${expandedHistory === item.id ? 'rotate-180' : ''}`} />
                      </div>
                    </motion.div>
                    
                    <AnimatePresence>
                      {expandedHistory === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="glass mx-4 p-6 rounded-b-[32px] border-t-0 space-y-3">
                            <h5 className="text-[8px] font-black uppercase tracking-[0.4em] text-white/30 mb-4">Ordem Sorteada</h5>
                            {item.fullList?.map((emp, idx) => (
                              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-brand-secondary w-4">{idx + 1}º</span>
                                  <div className="w-6 h-6 rounded-full bg-white/5 overflow-hidden">
                                    {emp.photoUrl ? (
                                      <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[8px] text-white/20 font-bold">
                                        {emp.name.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs text-white/70 font-bold uppercase tracking-tight">{emp.name}</span>
                                </div>
                                {idx === 0 && (
                                  <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary bg-brand-secondary/10 px-2 py-1 rounded-full">Vencedor</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass p-6 md:p-10 rounded-[40px] space-y-12 max-w-2xl">
            <div className="space-y-8">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <Settings className="text-brand-secondary" size={20} /> Editar Cabeçalho (Topo)
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 1</label>
                    <input 
                      type="text"
                      value={tempSettings.headerTitleLine1 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, headerTitleLine1: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 2</label>
                    <input 
                      type="text"
                      value={tempSettings.headerTitleLine2 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, headerTitleLine2: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Subtítulo</label>
                  <input 
                    type="text"
                    value={tempSettings.headerSubtitle || ''}
                    onChange={(e) => setTempSettings({...tempSettings, headerSubtitle: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <Settings className="text-brand-secondary" size={20} /> Editar Card Principal
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Subtítulo (Tag)</label>
                  <input 
                    type="text"
                    value={tempSettings.heroSubtitle || ''}
                    onChange={(e) => setTempSettings({...tempSettings, heroSubtitle: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 1</label>
                    <input 
                      type="text"
                      value={tempSettings.heroTitleLine1 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, heroTitleLine1: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 2</label>
                    <input 
                      type="text"
                      value={tempSettings.heroTitleLine2 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, heroTitleLine2: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Descrição</label>
                  <textarea 
                    rows={4}
                    value={tempSettings.heroDescription || ''}
                    onChange={(e) => setTempSettings({...tempSettings, heroDescription: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h3 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                <Settings className="text-brand-secondary" size={20} /> Editar Título da Fila
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 1</label>
                    <input 
                      type="text"
                      value={tempSettings.queueTitleLine1 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, queueTitleLine1: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Título Linha 2 (Negrito)</label>
                    <input 
                      type="text"
                      value={tempSettings.queueTitleLine2 || ''}
                      onChange={(e) => setTempSettings({...tempSettings, queueTitleLine2: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Subtítulo</label>
                  <input 
                    type="text"
                    value={tempSettings.queueSubtitle || ''}
                    onChange={(e) => setTempSettings({...tempSettings, queueSubtitle: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => onUpdateSettings(tempSettings)}
              className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
            >
              Salvar Todas as Alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HeroCard = ({ queueCount, settings }: { queueCount: number, settings: AppSettings }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 p-8 md:p-12 rounded-[40px] bg-brand-card relative overflow-hidden hero-gradient border border-white/5 shadow-2xl"
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <Leaf size={14} className="text-brand-secondary" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-secondary">{settings.heroSubtitle}</span>
        </div>
        
        <h2 className="text-4xl md:text-6xl font-light leading-none tracking-tight mb-2">
          {settings.heroTitleLine1} <br />
          <span className="text-brand-primary font-black">{settings.heroTitleLine2}</span>
        </h2>
        
        <p className="text-white/50 text-sm md:text-base font-medium leading-relaxed max-w-[280px] md:max-w-md mb-10">
          {settings.heroDescription}
        </p>
        
        <div className="flex flex-wrap gap-3">
          <div className="px-5 py-3 rounded-full glass flex items-center gap-3">
            <Clock size={16} className="text-brand-secondary" />
            <span className="text-xs font-bold tracking-widest">{time}</span>
          </div>
          <div className="px-5 py-3 rounded-full glass flex items-center gap-3">
            <Users size={16} className="text-brand-secondary" />
            <span className="text-xs font-bold tracking-widest">{queueCount} Pessoas na Fila</span>
          </div>
        </div>
      </div>
      
      <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl" />
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-brand-secondary/5 rounded-full blur-3xl" />
    </motion.div>
  );
};

const QueueItem = React.forwardRef<HTMLDivElement, { employee: Employee, isFirst: boolean }>(
  ({ employee, isFirst }, ref) => (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`group flex items-center justify-between p-5 md:p-6 rounded-[32px] transition-all duration-500 ${
        isFirst 
          ? 'bg-brand-primary text-white shadow-2xl shadow-brand-primary/20 scale-[1.02] z-10' 
          : 'bg-brand-card/50 hover:bg-brand-card text-white/80 border border-white/5'
      }`}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="relative">
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold transition-all duration-500 overflow-hidden ${
            isFirst ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-white/5 text-white/30 group-hover:bg-brand-secondary/20 group-hover:text-brand-secondary'
          }`}>
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              employee.name.charAt(0)
            )}
          </div>
          {isFirst && (
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-brand-secondary rounded-full flex items-center justify-center text-brand-bg shadow-lg border-2 border-brand-primary">
              <Trophy size={14} />
            </div>
          )}
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] ${isFirst ? 'text-white/70' : 'text-brand-secondary/60'}`}>
              Posição {employee.position}
            </span>
            {isFirst && (
              <span className="px-2 py-0.5 bg-white/20 text-white text-[7px] md:text-[8px] font-black uppercase rounded-full backdrop-blur-md">Próximo</span>
            )}
          </div>
          <h4 className={`text-base md:text-xl font-bold tracking-tight uppercase ${isFirst ? 'text-white' : 'text-white/90'}`}>
            {employee.name}
          </h4>
        </div>
      </div>
      
      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-base md:text-lg font-black transition-all ${
        isFirst ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20'
      }`}>
        {employee.position}º
      </div>
    </motion.div>
  )
);

function AppContent() {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info', description?: string }[]>([]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, description }]);
    const duration = type === 'error' ? 8000 : 4000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const [queue, setQueue] = useState<Employee[]>([]);
  const [history, setHistory] = useState<LotteryHistory[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAdminUser = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
      
      if (user && isAdminUser) {
        setIsAuthenticated(true);
        setView(prev => prev === 'login' ? 'admin' : prev);
      } else {
        setIsAuthenticated(false);
        if (view === 'admin') setView('public');
        // If a non-admin user is logged in, sign them out to prevent permission errors
        if (user && !isAdminUser) {
          auth.signOut();
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [view]);

  // Firestore Real-time Sync: Queue
  useEffect(() => {
    setIsLoadingQueue(true);
    const q = query(collection(db, 'queue'), orderBy('position', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data() as Employee;
        return {
          ...data,
          position: Number(data.position) || 0
        };
      });
      setQueue(items);
      setIsLoadingQueue(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'queue');
      setIsLoadingQueue(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync: History
  useEffect(() => {
    setIsLoadingHistory(true);
    const q = query(collection(db, 'history'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as LotteryHistory);
      setHistory(items);
      setIsLoadingHistory(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'history');
      setIsLoadingHistory(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync: Settings
  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        // If settings don't exist in Firestore, we use DEFAULT_SETTINGS (already set as initial state)
        // We only attempt to initialize the document if the user is the authorized admin
        if (auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
          setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, 'settings/global');
          });
        }
      }
      setIsLoadingSettings(false);
    }, (error) => {
      // If we can't read settings (e.g. permission denied before login), just stop loading
      setIsLoadingSettings(false);
    });
    return () => unsubscribe();
  }, [isAuthenticated]); // Re-run when auth state changes to check for admin initialization

  useEffect(() => {
    const checkLottery = async () => {
      // Only the authorized admin can trigger the automatic lottery write
      if (!auth.currentUser?.email || !ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase())) return;
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const todayStr = now.toISOString().split('T')[0];

      if (
        (settings.lotteryDays || []).includes(currentDay) &&
        currentTime === (settings.lotteryTime || '11:00') &&
        settings.lastLotteryDate !== todayStr &&
        queue.filter(e => e.isActive).length >= 2
      ) {
        const success = await handleShuffle();
        if (success) {
          await updateSettings({ ...settings, lastLotteryDate: todayStr });
        }
      }
    };

    const interval = setInterval(checkLottery, 30000);
    return () => clearInterval(interval);
  }, [settings, queue, isAuthenticated]);

  const handleLogin = () => {
    if (auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase())) {
      setView('admin');
    } else {
      // If someone else logs in, sign them out and show error
      auth.signOut();
      alert("Acesso negado. Apenas o administrador autorizado pode acessar esta área.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setView('public');
  };

  const addEmployee = async (name: string, photoUrl?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEmp: Employee = {
      id,
      name,
      isActive: true,
      position: queue.length + 1,
      ...(photoUrl ? { photoUrl } : {})
    };
    try {
      await setDoc(doc(db, 'queue', id), newEmp);
      addNotification(`${name} adicionado à fila!`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao adicionar funcionário.', 'error', errMsg);
      handleFirestoreError(err, OperationType.CREATE, `queue/${id}`);
    }
  };

  const updateEmployee = async (id: string, name: string, photoUrl?: string) => {
    try {
      const updates: any = { name };
      if (photoUrl !== undefined) updates.photoUrl = photoUrl || "";
      await updateDoc(doc(db, 'queue', id), updates);
      addNotification(`${name} atualizado com sucesso!`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao atualizar funcionário.', 'error', errMsg);
      handleFirestoreError(err, OperationType.UPDATE, `queue/${id}`);
    }
  };

  const toggleEmployeeActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'queue', id), { isActive: !currentStatus });
      addNotification(`Status de ${queue.find(e => e.id === id)?.name} atualizado.`, 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao atualizar status.', 'error', errMsg);
      handleFirestoreError(err, OperationType.UPDATE, `queue/${id}`);
    }
  };

  const removeEmployee = async (id: string) => {
    const empName = queue.find(e => e.id === id)?.name;
    try {
      await deleteDoc(doc(db, 'queue', id));
      // Re-order remaining positions
      const remaining = queue.filter(e => e.id !== id);
      const batch = writeBatch(db);
      remaining.forEach((emp, idx) => {
        batch.update(doc(db, 'queue', emp.id), { position: idx + 1 });
      });
      await batch.commit();
      addNotification(`${empName} removido da fila.`, 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao remover funcionário.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, `queue/${id}`);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
      addNotification('Configurações salvas com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao salvar configurações.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  };

  const handleShuffle = async () => {
    console.log('Iniciando handleShuffle. Queue size:', queue.length);
    const activeEmployees = queue.filter(emp => emp.isActive);
    console.log('Active employees:', activeEmployees.length);
    
    if (activeEmployees.length < 2) {
      addNotification('É necessário pelo menos 2 funcionários ativos para o sorteio.', 'error');
      return false;
    }

    addNotification('Iniciando sorteio...', 'info');

    // Fisher-Yates Shuffle for better randomness
    const shuffled = [...activeEmployees];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const winner = shuffled[0];
    
    // Update positions for ALL employees (active first, then inactive)
    const inactiveEmployees = queue.filter(emp => !emp.isActive);
    const fullNewOrder = [...shuffled, ...inactiveEmployees];
    console.log('Full new order size:', fullNewOrder.length);

    try {
      // Process in batches of 400 to stay safe under 500 limit
      const chunks = [];
      for (let i = 0; i < fullNewOrder.length; i += 400) {
        chunks.push(fullNewOrder.slice(i, i + 400));
      }

      let absoluteIdx = 0;
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach((emp) => {
          batch.update(doc(db, 'queue', emp.id), { position: absoluteIdx + 1 });
          absoluteIdx++;
        });
        await batch.commit();
      }

      // Add to history (separate batch/write)
      const historyId = Math.random().toString(36).substr(2, 9);
      const historyEntry: LotteryHistory = {
        id: historyId,
        timestamp: new Date().toISOString(),
        winnerName: winner.name,
        winnerId: winner.id,
        fullList: shuffled.map(emp => ({ 
          id: emp.id, 
          name: emp.name, 
          ...(emp.photoUrl ? { photoUrl: emp.photoUrl } : {})
        }))
      };
      await setDoc(doc(db, 'history', historyId), historyEntry);

      console.log('Sorteio concluído com sucesso. Vencedor:', winner.name);
      addNotification(`Sorteio realizado! Vencedor: ${winner.name}`, 'success');
      return true;
    } catch (err) {
      console.error('Erro fatal no handleShuffle:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao realizar sorteio.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'queue/shuffle');
      return false;
    }
  };

  const clearHistory = async () => {
    if (history.length === 0) return;
    try {
      // Firestore batch limit is 500 operations. 
      // We'll process in chunks if needed.
      const chunks = [];
      for (let i = 0; i < history.length; i += 500) {
        chunks.push(history.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.delete(doc(db, 'history', item.id));
        });
        await batch.commit();
      }
      
      addNotification('Histórico limpo com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao limpar histórico.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, 'history/clear');
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'history', id));
      addNotification('Registro removido do histórico.', 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao remover item do histórico.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, `history/${id}`);
    }
  };

  const setQueueBulk = async (newQueue: Employee[]) => {
    try {
      const batch = writeBatch(db);
      // Delete old
      queue.forEach(emp => {
        batch.delete(doc(db, 'queue', emp.id));
      });
      // Add new
      newQueue.forEach(emp => {
        batch.set(doc(db, 'queue', emp.id), emp);
      });
      await batch.commit();
      addNotification('Banco de dados atualizado com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao atualizar banco de dados.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'queue/bulk');
    }
  };

  const filteredQueue = queue.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      {view === 'login' && <Login onLogin={handleLogin} onBack={() => setView('public')} />}
      
      {/* Notifications */}
      <div className="fixed bottom-8 right-8 z-[200] space-y-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[280px] border border-white/5 backdrop-blur-xl ${
                n.type === 'success' ? 'bg-green-500/90 text-white' : 
                n.type === 'error' ? 'bg-red-500/90 text-white' : 
                'bg-brand-card/90 text-white'
              }`}
            >
              {n.type === 'success' && <Check size={18} />}
              {n.type === 'error' && <AlertCircle size={18} />}
              {n.type === 'info' && <Sparkles size={18} />}
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold uppercase tracking-widest">{n.message}</span>
                {n.description && (
                  <span className="text-[8px] opacity-70 font-medium leading-tight line-clamp-2">{n.description}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {view === 'admin' && isAuthenticated && (
        <AdminPanel 
          onLogout={handleLogout} 
          queue={queue} 
          onAdd={addEmployee}
          onRemove={removeEmployee}
          onToggleActive={toggleEmployeeActive}
          settings={settings}
          onUpdateSettings={updateSettings}
          onShuffle={handleShuffle}
          onSetQueue={setQueueBulk}
          onUpdateEmployee={updateEmployee}
          onDeleteHistoryItem={deleteHistoryItem}
          history={history}
          onClearHistory={clearHistory}
          isLoadingQueue={isLoadingQueue}
          isLoadingHistory={isLoadingHistory}
          isLoadingSettings={isLoadingSettings}
        />
      )}

      {view === 'public' && (
        <>
          <Header 
            onAdminClick={() => setView(isAuthenticated ? 'admin' : 'login')} 
            isAuthenticated={isAuthenticated}
            settings={settings}
          />
          
          <main className="max-w-3xl mx-auto space-y-12">
            <HeroCard queueCount={queue.length} settings={settings} />
            
            <section className="px-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-2xl md:text-4xl font-light uppercase tracking-tight text-white mb-2">
                    {settings.queueTitleLine1} <span className="font-black">{settings.queueTitleLine2}</span>
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-secondary">{settings.queueSubtitle}</p>
                </div>
                
                <div className="relative group flex-1 max-w-md">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-secondary transition-colors" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar na fila..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-brand-card/50 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:bg-brand-card transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {isLoadingQueue ? (
                    <SkeletonQueue />
                  ) : (
                    <>
                      {filteredQueue.map((employee, index) => (
                        <QueueItem 
                          key={employee.id} 
                          employee={employee} 
                          isFirst={index === 0 && searchQuery === ''} 
                        />
                      ))}
                      {filteredQueue.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-20 text-center"
                        >
                          <p className="text-white/30 font-medium uppercase tracking-widest text-xs">Nenhum funcionário encontrado</p>
                        </motion.div>
                      )}
                    </>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </main>
          
          <div className="px-6 mt-12 max-w-3xl mx-auto">
            <div className="p-8 rounded-[32px] glass relative overflow-hidden group">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">Pausa para Café</h4>
                  <p className="text-white/40 text-xs font-medium max-w-[200px]">Visite nosso lounge após o almoço.</p>
                </div>
                <button className="w-12 h-12 rounded-full bg-brand-secondary text-brand-bg flex items-center justify-center hover:scale-110 transition-transform">
                  <ArrowRight size={20} />
                </button>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-brand-secondary/10 transition-colors" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
