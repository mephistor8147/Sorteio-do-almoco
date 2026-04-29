import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  History,
  Target,
  Search, 
  Menu as MenuIcon, 
  Lock, 
  Leaf, 
  Clock, 
  Users, 
  ChevronRight,
  ChevronLeft,
  Trophy,
  Settings,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  LogOut,
  Database,
  UserPlus,
  User as UserIcon,
  Dices,
  Sparkles,
  AlertCircle,
  Download,
  Upload,
  Check,
  X,
  ChevronDown,
  Camera,
  Edit2,
  Zap,
  Timer,
  Link as LinkIcon,
  ExternalLink,
  Printer,
  FileDown,
  Volume2,
  VolumeX,
  Share2,
  RefreshCw,
  FileText,
  Shield,
  ShieldCheck,
  CloudDownload,
  Image as ImageIcon,
  File as FileIcon,
  Activity,
  AlertTriangle,
  Globe,
  Archive,
  Code,
  Calendar,
  Save
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword as createAuthUser,
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  where,
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch,
  deleteDoc,
  updateDoc,
  handleFirestoreError,
  OperationType,
  firebaseConfigExport,
  storage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL
} from './firebase';
import type { User } from './firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

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
  heroBackgroundImage?: string;
  lotteryTime: string;
  lotteryDays: number[];
  lotteryEnabled: boolean;
  lotteryEnabledBy?: string;
  lastLotteryDate: string | null;
  lastLotteryTimestamp?: string | null;
  headerTitleLine1: string;
  headerTitleLine2: string;
  headerSubtitle: string;
  queueTitleLine1: string;
  queueTitleLine2: string;
  queueSubtitle: string;
  downloadUrl?: string;
  downloadFileName?: string;
  endOfRoundPosition?: number;
  currentCallPosition?: number;
  voiceCallEnabled?: boolean;
  lastCalledEmployeeId?: string | null;
  lastCalledTimestamp?: string | null;
  publicShuffleEnabled?: boolean;
  publicShuffleStartTime?: string;
  publicShuffleEndTime?: string;
}

interface LotteryHistory {
  id: string;
  timestamp: string;
  winnerName: string;
  winnerId: string;
  type?: 'manual' | 'automatic';
  fullList: { id: string; name: string; photoUrl?: string }[];
}

interface FileHistory {
  id: string;
  timestamp: string;
  fileName: string;
  fileSize: number;
  uploaderEmail: string;
  downloadUrl: string;
}

interface AdminUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  role: 'admin' | 'coordinator';
  password?: string;
  photoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

// --- Constants ---
const DEFAULT_SETTINGS: AppSettings = {
  heroTitleLine1: 'SABOR',
  heroTitleLine2: 'AMAZÔNICO',
  heroSubtitle: 'Tropical Dining',
  heroDescription: 'Bem-vindo ao Edifício Amazonas. Desfrute de uma experiência gastronômica única inspirada na natureza.',
  heroBackgroundImage: '',
  lotteryTime: '11:00',
  lotteryDays: [1, 2, 3, 4, 5], // Seg-Sex
  lotteryEnabled: false,
  lotteryEnabledBy: '',
  lastLotteryDate: null,
  lastLotteryTimestamp: null,
  headerTitleLine1: 'EDIFÍCIO',
  headerTitleLine2: 'AMAZONAS',
  headerSubtitle: 'Gourmet Experience',
  queueTitleLine1: 'FILA DE',
  queueTitleLine2: 'SERVIÇO',
  queueSubtitle: 'Ordem de Prioridade',
  downloadUrl: '',
  downloadFileName: '',
  currentCallPosition: 1,
  voiceCallEnabled: false,
  lastCalledEmployeeId: null,
  lastCalledTimestamp: null,
  publicShuffleEnabled: false,
  publicShuffleStartTime: '08:00',
  publicShuffleEndTime: '18:00',
};

const ADMIN_EMAILS = ['l2xbrasil@gmail.com', 'sorteioadm@sorteio.com'];

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos

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

const SkeletonItem = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="glass p-5 md:p-6 rounded-[32px] border border-white/5 animate-pulse flex items-center justify-between">
    <div className="flex items-center gap-4 md:gap-6">
      <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/5" />
      <div className="space-y-2">
        <div className="h-4 w-32 bg-white/10 rounded-full" />
        <div className="h-2 w-20 bg-white/5 rounded-full" />
      </div>
    </div>
    <div className="w-10 h-10 rounded-2xl bg-white/5" />
  </div>
));

const SkeletonQueue = React.forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} className="space-y-4">
    {[1, 2, 3, 4, 5].map(i => <SkeletonItem key={i} />)}
  </div>
));

const SkeletonHistoryItem = () => (
  <div className="glass p-5 rounded-[32px] border border-white/5 animate-pulse flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <div className="h-2 w-20 bg-white/5 rounded-full" />
      <div className="h-2 w-12 bg-white/5 rounded-full" />
    </div>
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5" />
      <div className="space-y-2">
        <div className="h-3 w-24 bg-white/10 rounded-full" />
        <div className="h-2 w-16 bg-white/5 rounded-full" />
      </div>
    </div>
  </div>
);

const SkeletonHistory = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonHistoryItem key={i} />)}
  </div>
);

const SkeletonSettings = () => (
  <div className="glass p-8 rounded-[40px] border border-white/5 animate-pulse space-y-8">
    <div className="space-y-4">
      <div className="h-4 w-40 bg-white/10 rounded-full" />
      <div className="h-2 w-64 bg-white/5 rounded-full" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="space-y-3">
          <div className="h-2 w-16 bg-white/5 rounded-full ml-4" />
          <div className="h-14 w-full bg-white/5 rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

const SkeletonAdmins = () => (
  <div className="space-y-6 animate-pulse">
    <div className="glass p-6 md:p-8 rounded-[40px] space-y-6">
      <div className="h-6 w-48 bg-white/10 rounded-full" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-2 w-16 bg-white/5 rounded-full ml-4" />
            <div className="h-14 w-full bg-white/5 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-4">
      <div className="h-6 w-48 bg-white/10 rounded-full" />
      <div className="glass overflow-hidden rounded-[32px]">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/5 shrink-0" />
              <div className="space-y-2">
                <div className="h-3 w-32 bg-white/10 rounded-full" />
                <div className="h-2 w-24 bg-white/5 rounded-full" />
              </div>
            </div>
            <div className="h-4 w-20 bg-white/5 rounded-full hidden sm:block" />
            <div className="h-8 w-8 bg-white/5 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminTabLoader = ({ isLoading, children, skeleton: SkeletonComponent }: { isLoading: boolean, children: React.ReactNode, skeleton?: React.ReactNode }) => (
  <AnimatePresence mode="wait">
    {isLoading ? (
      <motion.div
        key="loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="w-full"
      >
        {SkeletonComponent || (
          <div className="glass p-20 rounded-[40px] flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full"
              />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 border-4 border-brand-secondary/20 rounded-full blur-sm" 
              />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-secondary animate-pulse">Carregando Dados...</p>
          </div>
        )}
      </motion.div>
    ) : (
      <motion.div
        key="content"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

// --- Components ---

const CallNotificationPopup = ({ employee, onClose, isAuthenticated, isLastCalled }: { employee: Employee, onClose: () => void, isAuthenticated: boolean, isLastCalled: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center bg-brand-bg select-none"
    >
      {/* Solid background for total focus */}
      <div className="absolute inset-0 bg-[#0a0f0c] pointer-events-none" />

      {/* Fullscreen Container */}
      <div className="w-full h-full max-h-screen flex flex-col items-center justify-center p-4 md:p-12 relative z-10 overflow-hidden">
        
        {/* Giant progress bar at the top */}
        <div className="absolute top-0 left-0 w-full h-3 bg-white/5">
          <motion.div 
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: "linear" }}
            className="h-full bg-brand-primary shadow-[0_0_30px_rgba(34,197,94,0.6)]"
          />
        </div>

        {/* Close Button (Icon) */}
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 text-white/20 hover:text-white transition-colors p-6 z-50"
        >
          <X className="w-10 h-10 md:w-16 md:h-16" />
        </button>

        {/* Announcement Header */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center gap-4 mb-6 md:mb-10"
        >
          <span className="text-sm md:text-2xl 2xl:text-4xl font-black uppercase tracking-[0.5em] text-brand-secondary animate-pulse">
            {isLastCalled ? "Finalizando Chamada" : "Chamada Prioritária"}
          </span>
          <div className="w-32 md:w-64 h-2 bg-brand-secondary/30 rounded-full" />
        </motion.div>

        {/* Giant Photo Area - Optimized for TV heights */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="relative mb-6 md:mb-12"
        >
          <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 2xl:w-[500px] 2xl:h-[500px] rounded-[40px] md:rounded-[60px] 2xl:rounded-[100px] overflow-hidden border-4 md:border-8 border-brand-primary shadow-[0_0_100px_rgba(34,197,94,0.4)] relative z-10 bg-brand-card">
            {employee.photoUrl ? (
              <img src={employee.photoUrl} alt={employee.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary">
                <UserIcon className="w-24 h-24 md:w-40 md:h-40 2xl:w-64 2xl:h-64" />
              </div>
            )}
          </div>
          
          {/* Giant Position Badge */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute -top-4 -right-4 md:-top-8 md:-right-8 w-16 h-16 md:w-24 md:h-24 2xl:w-40 2xl:h-40 bg-white text-brand-bg rounded-[20px] md:rounded-[40px] flex items-center justify-center font-black text-2xl md:text-4xl 2xl:text-7xl shadow-2xl z-20 border-4 md:border-8 border-brand-primary"
          >
            {employee.position}º
          </motion.div>
        </motion.div>

        {/* Name and Status Text */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center space-y-4 md:space-y-6 2xl:space-y-12 max-w-[90vw]"
        >
          <h3 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl 2xl:text-[12rem] font-black text-white uppercase tracking-tighter leading-none px-4 drop-shadow-2xl">
            {employee.name}
          </h3>
          
          <div className="inline-flex flex-col items-center gap-4 px-10 py-5 bg-white/5 rounded-[40px] border border-white/10 shadow-2xl">
            {isLastCalled ? (
              <span className="text-brand-primary font-black text-2xl md:text-5xl 2xl:text-7xl animate-bounce">
                (Chamada Encerrada)
              </span>
            ) : (
              <div className="flex items-center gap-4 md:gap-8">
                <Sparkles size={32} className="text-brand-secondary md:w-16 md:h-16 2xl:w-24 2xl:h-24" />
                <span className="text-lg md:text-4xl 2xl:text-6xl font-black uppercase tracking-widest text-white/90">
                  Próximo da Fila!
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Close Button (Admin Only) */}
        {isAuthenticated && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={onClose}
            className="mt-8 md:mt-12 2xl:mt-24 px-16 py-6 md:px-24 md:py-8 bg-brand-primary text-white font-black uppercase tracking-[0.3em] rounded-full shadow-2xl hover:scale-105 transition-all active:scale-95 text-xl md:text-3xl 2xl:text-5xl"
          >
            Entendido
          </motion.button>
        )}
      </div>

      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />
    </motion.div>
  );
};

const LotteryResultModal = ({ historyItem, onClose }: { historyItem: LotteryHistory, onClose: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-6"
    >
      <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-brand-card border border-white/10 rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary mb-1 block">
              Resultado Completo
            </span>
            <h3 className="text-2xl font-light uppercase tracking-tight text-white">
              Sorteio de <span className="font-black">{new Date(historyItem.timestamp).toLocaleDateString('pt-BR')}</span>
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 hover:text-white flex items-center justify-center transition-colors shadow-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 md:p-8 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
          <div className="flex items-center justify-between px-4 mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Ordem Gerada</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{historyItem.fullList.length} Colaboradores</span>
          </div>

          {historyItem.fullList.map((emp, index) => (
            <div 
              key={emp.id}
              className={`p-4 rounded-2xl flex items-center justify-between transition-all ${
                emp.id === historyItem.winnerId 
                ? 'bg-brand-primary/20 border border-brand-primary/30' 
                : 'bg-white/5 border border-white/5'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${
                  emp.id === historyItem.winnerId ? 'bg-brand-primary text-white' : 'bg-white/10 text-white/40'
                }`}>
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden shrink-0 border border-white/10 p-0.5">
                  {emp.photoUrl ? (
                    <img src={emp.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <UserIcon size={18} />
                    </div>
                  )}
                </div>
                <span className={`font-bold uppercase tracking-tight ${emp.id === historyItem.winnerId ? 'text-white' : 'text-white/70'}`}>
                  {emp.name}
                </span>
              </div>
              
              {emp.id === historyItem.winnerId && (
                <div className="flex items-center gap-2 text-brand-primary">
                  <Trophy size={14} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Vencedor</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Header = ({ onAdminClick, isAuthenticated, settings, localVoiceEnabled, onToggleVoice }: { 
  onAdminClick: () => void, 
  isAuthenticated: boolean, 
  settings: AppSettings,
  localVoiceEnabled: boolean,
  onToggleVoice: () => void
}) => (
  <header className="px-4 md:px-6 py-4 md:py-8 flex items-center justify-between sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md">
    <div className="flex items-center gap-2 md:gap-3">
      <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20 shrink-0">
        <Leaf className="text-white fill-white" size={16} />
      </div>
      <div className="min-w-0">
        <h1 className="text-[10px] md:text-sm font-black tracking-[0.1em] md:tracking-[0.2em] text-white leading-tight truncate">
          {settings.headerTitleLine1} <span className="hidden sm:inline">{settings.headerTitleLine2}</span>
        </h1>
        <p className="text-[8px] md:text-[10px] font-bold tracking-[0.2em] md:tracking-[0.3em] text-brand-secondary mt-0.5 uppercase truncate">{settings.headerSubtitle}</p>
      </div>
    </div>
    
    <div className="flex items-center gap-2 md:gap-3 shrink-0">
      <button 
        onClick={onToggleVoice}
        className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl glass flex items-center justify-center transition-all ${localVoiceEnabled ? 'text-brand-secondary' : 'text-white/30 hover:text-white/60'}`}
        title={localVoiceEnabled ? "Desativar chamada por voz" : "Ativar chamada por voz"}
      >
        {localVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>

      <button 
        onClick={onAdminClick}
        className={`w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl glass flex items-center justify-center transition-all ${isAuthenticated ? 'text-brand-secondary' : 'text-white/70 hover:text-white'}`}
        title={isAuthenticated ? "Painel Admin" : "Acessar painel restrito"}
      >
        {isAuthenticated ? <Settings size={16} /> : <Lock size={16} />}
      </button>
    </div>
  </header>
);

const Login = ({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) => {
  const [error, setError] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState('');
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
    if (!identifier || !password) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsLoading(true);
    try {
      let emailToUse = identifier;
      
      // Check if identifier is an email
      const isEmail = identifier.includes('@');
      
      if (!isEmail) {
        // Try to find email by username using the safe usernames mapping
        const usernameDoc = await getDoc(doc(db, 'usernames', identifier.toLowerCase()));
        
        if (usernameDoc.exists()) {
          emailToUse = usernameDoc.data().email;
        } else {
          // If not found in safe mapping, might be a legacy account or invalid username
          throw { code: 'auth/user-not-found' };
        }
      }

      await signInWithEmailAndPassword(auth, emailToUse, password);
      onLogin();
    } catch (err: any) {
      console.error("Email Login Error:", err);
      let message = "Erro ao fazer login.";
      
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = "Usuário/E-mail ou senha incorretos.";
      } else if (err.code === 'auth/invalid-email') {
        message = "O formato do e-mail é inválido.";
      } else if (err.code === 'auth/too-many-requests') {
        message = "Acesso bloqueado temporariamente por muitas tentativas falhas. Tente novamente mais tarde.";
      } else if (err.code === 'auth/user-disabled') {
        message = "Esta conta de administrador foi desativada.";
      }
      
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 md:px-6 py-8 md:py-12 bg-brand-bg">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md glass p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <button 
          onClick={onBack} 
          className="absolute top-4 md:top-6 left-4 md:left-6 text-white/30 hover:text-white transition-colors"
          title="Voltar ao Site"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="text-center mb-6 md:mb-8">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-primary rounded-2xl md:rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl rotate-3">
            <Lock size={24} className="md:w-7 md:h-7" />
          </div>
          <h2 className="text-xl md:text-2xl font-light uppercase tracking-tight text-white">Acesso Restrito</h2>
          <p className="text-brand-secondary text-[7px] md:text-[8px] font-black uppercase tracking-[0.3em] mt-1">Área Administrativa</p>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-3 md:space-y-4 mb-6 md:mb-8">
          <div className="space-y-1">
            <label className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Usuário ou E-mail</label>
            <input 
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin ou admin@exemplo.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Senha</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl py-3 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm"
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-primary text-white font-black uppercase tracking-[0.2em] py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="relative mb-6 md:mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-[7px] md:text-[8px] uppercase tracking-[0.3em]">
            <span className="bg-[#1a3442] px-4 text-white/30">Ou continue com</span>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-brand-bg font-black uppercase tracking-[0.2em] py-3.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-400 text-[9px] md:text-[10px] font-bold text-center uppercase tracking-widest mt-2"
            >
              {error}
            </motion.p>
          )}
          
          <p className="text-white/30 text-[7px] md:text-[8px] text-center uppercase tracking-widest leading-relaxed">
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
  currentAdminName,
  isShuffling,
  shuffleDisplay,
  onSetQueue,
  onUpdateEmployee,
  onDeleteHistoryItem,
  history,
  onClearHistory,
  onViewPublic,
  admins,
  onAddAdmin,
  onUpdateAdmin,
  onDeleteAdmin,
  currentUserRole,
  isLoadingQueue,
  isLoadingHistory,
  fileHistory,
  onDeleteFileHistoryItem,
  onClearFileHistory,
  onAddFileHistory,
  onResetQueue,
  isLoadingFileHistory,
  isLoadingAdmins,
  isLoadingSettings,
  addNotification,
  currentHistoryPage,
  setCurrentHistoryPage,
  ITEMS_PER_PAGE,
  speak
}: { 
  onLogout: () => void, 
  queue: Employee[], 
  onAdd: (name: string, photoUrl?: string) => void,
  onRemove: (id: string) => void,
  onToggleActive: (id: string, currentStatus: boolean) => void,
  settings: AppSettings,
  onUpdateSettings: (settings: AppSettings) => void,
  onShuffle: (type: 'manual' | 'automatic') => Promise<boolean>,
  currentAdminName: string,
  isShuffling: boolean,
  shuffleDisplay: Employee | null,
  onSetQueue: (queue: Employee[]) => void,
  onUpdateEmployee: (id: string, name: string, photoUrl?: string) => void,
  onDeleteHistoryItem: (id: string) => void,
  history: LotteryHistory[],
  onClearHistory: () => void,
  onViewPublic: () => void,
  admins: AdminUser[],
  onAddAdmin: (name: string, email: string, role: 'admin' | 'coordinator', password?: string, photoUrl?: string, username?: string) => Promise<void>,
  onUpdateAdmin: (id: string, updates: Partial<AdminUser>) => Promise<void>,
  onDeleteAdmin: (id: string) => Promise<void>,
  currentUserRole: 'admin' | 'coordinator' | null,
  isLoadingQueue: boolean,
  isLoadingHistory: boolean,
  fileHistory: FileHistory[],
  onDeleteFileHistoryItem: (id: string) => void,
  onClearFileHistory: () => void,
  onAddFileHistory: (fileName: string, fileSize: number, downloadUrl: string) => void,
  onResetQueue: () => Promise<void>,
  isLoadingFileHistory: boolean,
  isLoadingAdmins: boolean,
  isLoadingSettings: boolean,
  addNotification: (message: string, type?: 'success' | 'error' | 'info', description?: string) => void,
  currentHistoryPage: number,
  setCurrentHistoryPage: React.Dispatch<React.SetStateAction<number>>,
  ITEMS_PER_PAGE: number,
  speak: (text: string, force?: boolean) => void
}) => {
  const [newName, setNewName] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [activeCameraType, setActiveCameraType] = useState<'employees' | 'admins' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [adminName, setAdminName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhotoUrl, setAdminPhotoUrl] = useState('');
  const [adminRole, setAdminRole] = useState<'admin' | 'coordinator'>('coordinator');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [isAdminUploading, setIsAdminUploading] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [showAddAdminConfirm, setShowAddAdminConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCallNext = async () => {
    const activeQueueSorted = [...queue].filter(e => e.isActive).sort((a, b) => a.position - b.position);
    if (activeQueueSorted.length === 0) {
      addNotification('A fila está vazia ou todos estão inativos.', 'info');
      return;
    }
    
    const currentPos = settings.currentCallPosition || 1;
    // Encontrar o funcionário que está ATUALMENTE sendo mostrado como "Próximo"
    const personToCall = activeQueueSorted.find(e => e.position >= currentPos);
    
    if (!personToCall) {
      addNotification('Todos os funcionários já foram chamados!', 'info');
      return;
    }
    
    try {
      // 1. Falar o nome do funcionário
      if (settings.voiceCallEnabled) {
        speak(`Atenção: Próximo na fila, ${personToCall.name}`);
      }

      // 2. Avançar a posição para o próximo da fila
      // Encontramos quem vem DEPOIS do personToCall para definir a nova posição
      const nextOne = activeQueueSorted.find(e => e.position > personToCall.position);
      
      await onUpdateSettings({
        ...settings,
        currentCallPosition: nextOne ? nextOne.position : personToCall.position + 1,
        lastCalledEmployeeId: personToCall.id,
        lastCalledTimestamp: new Date().toISOString()
      });

      addNotification(`${personToCall.name} chamado com sucesso!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/global');
    }
  };

  const handlePrintHistory = (item: LotteryHistory) => {
    const dateStr = new Date(item.timestamp).toLocaleDateString('pt-BR');
    const timeStr = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const list = item.fullList || [];
    const mid = Math.ceil(list.length / 2);
    const leftCol = list.slice(0, mid);
    const rightCol = list.slice(mid);

    let html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fila do Almoço - ${dateStr}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 40px; 
              color: #1a1a1a;
              background: white;
            }
            .page {
              max-width: 1000px;
              margin: 0 auto;
            }
            .header { 
              text-align: center; 
              margin-bottom: 40px; 
              border-bottom: 4px solid #059669;
              padding-bottom: 25px;
            }
            .header h1 { 
              font-size: 32px; 
              font-weight: 900; 
              text-transform: uppercase;
              letter-spacing: 2px;
              color: #059669;
              margin-bottom: 8px;
            }
            .header p { 
              font-size: 18px; 
              color: #4b5563; 
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 3px;
            }
            .columns { 
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 60px;
            }
            .item { 
              display: flex; 
              align-items: center; 
              padding: 10px 0; 
              border-bottom: 1px solid #e5e7eb;
              page-break-inside: avoid;
            }
            .pos { 
              font-weight: 900; 
              width: 50px; 
              color: #059669;
              font-size: 16px;
            }
            .name { 
              font-weight: 700; 
              text-transform: uppercase; 
              font-size: 14px;
              color: #111827;
            }
            @media print {
              body { padding: 20px; }
              .header h1 { font-size: 26px; }
              .header p { font-size: 14px; }
              .item { padding: 8px 0; }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <h1>FILA DO ALMOÇO EDIFÍCIO AMAZONAS</h1>
              <p>DATA: ${dateStr} - ${timeStr}</p>
            </div>
            <div class="columns">
              <div class="column">
                ${leftCol.map((emp, i) => `
                  <div class="item">
                    <span class="pos">${i + 1}º</span>
                    <span class="name">${emp.name}</span>
                  </div>
                `).join('')}
              </div>
              <div class="column">
                ${rightCol.map((emp, i) => `
                  <div class="item">
                    <span class="pos">${mid + i + 1}º</span>
                    <span class="name">${emp.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => {
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      addNotification('Não foi possível abrir a janela de impressão. Verifique se os pop-ups estão bloqueados.', 'error');
    }
  };

  const handleDownloadPDF = async (item: LotteryHistory) => {
    const dateStr = new Date(item.timestamp).toLocaleDateString('pt-BR');
    const timeStr = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const list = item.fullList || [];
    const mid = Math.ceil(list.length / 2);
    const leftCol = list.slice(0, mid);
    const rightCol = list.slice(mid);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.width = '210mm'; // A4 width
    container.style.background = 'white';
    
    container.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 4px solid #059669; padding-bottom: 25px;">
          <h1 style="font-size: 28px; font-weight: 900; text-transform: uppercase; color: #059669; margin-bottom: 8px;">FILA DO ALMOÇO EDIFÍCIO AMAZONAS</h1>
          <p style="font-size: 16px; color: #4b5563; font-weight: 700; text-transform: uppercase;">DATA: ${dateStr} - ${timeStr}</p>
        </div>
        <div style="display: flex; gap: 60px;">
          <div style="flex: 1;">
            ${leftCol.map((emp, i) => `
              <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 900; width: 40px; color: #059669; font-size: 14px;">${i + 1}º</span>
                <span style="font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111827;">${emp.name}</span>
              </div>
            `).join('')}
          </div>
          <div style="flex: 1;">
            ${rightCol.map((emp, i) => `
              <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 900; width: 40px; color: #059669; font-size: 14px;">${mid + i + 1}º</span>
                <span style="font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111827;">${emp.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin: 10,
      filename: `fila-almoco-${dateStr.replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        logging: false
      },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      addNotification('Gerando PDF...', 'info');
      // Ensure element is in DOM and styles are applied
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await html2pdf().set(opt).from(container).save();
      
      addNotification('PDF baixado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      addNotification('Erro ao gerar PDF.', 'error');
    } finally {
      // Small delay before cleanup to be safe
      setTimeout(() => {
        if (container.parentNode) {
          document.body.removeChild(container);
        }
      }, 500);
    }
  };
  
  const handleShareHistory = async (item: LotteryHistory) => {
    const dateStr = new Date(item.timestamp).toLocaleDateString('pt-BR');
    const timeStr = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    // Generate PDF content (similar to handleDownloadPDF)
    const list = item.fullList || [];
    const mid = Math.ceil(list.length / 2);
    const leftCol = list.slice(0, mid);
    const rightCol = list.slice(mid);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    container.style.width = '210mm';
    container.style.background = 'white';
    
    container.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; color: #1a1a1a;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 4px solid #059669; padding-bottom: 25px;">
          <h1 style="font-size: 28px; font-weight: 900; text-transform: uppercase; color: #059669; margin-bottom: 8px;">FILA DO ALMOÇO EDIFÍCIO AMAZONAS</h1>
          <p style="font-size: 16px; color: #4b5563; font-weight: 700; text-transform: uppercase;">DATA: ${dateStr} - ${timeStr}</p>
        </div>
        <div style="display: flex; gap: 60px;">
          <div style="flex: 1;">
            ${leftCol.map((emp, i) => `
              <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 900; width: 40px; color: #059669; font-size: 14px;">${i + 1}º</span>
                <span style="font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111827;">${emp.name}</span>
              </div>
            `).join('')}
          </div>
          <div style="flex: 1;">
            ${rightCol.map((emp, i) => `
              <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <span style="font-weight: 900; width: 40px; color: #059669; font-size: 14px;">${mid + i + 1}º</span>
                <span style="font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111827;">${emp.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    const opt = {
      margin: 10,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      addNotification('Preparando PDF para compartilhamento...', 'info');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
      const fileName = `fila-almoco-${dateStr.replace(/\//g, '-')}.pdf`;
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Fila do Almoço - ${dateStr}`,
          text: `Resultado do Sorteio Amazonas - ${dateStr}`
        });
      } else if (navigator.share) {
        // Fallback to text sharing if file sharing is not supported
        const text = `🏆 Resultado do Sorteio - ${dateStr} às ${timeStr}\n\n` +
          `Vencedor: ${item.winnerName}\n\n` +
          `Confira a fila completa acessando nosso portal.`;
          
        await navigator.share({
          title: `Sorteio Amazonas - ${dateStr}`,
          text: text,
          url: window.location.origin
        });
      } else {
        const text = `🏆 Resultado do Sorteio - ${dateStr} às ${timeStr}\n\nVencedor: ${item.winnerName}\n\n${window.location.origin}`;
        await navigator.clipboard.writeText(text);
        addNotification('Resumo copiado. O navegador não suporta compartilhamento de arquivos.', 'success');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Erro ao compartilhar PDF:', err);
        addNotification('Erro ao compartilhar PDF.', 'error');
      }
    } finally {
      if (container.parentNode) {
        document.body.removeChild(container);
      }
    }
  };

  const handleDownloadXlsxHistory = (item: LotteryHistory) => {
    try {
      const projectName = `${settings.headerTitleLine1} ${settings.headerTitleLine2}`.trim();
      const drawDate = new Date(item.timestamp).toLocaleDateString('pt-BR');
      const drawTime = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      const headerRows = [
        ["LOGOTIPO", "", ""],
        ["OBRA:", projectName.toUpperCase(), ""],
        ["DATA DO SORTEIO:", `${drawDate} ${drawTime}`, ""],
        ["", "", ""],
        ["N°", "NOME DO FUNCIONÁRIO", ""]
      ];

      const dataRows = item.fullList.map((emp, index) => [
        `${index + 1}º`,
        emp.name.toUpperCase(),
        ""
      ]);

      const allRows = [...headerRows, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(allRows);

      ws['!cols'] = [
        { wch: 10 },
        { wch: 50 },
      ];

      ws['!merges'] = [
        { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
        { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Fila");

      const fileName = `fila_${drawDate.replace(/\//g, '-')}_${projectName.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      addNotification('XLSX baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar XLSX:', error);
      addNotification('Erro ao exportar Excel.', 'error');
    }
  };

  const [activeTab, setActiveTab] = useState<'queue' | 'employees' | 'settings' | 'lottery' | 'database' | 'history' | 'admins' | 'files'>('queue');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');

  const handleLinkSubmit = async () => {
    if (!linkUrl) {
      addNotification('Por favor, insira um link válido.', 'error');
      return;
    }

    try {
      // Update settings
      await onUpdateSettings({
        ...settings,
        downloadUrl: linkUrl,
        downloadFileName: linkName || 'Aplicativo'
      });
      
      // Add to history
      await onAddFileHistory(linkName || 'Link Externo', 0, linkUrl);
      
      addNotification('Link configurado com sucesso!', 'success');
      setLinkUrl('');
      setLinkName('');
    } catch (error: any) {
      console.error('Error setting link:', error);
      addNotification('Erro ao configurar link.', 'error', error.message);
    }
  };


  const uploadFile = async (file: File, type: 'employees' | 'admins' | 'settings') => {
    // 5MB Limit
    if (file.size > 5 * 1024 * 1024) {
      addNotification("Arquivo muito grande. O limite é 5MB.", 'error');
      return null;
    }

    try {
      const storageRef = ref(storage, `${type}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error(`Error uploading to ${type}:`, error);
      addNotification("Erro ao fazer upload da imagem.", 'error', error.message);
      return null;
    }
  };

  const handleAdminFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAdminUploading(true);
    const url = await uploadFile(file, 'admins');
    if (url) {
      setAdminPhotoUrl(url);
      addNotification("Foto do administrador carregada!", 'success');
    }
    setIsAdminUploading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const url = await uploadFile(file, 'employees');
    if (url) {
      setNewPhotoUrl(url);
      addNotification("Foto carregada com sucesso!", 'success');
    }
    setIsUploading(false);
  };

  const handleHeroBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsHeroUploading(true);
    const url = await uploadFile(file, 'settings');
    if (url) {
      setTempSettings({ ...tempSettings, heroBackgroundImage: url });
      addNotification("Imagem de fundo carregada!", 'success');
    }
    setIsHeroUploading(false);
  };

  const handleShuffleClick = async () => {
    const activeEmployees = queue.filter(e => e.isActive);
    if (activeEmployees.length < 2) {
      addNotification('Mínimo de 2 funcionários ativos necessário para o sorteio.', 'error');
      return;
    }

    try {
      await onShuffle('manual');
    } catch (e: any) {
      console.error('Erro ao chamar onShuffle:', e);
      addNotification('Erro ao processar sorteio manual.', 'error', e.message);
    }
  };

  const startCamera = async (type: 'employees' | 'admins') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
        setActiveCameraType(type);
      }
    } catch (err) {
      console.error('Error starting camera:', err);
      addNotification("Erro ao acessar a câmera. Verifique as permissões.", "error");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraOpen(false);
      setActiveCameraType(null);
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current && activeCameraType) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      const size = Math.min(video.videoWidth, video.videoHeight);
      const startX = (video.videoWidth - size) / 2;
      const startY = (video.videoHeight - size) / 2;
      
      canvas.width = 400; 
      canvas.height = 400;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, startX, startY, size, size, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
          
          if (activeCameraType === 'employees') {
            await handleFileUpload(file);
          } else {
            setIsAdminUploading(true);
            const url = await uploadFile(file, 'admins');
            if (url) {
              setAdminPhotoUrl(url);
              addNotification("Foto do administrador capturada!", 'success');
            }
            setIsAdminUploading(false);
          }
          stopCamera();
        } catch (err) {
          console.error('Error processing captured photo:', err);
          addNotification('Erro ao processar foto capturada.', 'error');
        }
      }
    }
  };

  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  
  // Sync tempSettings with settings prop when it changes
  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);
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


  return (
    <div className="min-h-screen bg-brand-bg p-4 md:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-light uppercase tracking-tight text-white">Painel <span className="font-black">Admin</span></h2>
            <p className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.4em] mt-2">Gerenciamento Local</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={onViewPublic}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 sm:py-3 rounded-2xl glass text-white hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Ver Site
            </button>
            <button 
              onClick={onLogout}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 sm:py-3 rounded-2xl glass text-red-400 hover:bg-red-500/10 transition-all text-xs font-black uppercase tracking-widest"
              title="Sair do Painel"
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </div>

        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 p-1.5 bg-white/5 backdrop-blur-xl rounded-[24px] w-full border border-white/5">
          <div className="flex gap-1.5 min-w-max p-1">
            {[
              { id: 'queue', label: 'Fila', icon: <Users size={16} /> },
              ...(currentUserRole === 'admin' ? [
                { id: 'employees', label: 'Funcionários', icon: <Users size={16} /> },
              ] : []),
              { id: 'lottery', label: 'Sorteio', icon: <Dices size={16} /> },
              ...(currentUserRole === 'admin' ? [
                { id: 'settings', label: 'Configurações', icon: <Settings size={16} /> },
                { id: 'files', label: 'Arquivos', icon: <FileText size={16} /> },
              ] : []),
              { id: 'history', label: 'Histórico', icon: <History size={16} /> },
              ...(currentUserRole === 'admin' ? [
                { id: 'database', label: 'Banco de Dados', icon: <Database size={16} /> },
                { id: 'admins', label: 'Admins', icon: <Shield size={16} /> }
              ] : [])
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 relative group overflow-hidden ${
                  activeTab === tab.id 
                    ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <span className={`${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                  {tab.icon}
                </span>
                <span className="relative z-10">{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer"
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'queue' && (
          <AdminTabLoader isLoading={isLoadingQueue} skeleton={<SkeletonQueue />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 space-y-8">
                {/* Vencedor Atual Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Chamada em Destaque</h3>
                  </div>
                  {/* ... same winner card content but maybe enhanced ... */}
                  {(() => {
                    const currentPos = settings.currentCallPosition || 1;
                    const activeQueueSorted = [...queue].filter(e => e.isActive).sort((a, b) => a.position - b.position);
                    const winner = activeQueueSorted.find(e => e.position >= currentPos) || activeQueueSorted[0];
                    
                    if (!winner) return null;
                    
                    const prevPositions = history.map(h => {
                      const p = h.fullList.findIndex(e => e.id === winner.id);
                      return p !== -1 ? p + 1 : null;
                    }).filter(p => p !== null).slice(0, 5);

                    const lastActive = activeQueueSorted[activeQueueSorted.length - 1];
                    const isEndOfRound = winner.id === lastActive?.id;

                    return (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass overflow-hidden rounded-[48px] flex flex-col border border-white/5 relative shadow-2xl shadow-black/40"
                      >
                        {isEndOfRound && (
                          <div className="absolute top-0 inset-x-0 z-20 bg-brand-primary/90 backdrop-blur-xl py-4 text-center border-b border-white/10 shadow-lg">
                            <span className="text-[11px] font-black uppercase tracking-[0.6em] text-white animate-pulse">
                              RODADA FINALIZADA
                            </span>
                          </div>
                        )}
                        
                        <div className="h-72 md:h-[400px] w-full relative overflow-hidden bg-brand-bg/40">
                          {winner.photoUrl ? (
                            <img 
                              src={winner.photoUrl} 
                              alt={winner.name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/5">
                              <Users size={120} strokeWidth={1} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/20 to-transparent" />
                          <div className="absolute bottom-10 left-10">
                            <motion.div 
                              initial={{ x: -20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="flex flex-col gap-3"
                            >
                              <span className="w-fit px-5 py-2 bg-brand-secondary text-brand-bg text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl shadow-brand-secondary/40">
                                Próximo da Vez
                              </span>
                              <h4 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white drop-shadow-2xl">
                                {winner.name}
                              </h4>
                            </motion.div>
                          </div>
                        </div>

                        <div className="p-10 md:p-14 bg-gradient-to-b from-brand-bg/50 to-transparent">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1.5 p-4 bg-white/5 rounded-3xl border border-white/5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate ml-1">Posição</span>
                                  <div className="flex items-end gap-1">
                                    <span className="text-3xl font-black text-brand-secondary leading-none">{winner.position}º</span>
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-1">Lugar</span>
                                  </div>
                                </div>
                                <div className="space-y-1.5 p-4 bg-white/5 rounded-3xl border border-white/5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 truncate ml-1">Percentual</span>
                                  <div className="flex items-end gap-1">
                                    <span className="text-3xl font-black text-white/80 leading-none">
                                      {Math.round((winner.position / activeQueueSorted.length) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">Histórico Recente</span>
                                <div className="flex flex-wrap gap-2.5">
                                  {prevPositions.length > 0 ? prevPositions.map((pos, i) => (
                                    <span key={i} className="w-12 h-10 flex items-center justify-center bg-white/5 rounded-xl text-[11px] font-black text-white/40 border border-white/5 hover:border-brand-secondary/30 transition-all">
                                      {pos}º
                                    </span>
                                  )) : (
                                    <span className="px-6 py-3 bg-white/5 rounded-2xl text-[10px] font-black text-white/10 uppercase tracking-widest border border-white/5 w-full text-center">
                                      Nenhum sorteio registrado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col justify-end space-y-4">
                              <button 
                                onClick={handleCallNext}
                                className="w-full h-20 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-[28px] flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-brand-primary/40 group active:scale-95"
                              >
                                <span className="p-3 bg-white/10 rounded-2xl group-hover:bg-white/20 transition-all group-hover:scale-110">
                                  <Volume2 size={24} />
                                </span>
                                Chamar Próximo
                                <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
                              </button>
                              <p className="text-[10px] text-white/20 text-center font-black uppercase tracking-widest">
                                Atalho: Tecla ESPAÇO para chamar
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </div>

                {/* Lista Completa Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-6 bg-brand-secondary rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]" />
                      <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Fila Completa ({queue.filter(e => e.isActive).length})</h3>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isLoadingQueue ? (
                      <SkeletonQueue />
                    ) : (
                      [...queue].filter(e => e.isActive).sort((a, b) => {
                        const currentPos = settings.currentCallPosition || 1;
                        const aCalled = a.position < currentPos;
                        const bCalled = b.position < currentPos;
                        if (aCalled !== bCalled) return aCalled ? 1 : -1;
                        return a.position - b.position;
                      }).map((emp) => {
                        const isCalled = emp.position < (settings.currentCallPosition || 1);
                        const isNext = emp.position === (settings.currentCallPosition || 1);
                        
                        return (
                          <motion.div 
                            key={emp.id} 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`glass p-5 rounded-[32px] flex items-center justify-between group border transition-all ${
                              isNext 
                                ? 'bg-brand-secondary/10 border-brand-secondary/40 shadow-xl shadow-brand-secondary/10' 
                                : isCalled 
                                  ? 'opacity-40 grayscale border-white/5' 
                                  : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg overflow-hidden shrink-0 border-2 transition-all ${
                                isNext 
                                  ? 'bg-brand-secondary text-brand-bg border-brand-secondary/20 rotate-3' 
                                  : isCalled 
                                    ? 'bg-white/5 border-white/5' 
                                    : 'bg-white/5 border-white/10 group-hover:border-white/20'
                              }`}>
                                {emp.photoUrl ? (
                                  <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <span className={isNext ? 'text-brand-bg' : 'text-white/20'}>{emp.position}º</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className={`font-black uppercase tracking-tight text-sm block truncate ${isNext ? 'text-brand-secondary' : 'text-white'}`}>
                                  {emp.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                                    Posição {emp.position}º
                                  </span>
                                  {isNext && (
                                    <span className="px-2 py-0.5 bg-brand-secondary text-brand-bg text-[7px] font-black uppercase rounded-full animate-pulse">ATUAL</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isCalled && <Check size={16} className="text-brand-primary shrink-0" />}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                  {!isLoadingQueue && queue.filter(e => e.isActive).length === 0 && (
                    <div className="glass p-20 rounded-[48px] text-center border border-dashed border-white/10">
                      <Users size={48} className="mx-auto mb-4 text-white/5" />
                      <p className="text-white/20 uppercase tracking-[0.3em] text-[10px] font-black">A fila está vazia no momento.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Section */}
              <div className="lg:col-span-4 space-y-6">
                {/* Status Card */}
                <div className="glass p-8 rounded-[40px] border border-white/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={80} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-secondary mb-8">Estado do Sistema</h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-3xl border border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-white/40 text-[9px] font-black uppercase tracking-widest leading-none">Database</span>
                        <span className="text-white text-xs font-bold uppercase tracking-tight">Firebase Realtime</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <span className="text-green-500 text-[8px] font-black uppercase tracking-widest">Ativo</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                        <span className="text-white/30 text-[8px] font-black uppercase tracking-widest block mb-1">Ativos</span>
                        <span className="text-2xl font-black text-white">{queue.filter(e => e.isActive).length}</span>
                      </div>
                      <div className="p-4 bg-white/5 rounded-3xl border border-white/5">
                        <span className="text-white/30 text-[8px] font-black uppercase tracking-widest block mb-1">Total</span>
                        <span className="text-2xl font-black text-white">{queue.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ações Rápidas Card */}
                <div className="glass p-8 rounded-[40px] border border-white/10">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-primary mb-6">Ações Rápidas</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                        const newStatus = !settings.voiceCallEnabled;
                        onUpdateSettings({ ...settings, voiceCallEnabled: newStatus });
                        if (newStatus) speak('Voz habilitada.', true);
                      }}
                      className={`w-full group flex items-center gap-4 p-5 rounded-3xl transition-all border ${
                        settings.voiceCallEnabled 
                          ? 'bg-brand-primary/10 border-brand-primary/30' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl transition-all ${
                        settings.voiceCallEnabled ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30' : 'bg-white/5 text-white/30'
                      }`}>
                        <Volume2 size={20} />
                      </div>
                      <div className="text-left">
                        <span className="text-[11px] font-black uppercase tracking-widest text-white/80 block">Chamada por Voz</span>
                        <span className={`text-[8px] uppercase font-black tracking-widest ${settings.voiceCallEnabled ? 'text-brand-primary' : 'text-white/20'}`}>
                          {settings.voiceCallEnabled ? 'Ativado' : 'Desativado'}
                        </span>
                      </div>
                    </button>

                    <button 
                      onClick={onResetQueue}
                      className="w-full group flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 transition-all text-left"
                    >
                      <div className="p-3 bg-white/5 rounded-2xl text-white/30 group-hover:text-red-400 group-hover:bg-red-500/10 transition-all">
                        <RefreshCw size={20} />
                      </div>
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-white/80 block">Limpar Fila</span>
                        <span className="text-[8px] text-white/20 uppercase font-black tracking-widest">Zerar todos os status</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </AdminTabLoader>
        )}

        {activeTab === 'employees' && currentUserRole === 'admin' && (
          <AdminTabLoader isLoading={isLoadingQueue} skeleton={<SkeletonQueue />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-12">
                <div className="glass p-8 rounded-[48px] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-8 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <UserPlus size={160} />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary">
                        <UserPlus size={20} />
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                        Cadastro de Funcionários
                      </h3>
                    </div>
                    <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em] ml-1">Gerencie a base de dados do empreendimento</p>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const newQueue = queue.map(emp => ({ ...emp, isActive: true }));
                        onSetQueue(newQueue);
                        addNotification('Todos os funcionários foram ativados.', 'success');
                      }}
                      className="px-6 py-3 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-green-500/10"
                    >
                      Ativar Todos
                    </button>
                    <button 
                      onClick={() => {
                        const newQueue = queue.map(emp => ({ ...emp, isActive: false }));
                        onSetQueue(newQueue);
                        addNotification('Todos os funcionários foram desativados.', 'info');
                      }}
                      className="px-6 py-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/10"
                    >
                      Desativar Todos
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-8">
                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-8 sticky top-8">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand-secondary ml-2">
                    {editingId ? 'EDITAR DADOS' : 'NOVO REGISTRO'}
                  </h3>
                  
                  <div className="space-y-6">
                    {isCameraOpen ? (
                      <div className="relative rounded-[32px] overflow-hidden bg-black aspect-square shadow-2xl shadow-black/60">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover mirror"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute bottom-8 inset-x-0 flex justify-center items-center gap-4">
                          <button
                            onClick={stopCamera}
                            className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-all shadow-xl"
                          >
                            <X size={24} />
                          </button>
                          <button
                            onClick={capturePhoto}
                            className="w-20 h-20 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-[0_0_30px_rgba(5,150,105,0.6)] hover:scale-110 active:scale-90 transition-all border-4 border-white/20"
                          >
                            <Camera size={32} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex justify-center">
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
                              className="w-40 h-40 bg-white/5 border-2 border-white/10 border-dashed rounded-[40px] flex flex-col items-center justify-center text-white/20 hover:text-brand-secondary hover:border-brand-secondary/50 cursor-pointer transition-all overflow-hidden group shadow-inner"
                            >
                              {newPhotoUrl ? (
                                <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  {isUploading ? (
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/10 border-t-brand-secondary" />
                                  ) : (
                                    <>
                                      <Upload size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                                      <span className="text-[9px] font-black uppercase tracking-widest">Enviar Foto</span>
                                    </>
                                  )}
                                </>
                              )}
                            </label>
                            <button
                              onClick={() => startCamera('employees')}
                              className="absolute -bottom-2 -right-2 w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-brand-primary/40 hover:scale-110 active:scale-95 transition-all outline outline-4 outline-brand-bg/50"
                              title="Tirar Foto"
                            >
                              <Camera size={20} />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Nome Social</label>
                            <input 
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="Digite o nome..."
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold placeholder:text-white/10"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Link da Foto (Opcional)</label>
                            <input 
                              type="text"
                              value={newPhotoUrl}
                              onChange={(e) => setNewPhotoUrl(e.target.value)}
                              placeholder="URL da imagem externa..."
                              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-[10px] font-medium"
                            />
                          </div>

                          <div className="flex gap-3 pt-4">
                            <button 
                              onClick={() => {
                                if (newName.trim()) {
                                  if (editingId) {
                                    onUpdateEmployee(editingId, newName, newPhotoUrl || undefined);
                                    setEditingId(null);
                                    addNotification('Funcionário atualizado!', 'success');
                                  } else {
                                    onAdd(newName, newPhotoUrl || undefined);
                                    addNotification('Funcionário adicionado!', 'success');
                                  }
                                  setNewName('');
                                  setNewPhotoUrl('');
                                }
                              }}
                              className="flex-1 h-16 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-[24px] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                            >
                              {editingId ? <Check size={20} /> : <Plus size={20} />}
                              {editingId ? 'Salvar Edição' : 'Cadastrar na Fila'}
                            </button>
                            {editingId && (
                              <button 
                                onClick={() => {
                                  setEditingId(null);
                                  setNewName('');
                                  setNewPhotoUrl('');
                                }}
                                className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all border border-white/10"
                              >
                                <X size={24} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Lista de Funcionários</h3>
                  <div className="flex-1" />
                  <div className="relative w-full max-w-[200px]">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                    <input 
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-[10px] text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all placeholder:text-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {isLoadingQueue ? (
                    <div className="grid grid-cols-1 gap-3">
                       {[1,2,3,4,5].map(i => <div key={i} className="glass h-20 rounded-3xl animate-pulse" />)}
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {[...queue]
                        .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((emp) => (
                          <motion.div 
                            key={emp.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: emp.isActive ? 1 : 0.4, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`glass p-4 rounded-[32px] flex items-center justify-between group border border-white/5 hover:border-white/20 transition-all`}
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-14 h-14 bg-brand-bg/50 rounded-2xl flex items-center justify-center text-white/20 font-black text-xs overflow-hidden shrink-0 border border-white/5 group-hover:scale-105 transition-transform">
                                {emp.photoUrl ? (
                                  <img src={emp.photoUrl} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <Users size={20} />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-white font-black uppercase tracking-tight text-base block mb-1">{emp.name}</span>
                                <div className="flex items-center gap-2 mb-3">
                                  <div className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                                  <span className={`text-[9px] font-black uppercase tracking-widest ${emp.isActive ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                    {emp.isActive ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-1.5 transition-all">
                                  <button 
                                    onClick={() => {
                                      if (settings.voiceCallEnabled) {
                                        speak(`Teste de chamada: ${emp.name}`);
                                      } else {
                                        addNotification('Voz desativada. Ative nas configurações para testar.', 'info');
                                      }
                                    }}
                                    className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"
                                    title="Testar Chamada"
                                  >
                                    <Volume2 size={16} />
                                  </button>
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
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                      emp.isActive 
                                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white' 
                                        : 'bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white'
                                    }`}
                                    title={emp.isActive ? 'Desativar' : 'Ativar'}
                                  >
                                    {emp.isActive ? <X size={16} /> : <Check size={16} />}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (window.confirm(`Deseja realmente excluir ${emp.name}?`)) {
                                        onRemove(emp.id);
                                      }
                                    }}
                                    className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                  )}
                  {!isLoadingQueue && queue.length === 0 && (
                    <div className="glass p-20 rounded-[48px] text-center border border-dashed border-white/5">
                      <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Nenhum funcionário cadastrado.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </AdminTabLoader>
        )}

        {activeTab === 'lottery' && (
          <AdminTabLoader isLoading={isLoadingSettings} skeleton={<SkeletonSettings />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sorteio Casual Card */}
              <div className="lg:col-span-12">
                <div className="glass p-10 rounded-[48px] border border-white/10 relative overflow-hidden group shadow-2xl shadow-brand-secondary/5">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                    <Dices size={200} />
                  </div>
                  
                  {isShuffling && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-brand-bg/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-8"
                    >
                      <div className="relative mb-12">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="w-48 h-48 border-2 border-dashed border-brand-secondary/30 rounded-full"
                        />
                        <motion.div 
                          animate={{ rotate: -360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-4 border-2 border-brand-primary/40 rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            {shuffleDisplay && (
                              <motion.div
                                key={shuffleDisplay.id}
                                initial={{ scale: 0.2, opacity: 0, rotate: -20 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 2, opacity: 0, rotate: 20 }}
                                className="w-28 h-28 rounded-3xl bg-white/10 overflow-hidden border-2 border-white/20 shadow-2xl"
                              >
                                {shuffleDisplay.photoUrl ? (
                                  <img src={shuffleDisplay.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl font-black text-white bg-gradient-to-br from-brand-primary to-brand-secondary">
                                    {shuffleDisplay.name.charAt(0)}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="space-y-3 text-center">
                        <h4 className="text-brand-secondary font-black uppercase tracking-[0.6em] text-sm animate-pulse">Processando Embaralhamento</h4>
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Aguarde a geração da nova sequência</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-brand-secondary/10 rounded-3xl flex items-center justify-center text-brand-secondary shadow-inner">
                          <Sparkles size={32} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Sorteio Casual</h3>
                          <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Acionamento Manual Instantâneo</p>
                        </div>
                      </div>
                      <p className="text-white/60 text-sm leading-relaxed max-w-md">
                        O sorteio casual permite que você gere uma nova ordem de chamada imediatamente. Todos os funcionários ativos serão embaralhados aleatoriamente.
                      </p>
                      
                      <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                          <Users size={16} className="text-brand-secondary" />
                          <span className="text-xs font-black uppercase tracking-widest text-white/80">
                            {queue.filter(e => e.isActive).length} Ativos
                          </span>
                        </div>
                        <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/5">
                          <Activity size={16} className="text-brand-primary" />
                          <span className="text-xs font-black uppercase tracking-widest text-white/80">Pronto</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button 
                        onClick={handleShuffleClick}
                        disabled={isShuffling || queue.filter(e => e.isActive).length < 2}
                        className="w-full h-24 bg-brand-secondary hover:bg-brand-secondary/90 text-brand-bg font-black uppercase tracking-[0.3em] text-sm rounded-[32px] shadow-2xl shadow-brand-secondary/20 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale group"
                      >
                        <Dices size={28} className="group-hover:rotate-12 transition-transform" />
                        Gerar Nova Fila Agora
                      </button>
                      {queue.filter(e => e.isActive).length < 2 && (
                        <div className="flex items-center justify-center gap-2 text-red-400/80">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Mínimo de 2 funcionários ativos necessário
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sorteio Programado Card */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Programação Automática</h3>
                </div>
                
                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-8 h-full bg-blue-500/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${settings.lotteryEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-white/20'}`}>
                        <Timer size={28} />
                      </div>
                      <div className="text-left space-y-1">
                        <h4 className="text-lg font-black uppercase tracking-tight text-white leading-none">Sorteio Diário</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${settings.lotteryEnabled ? 'text-green-500' : 'text-white/20'}`}>
                          {settings.lotteryEnabled ? 'Ativado pelo sistema' : 'Em pausa manual'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const enabled = !settings.lotteryEnabled;
                        onUpdateSettings({ 
                          ...settings, 
                          lotteryEnabled: enabled,
                          lotteryEnabledBy: enabled ? currentAdminName : (settings.lotteryEnabledBy || '')
                        });
                      }}
                      className={`w-16 h-8 rounded-full transition-all relative p-1 ${settings.lotteryEnabled ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.lotteryEnabled ? 32 : 0 }}
                        className="w-6 h-6 rounded-full bg-white shadow-xl"
                      />
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Dias da Semana</label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => {
                          const isSelected = settings.lotteryDays.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                const newDays = isSelected
                                  ? settings.lotteryDays.filter(d => d !== i)
                                  : [...settings.lotteryDays, i].sort();
                                onUpdateSettings({ ...settings, lotteryDays: newDays });
                              }}
                              className={`h-12 rounded-xl text-[11px] font-black transition-all border ${
                                isSelected
                                  ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                  : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Horário do Evento</label>
                      <div className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-3xl p-5 group hover:border-blue-500/30 transition-all">
                        <Clock size={20} className="text-blue-500" />
                        <input 
                          type="time" 
                          value={settings.lotteryTime}
                          onChange={(e) => onUpdateSettings({ ...settings, lotteryTime: e.target.value })}
                          className="bg-transparent text-white text-xl font-black focus:outline-none w-full [color-scheme:dark] tracking-tighter"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                    <p className="text-[10px] text-blue-400/80 leading-relaxed font-black uppercase tracking-widest text-center">
                      O sistema gera a fila automaticamente no horário definido
                    </p>
                  </div>
                </div>
              </div>

              {/* Sorteio Público Card */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Liberação Pública</h3>
                </div>

                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-8 h-full bg-purple-500/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${settings.publicShuffleEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/20'}`}>
                        <Globe size={28} />
                      </div>
                      <div className="text-left space-y-1">
                        <h4 className="text-lg font-black uppercase tracking-tight text-white leading-none">Sorteio Público</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${settings.publicShuffleEnabled ? 'text-purple-400' : 'text-white/20'}`}>
                          {settings.publicShuffleEnabled ? 'Botão visível para todos' : 'Acesso restrito a admins'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        onUpdateSettings({ 
                          ...settings, 
                          publicShuffleEnabled: !settings.publicShuffleEnabled
                        });
                      }}
                      className={`w-16 h-8 rounded-full transition-all relative p-1 ${settings.publicShuffleEnabled ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/10'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.publicShuffleEnabled ? 32 : 0 }}
                        className="w-6 h-6 rounded-full bg-white shadow-xl"
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Início Liberação</label>
                      <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-3xl p-5 group hover:border-purple-500/30 transition-all">
                        <input 
                          type="time" 
                          value={settings.publicShuffleStartTime || '08:00'}
                          onChange={(e) => onUpdateSettings({ ...settings, publicShuffleStartTime: e.target.value })}
                          className="bg-transparent text-white text-lg font-black focus:outline-none w-full [color-scheme:dark] tracking-tighter"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-4">Fim Liberação</label>
                      <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-3xl p-5 group hover:border-purple-500/30 transition-all">
                        <input 
                          type="time" 
                          value={settings.publicShuffleEndTime || '18:00'}
                          onChange={(e) => onUpdateSettings({ ...settings, publicShuffleEndTime: e.target.value })}
                          className="bg-transparent text-white text-lg font-black focus:outline-none w-full [color-scheme:dark] tracking-tighter"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                    <p className="text-[10px] text-purple-400/80 leading-relaxed font-black uppercase tracking-widest text-center">
                      Qualquer usuário poderá acionar o sorteio no período definido
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AdminTabLoader>
        )}

        {activeTab === 'database' && currentUserRole === 'admin' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-12">
              <div className="glass p-10 rounded-[48px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 mb-4 relative overflow-hidden bg-brand-primary/[0.02]">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <Database size={200} />
                </div>
                <div className="space-y-3 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary">
                      <Database size={32} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Manutenção de Dados</h3>
                      <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Gestão Avançada da Base de Funcionários</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-4 px-4">
                <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Backups e Exportação</h3>
              </div>
              <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6">
                <p className="text-white/40 text-xs leading-relaxed px-2">Baixe o estado atual da sua fila para manter backups de segurança ou migrar dados.</p>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={handleExportXlsx}
                    className="w-full h-20 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white font-black uppercase tracking-[0.2em] rounded-3xl transition-all flex items-center justify-center gap-4 border border-green-500/20 group"
                  >
                    <div className="p-3 bg-green-500/10 rounded-2xl group-hover:bg-white/20 transition-all">
                      <Archive size={24} />
                    </div>
                    Planilha Excel (XLSX)
                  </button>
                  <button 
                    onClick={handleExport}
                    className="w-full h-20 bg-white/5 hover:bg-white text-white/60 hover:text-brand-bg font-black uppercase tracking-[0.2em] rounded-3xl transition-all flex items-center justify-center gap-4 border border-white/5 group"
                  >
                    <div className="p-3 bg-white/10 rounded-2xl group-hover:bg-brand-bg/5 transition-all">
                      <Code size={24} />
                    </div>
                    Arquivo JSON (Backup)
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-4 px-4">
                <div className="w-1.5 h-6 bg-brand-secondary rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Restauração e Importação</h3>
              </div>
              <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6 bg-brand-secondary/[0.02]">
                <p className="text-white/40 text-xs leading-relaxed px-2">Importe dados de fontes externas. <strong className="text-brand-secondary">Atenção: Isso substituirá todos os dados atuais.</strong></p>
                <div className="grid grid-cols-1 gap-3">
                  <label className="w-full h-20 bg-brand-secondary hover:bg-brand-secondary/90 text-brand-bg font-black uppercase tracking-[0.2em] rounded-3xl transition-all flex items-center justify-center gap-4 cursor-pointer group shadow-xl shadow-brand-secondary/10">
                    <div className="p-3 bg-brand-bg/10 rounded-2xl group-hover:scale-110 transition-all">
                      <Upload size={24} />
                    </div>
                    Importar Planilha
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportXlsx} />
                  </label>
                  <label className="w-full h-20 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white font-black uppercase tracking-[0.2em] rounded-3xl transition-all flex items-center justify-center gap-4 cursor-pointer border border-white/10 group">
                    <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-all">
                      <Plus size={24} />
                    </div>
                    Importar JSON
                    <input type="file" accept=".json" className="hidden" onChange={handleImport} />
                  </label>
                </div>
              </div>
            </div>

            <div className="lg:col-span-12 space-y-4 mt-4">
               <div className="flex items-center gap-4 px-4">
                <div className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Operações Críticas</h3>
              </div>
              <div className="glass p-10 rounded-[48px] border border-red-500/10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-red-500/[0.02]">
                <button onClick={onClearHistory} className="p-8 rounded-[32px] bg-white/5 border border-white/5 hover:bg-red-500 hover:text-white transition-all text-left group">
                  <Trash2 size={24} className="mb-4 text-red-500 group-hover:text-white transition-colors" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Limpar Histórico</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Remove todos os registros permanentes</p>
                </button>
                <button onClick={onResetQueue} className="p-8 rounded-[32px] bg-white/5 border border-white/5 hover:bg-red-500 hover:text-white transition-all text-left group">
                  <Users size={24} className="mb-4 text-red-500 group-hover:text-white transition-colors" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Limpar Fila</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Zera status sem excluir funcionários</p>
                </button>
                <button onClick={() => { onUpdateSettings({ ...settings, currentCallPosition: 1 }); addNotification('Sequência resetada!', 'success'); }} className="p-8 rounded-[32px] bg-white/5 border border-white/5 hover:bg-brand-secondary hover:text-brand-bg transition-all text-left group">
                  <RefreshCw size={24} className="mb-4 text-brand-secondary group-hover:text-brand-bg transition-colors" />
                  <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Resetar Chamada</h4>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity">Volta a contagem para o 1º da fila</p>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {dbStatus && (
                <div className="lg:col-span-12">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={`p-6 rounded-[24px] text-center text-[10px] font-black uppercase tracking-[0.4em] ${dbStatus.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-xl shadow-green-500/5' : 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-xl shadow-red-500/5'}`}>
                    {dbStatus.message}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'history' && (
          <AdminTabLoader isLoading={isLoadingHistory} skeleton={<SkeletonHistory />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-12">
                <div className="glass p-10 rounded-[48px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 mb-4 relative overflow-hidden bg-brand-secondary/[0.02]">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <History size={200} />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-secondary/10 rounded-3xl flex items-center justify-center text-brand-secondary">
                        <Trophy size={32} />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Registro de Glórias</h2>
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Histórico Completo de Sorteios Realizados</p>
                      </div>
                    </div>
                  </div>

                  {history.length > 0 && (
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-3xl border border-white/10">
                        <button onClick={() => onClearHistory()} className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg" title="Limpar Tudo">
                          <Trash2 size={24} />
                        </button>
                      </div>
                      <div className="p-4 bg-white/5 rounded-3xl border border-white/5 text-center px-10">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-white/20 mb-1">Total de Sorteios</span>
                        <span className="text-2xl font-black text-brand-secondary">{history.length}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-12">
                <div className={history.length > 0 ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                  {history.length === 0 ? (
                    <div className="glass p-20 rounded-[56px] text-center space-y-6 border border-dashed border-white/10">
                      <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/5">
                        <History size={48} />
                      </div>
                      <div className="space-y-2">
                        <p className="text-white/40 text-sm font-black uppercase tracking-[0.3em]">O baú de memórias está vazio</p>
                        <p className="text-white/10 text-[10px] font-bold uppercase tracking-widest">Realize um sorteio para começar o registro</p>
                      </div>
                    </div>
                  ) : (
                    history.slice((currentHistoryPage - 1) * ITEMS_PER_PAGE, currentHistoryPage * ITEMS_PER_PAGE).map((item) => (
                      <motion.div 
                        key={item.id} 
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative flex flex-col bg-white/[0.03] backdrop-blur-2xl p-6 rounded-[40px] border border-white/5 hover:border-brand-secondary/40 hover:bg-white/[0.05] transition-all duration-500 ${expandedHistory === item.id ? 'col-span-full md:col-span-1 lg:col-span-1 xl:col-span-full ring-2 ring-brand-secondary/30' : ''}`}
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-white/20">
                              <Calendar size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-white uppercase tracking-tight">{new Date(item.timestamp).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-brand-secondary">{new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleShareHistory(item)} className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-brand-primary hover:text-white transition-all"><Share2 size={16} /></button>
                            <button onClick={() => handleDownloadPDF(item)} className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-brand-secondary hover:text-white transition-all"><FileDown size={16} /></button>
                            <button onClick={() => onDeleteHistoryItem(item.id)} className="p-2.5 rounded-xl bg-white/5 text-white/40 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 mb-8 bg-brand-bg/40 p-4 rounded-3xl border border-white/5">
                          <div className="w-20 h-20 bg-brand-secondary/10 rounded-2xl overflow-hidden shrink-0 border-2 border-brand-secondary/20 group-hover:rotate-3 transition-transform">
                            {item.fullList?.[0]?.photoUrl ? (
                              <img src={item.fullList[0].photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-brand-secondary text-2xl font-black">
                                {item.winnerName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 block mb-2">Vencedor Geral</span>
                            <h4 className="text-xl font-black uppercase tracking-tight text-brand-secondary">
                              {item.winnerName}
                            </h4>
                          </div>
                        </div>

                        <button 
                          onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                          className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all ${
                            expandedHistory === item.id ? 'bg-brand-secondary text-brand-bg' : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {expandedHistory === item.id ? 'Recolher Detalhes' : 'Visualizar Nova Fila'}
                          <ChevronDown size={14} className={`transition-transform duration-500 ${expandedHistory === item.id ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {expandedHistory === item.id && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-6">
                              <div className="space-y-4 pt-4 border-t border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-2 mb-2 block">Ordem Completa</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {item.fullList?.map((emp, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all">
                                      <span className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-[11px] font-black text-brand-secondary shrink-0 border border-white/5">{idx + 1}º</span>
                                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                        {emp.photoUrl ? (
                                          <img src={emp.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-white/20 bg-white/5">{emp.name.charAt(0)}</div>
                                        )}
                                      </div>
                                      <span className="text-xs font-black text-white/80 uppercase">{emp.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  )}
                </div>

                {history.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-center items-center gap-4 mt-12 py-8 bg-white/5 rounded-[48px] border border-white/5">
                    <button 
                      disabled={currentHistoryPage === 1}
                      onClick={(e) => { e.stopPropagation(); setCurrentHistoryPage(p => Math.max(1, p - 1)); }}
                      className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 disabled:opacity-20 hover:bg-brand-primary hover:text-white transition-all shadow-xl"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="flex items-center gap-3 px-10">
                      <span className="text-sm font-black text-white uppercase tracking-widest">Página {currentHistoryPage}</span>
                      <span className="text-white/20 text-xs font-black">/</span>
                      <span className="text-xs font-black text-white/30">{Math.ceil(history.length / ITEMS_PER_PAGE)}</span>
                    </div>
                    <button 
                      disabled={currentHistoryPage === Math.ceil(history.length / ITEMS_PER_PAGE)}
                      onClick={(e) => { e.stopPropagation(); setCurrentHistoryPage(p => Math.min(Math.ceil(history.length / ITEMS_PER_PAGE), p + 1)); }}
                      className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 disabled:opacity-20 hover:bg-brand-primary hover:text-white transition-all shadow-xl"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </AdminTabLoader>
        )}

        {activeTab === 'admins' && currentUserRole === 'admin' && (
          <AdminTabLoader isLoading={isLoadingAdmins} skeleton={<SkeletonAdmins />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-12">
                <div className="glass p-10 rounded-[48px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 mb-4 relative overflow-hidden bg-brand-primary/[0.02]">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Shield size={200} />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary">
                        <Shield size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Gestão de Acesso</h3>
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Controle de Administradores e Permissões</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-brand-secondary rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">
                    {editingAdminId ? 'Editar Perfil' : 'Novo Administrador'}
                  </h3>
                </div>
                
                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6">
                  <div className="flex justify-center mb-8">
                     {isCameraOpen && activeCameraType === 'admins' ? (
                      <div className="relative w-48 h-48 rounded-[40px] overflow-hidden bg-black ring-4 ring-brand-primary/20">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                        <div className="absolute bottom-4 inset-x-0 flex justify-center items-center gap-3">
                          <button onClick={stopCamera} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-red-500 transition-all"><X size={18} /></button>
                          <button onClick={capturePhoto} className="w-12 h-12 rounded-full bg-brand-primary flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all"><Camera size={24} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="w-48 h-48 rounded-[40px] bg-white/5 border-2 border-white/10 border-dashed flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-primary/50">
                          {adminPhotoUrl ? (
                            <img src={adminPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={64} className="text-white/10" />
                          )}
                          {isAdminUploading && <div className="absolute inset-0 bg-brand-bg/60 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" /></div>}
                        </div>
                        <div className="absolute -bottom-2 -right-2 flex gap-2">
                          <button onClick={() => startCamera('admins')} className="w-12 h-12 bg-brand-primary text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"><Camera size={20} /></button>
                          <label className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center shadow-xl hover:bg-white/20 cursor-pointer transition-all border border-white/5">
                            <Upload size={20} />
                            <input type="file" accept="image/*" onChange={handleAdminFileUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Nome Completo</label>
                      <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Ex: João Silva" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Usuário de Acesso</label>
                      <input type="text" value={adminUsername} onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} placeholder="identificador" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">E-mail</label>
                      <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} readOnly={!!editingAdminId} placeholder="email@exemplo.com" className={`w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold ${editingAdminId ? 'opacity-50 cursor-not-allowed' : ''}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Senha</label>
                        <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Senha" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Confirmar</label>
                        <input type="password" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} placeholder="Confirme" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Cargo / Função</label>
                      <select value={adminRole} onChange={(e) => setAdminRole(e.target.value as 'admin' | 'coordinator')} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all appearance-none font-bold">
                        <option value="admin" className="bg-brand-bg text-white">Administrador Gestor</option>
                        <option value="coordinator" className="bg-brand-bg text-white">Coordenador da Fila</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button 
                        disabled={isAdminUploading || isSavingAdmin}
                        onClick={() => {
                           const trimmedName = adminName.trim();
                           const trimmedEmail = adminEmail.trim().toLowerCase();
                           const trimmedUsername = adminUsername.trim();
                           if (!trimmedName || !trimmedEmail || (!editingAdminId && !adminPassword)) {
                             addNotification('Preencha os campos obrigatórios.', 'error');
                             return;
                           }
                           if (adminPassword !== adminConfirmPassword) {
                             addNotification('Senhas não coincidem.', 'error');
                             return;
                           }
                           if (editingAdminId) {
                             setIsSavingAdmin(true);
                             onUpdateAdmin(editingAdminId, { 
                               name: trimmedName, 
                               username: trimmedUsername, 
                               role: adminRole, 
                               photoUrl: adminPhotoUrl || undefined,
                               password: adminPassword || undefined
                             }).finally(() => {
                               setIsSavingAdmin(false);
                               setEditingAdminId(null);
                             });
                           } else {
                             setShowAddAdminConfirm(true);
                           }
                        }}
                        className="flex-1 h-16 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-[24px] flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50"
                      >
                        {isSavingAdmin ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingAdminId ? <Check size={20} /> : <Plus size={20} />)}
                        {editingAdminId ? 'Salvar Alterações' : 'Criar Conta'}
                      </button>
                      {editingAdminId && (
                        <button onClick={() => { setEditingAdminId(null); setAdminName(''); setAdminEmail(''); setAdminUsername(''); setAdminPassword(''); setAdminConfirmPassword(''); setAdminPhotoUrl(''); setAdminRole('coordinator'); }} className="w-16 h-16 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                          <X size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Equipe de Gestão</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {admins.map((admin) => (
                    <motion.div key={admin.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass p-5 rounded-[40px] flex items-center justify-between group border border-white/5 hover:border-brand-primary/30 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-[24px] bg-white/5 overflow-hidden border border-white/10 relative group-hover:scale-105 transition-transform duration-500">
                          {admin.photoUrl ? (
                            <img src={admin.photoUrl} alt={admin.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-black text-white/20 uppercase bg-gradient-to-br from-white/5 to-white/10">{admin.name.charAt(0)}</div>
                          )}
                          {/* Online status indicator removed if not in AdminUser type */}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{admin.name}</h4>
                            <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-white/10 text-white/40 px-2 py-0.5 rounded-full">@{admin.username || 'user'}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${admin.role === 'admin' ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                              {admin.role === 'admin' ? 'Administrador' : 'Coordenador'}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">{admin.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <button onClick={() => { setEditingAdminId(admin.id); setAdminName(admin.name); setAdminUsername(admin.username || ''); setAdminEmail(admin.email); setAdminRole(admin.role || 'coordinator'); setAdminPhotoUrl(admin.photoUrl || ''); setAdminPassword(''); setAdminConfirmPassword(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all"><Edit2 size={18} /></button>
                        {admin.email !== auth.currentUser?.email && (
                          <button onClick={() => { if(window.confirm('Excluir admin?')) onDeleteAdmin(admin.id); }} className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><Trash2 size={18} /></button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showAddAdminConfirm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-brand-bg/90 backdrop-blur-sm">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass max-w-md w-full p-8 rounded-[40px] space-y-6">
                    <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl flex items-center justify-center text-brand-primary mx-auto">
                      <UserPlus size={32} />
                    </div>
                    <div className="text-center space-y-2">
                       <h4 className="text-xl font-bold uppercase tracking-tight text-white">Confirmar Cadastro</h4>
                       <p className="text-white/40 text-xs leading-relaxed">Você está prestes a criar um novo acesso de <span className="text-brand-secondary font-black">{adminRole === 'admin' ? 'ADMINISTRADOR' : 'COORDENADOR'}</span> para o email <span className="text-white font-bold">{adminEmail}</span>.</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowAddAdminConfirm(false)} className="flex-1 py-4 glass text-white/40 font-black uppercase tracking-widest rounded-2xl">Cancelar</button>
                      <button 
                        onClick={async () => {
                           setIsSavingAdmin(true);
                           try {
                             await onAddAdmin(adminName.trim(), adminEmail.trim().toLowerCase(), adminRole, adminPassword, adminPhotoUrl, adminUsername.trim());
                             setAdminName(''); setAdminEmail(''); setAdminUsername(''); setAdminPassword(''); setAdminConfirmPassword(''); setAdminPhotoUrl(''); setAdminRole('coordinator');
                           } finally {
                             setIsSavingAdmin(false);
                             setShowAddAdminConfirm(false);
                           }
                        }}
                        className="flex-1 py-4 bg-brand-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-primary/20"
                      >
                        {isSavingAdmin ? 'Criando...' : 'Confirmar'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </AdminTabLoader>
        )}

        {activeTab === 'settings' && currentUserRole === 'admin' && (
          <AdminTabLoader isLoading={isLoadingSettings} skeleton={<SkeletonSettings />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
              <div className="lg:col-span-12">
                <div className="glass p-10 rounded-[48px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 mb-4 relative overflow-hidden bg-brand-primary/[0.02]">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-brand-primary">
                    <Settings size={200} />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-primary/10 rounded-3xl flex items-center justify-center text-brand-primary">
                        <Settings size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Configurações Gerais</h3>
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Personalização Visual e Identidade do App</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {/* Header Settings Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <div className="w-1.5 h-6 bg-brand-secondary rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Identidade Visual (Topo)</h3>
                  </div>
                  <div className="glass p-8 rounded-[48px] border border-white/10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Título Principal (L1)</label>
                        <input type="text" value={tempSettings.headerTitleLine1 || ''} onChange={(e) => setTempSettings({...tempSettings, headerTitleLine1: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Título Principal (L2)</label>
                        <input type="text" value={tempSettings.headerTitleLine2 || ''} onChange={(e) => setTempSettings({...tempSettings, headerTitleLine2: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Frase de Boas-vindas / Subtítulo</label>
                      <input type="text" value={tempSettings.headerSubtitle || ''} onChange={(e) => setTempSettings({...tempSettings, headerSubtitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                    </div>
                  </div>
                </div>

                {/* Hero Settings Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Card Principal (Highlight)</h3>
                  </div>
                  <div className="glass p-8 rounded-[48px] border border-white/10 space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Background Visual</label>
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-64 h-40 rounded-[32px] bg-white/5 border border-white/10 overflow-hidden relative group shrink-0 shadow-inner">
                          {tempSettings.heroBackgroundImage ? (
                            <img src={tempSettings.heroBackgroundImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon size={40} className="text-white/10" /></div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => setTempSettings({ ...tempSettings, heroBackgroundImage: '' })} className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-all"><Trash2 size={18} /></button>
                          </div>
                        </div>
                        <div className="flex-1 space-y-4">
                          <p className="text-[11px] text-white/40 leading-relaxed font-medium">Recomendamos imagens panorâmicas de alta qualidade (1920x1080) para o melhor efeito visual no card principal.</p>
                          <label className="w-full flex items-center justify-center h-16 bg-white/5 border-2 border-white/10 border-dashed rounded-3xl hover:bg-white/10 hover:border-brand-primary/50 cursor-pointer transition-all group">
                             <div className="flex items-center gap-3 text-white/40 text-[10px] font-black uppercase tracking-widest group-hover:text-brand-primary">
                               <Upload size={18} />
                               {isHeroUploading ? 'Enviando...' : 'Carregar Nova Imagem'}
                             </div>
                             <input type="file" accept="image/*" onChange={handleHeroBackgroundUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6 pt-4 border-t border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Tag Superior (Emblema)</label>
                        <input type="text" value={tempSettings.heroSubtitle || ''} onChange={(e) => setTempSettings({...tempSettings, heroSubtitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-black uppercase tracking-widest text-sm" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Chamada Principal (L1)</label>
                          <input type="text" value={tempSettings.heroTitleLine1 || ''} onChange={(e) => setTempSettings({...tempSettings, heroTitleLine1: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Chamada Principal (L2)</label>
                          <input type="text" value={tempSettings.heroTitleLine2 || ''} onChange={(e) => setTempSettings({...tempSettings, heroTitleLine2: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Descrição do Card</label>
                        <textarea rows={3} value={tempSettings.heroDescription || ''} onChange={(e) => setTempSettings({...tempSettings, heroDescription: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white/60 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none font-medium" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Queue Settings Card */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Painel da Fila</h3>
                  </div>
                  <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Título da Seção (L1)</label>
                        <input type="text" value={tempSettings.queueTitleLine1 || ''} onChange={(e) => setTempSettings({...tempSettings, queueTitleLine1: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Título da Seção (L2 - Destaque)</label>
                        <input type="text" value={tempSettings.queueTitleLine2 || ''} onChange={(e) => setTempSettings({...tempSettings, queueTitleLine2: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-black uppercase" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Subtítulo Informativo</label>
                      <input type="text" value={tempSettings.queueSubtitle || ''} onChange={(e) => setTempSettings({...tempSettings, queueSubtitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6 sticky top-8">
                  <div className="w-16 h-16 bg-brand-primary/20 rounded-3xl flex items-center justify-center text-brand-primary mx-auto shadow-lg shadow-brand-primary/10">
                    <Save size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-lg font-black uppercase tracking-tight text-white leading-tight">Salvar Alterações</h4>
                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Confirme para aplicar ao sistema</p>
                  </div>
                  <div className="space-y-3 bg-white/5 rounded-3xl p-5 border border-white/5">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                       <span className="text-white/40">Última edição:</span>
                       <span className="text-white">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        onUpdateSettings(tempSettings);
                        addNotification('Configurações atualizadas com sucesso!', 'success');
                    }}
                    className="w-full h-16 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-[24px] shadow-xl shadow-brand-primary/30 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Check size={20} />
                    Aplicar Agora
                  </button>
                  <button 
                    onClick={() => setTempSettings(settings)}
                    className="w-full h-14 bg-white/5 border border-white/10 text-white/40 rounded-[20px] hover:text-white hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
                  >
                    Descartar Mudanças
                  </button>
                </div>
              </div>
            </div>
          </AdminTabLoader>
        )}

        {activeTab === 'files' && currentUserRole === 'admin' && (
          <AdminTabLoader isLoading={isLoadingSettings} skeleton={<SkeletonSettings />}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-6xl mx-auto">
              <div className="lg:col-span-12">
                <div className="glass p-10 rounded-[48px] border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8 mb-4 relative overflow-hidden bg-brand-primary/[0.02]">
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none text-brand-secondary">
                    <CloudDownload size={200} />
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-brand-secondary/10 rounded-3xl flex items-center justify-center text-brand-secondary">
                        <CloudDownload size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Repositório de Downloads</h3>
                        <p className="text-white/40 text-[11px] font-black uppercase tracking-[0.2em]">Distribuição e Controle de Versões</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-1.5 h-6 bg-brand-secondary rounded-full shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
                  <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Configurar Novo Release</h3>
                </div>
                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">Nome da Versão / Arquivo</label>
                       <input type="text" placeholder="Ex: App Sorteio v2.1.0 (PRO)" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-4">URL Direta para Download</label>
                       <div className="relative group">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-brand-primary transition-colors"><LinkIcon size={18} /></div>
                         <input type="text" placeholder="https://cloud.com/app.apk" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all font-bold" />
                       </div>
                    </div>
                    <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-3xl space-y-2">
                      <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-relaxed">Nota ao Administrador:</p>
                      <p className="text-[10px] text-white/60 leading-relaxed">Este link será exibido como a opção principal de download na tela de boas-vindas do sistema.</p>
                    </div>
                    <button 
                      onClick={handleLinkSubmit}
                      className="w-full h-16 bg-brand-primary hover:bg-brand-primary/90 text-white rounded-[24px] shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <Plus size={20} />
                      Ativar e Registrar Link
                    </button>
                  </div>
                </div>

                <div className="glass p-8 rounded-[48px] border border-white/10 space-y-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-brand-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Status do Deploy</h4>
                  </div>
                  {settings.downloadUrl ? (
                    <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-3xl p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-white font-black text-xs uppercase tracking-tight truncate max-w-[180px]">{settings.downloadFileName || 'PRODUÇÃO ATIVA'}</p>
                          <p className="text-[9px] text-brand-primary font-black uppercase tracking-widest">Ativo no sistema</p>
                        </div>
                        <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary"><Check size={20} /></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={settings.downloadUrl} target="_blank" rel="noopener noreferrer" className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-brand-primary transition-all"><ExternalLink size={16} /></a>
                        <button onClick={() => onUpdateSettings({ ...settings, downloadUrl: '', downloadFileName: '' })} className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/5 border-dashed rounded-3xl p-8 text-center">
                      <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Nenhum Link de Produção</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(5,150,105,0.8)]" />
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white">Versões Anteriores</h3>
                  </div>
                  {fileHistory.length > 0 && (
                    <button onClick={onClearFileHistory} className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 hover:text-red-500 transition-colors">Limpar Tudo</button>
                  )}
                </div>

                <div className="space-y-4">
                  {isLoadingFileHistory ? (
                    <div className="glass p-20 rounded-[48px] text-center">
                       <div className="w-10 h-10 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mx-auto mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Sincronizando histórico...</p>
                    </div>
                  ) : fileHistory.length === 0 ? (
                    <div className="glass p-20 rounded-[48px] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/10"><Database size={32} /></div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/20">O histórico de versões está vazio</p>
                    </div>
                  ) : (
                    fileHistory.map((item) => (
                      <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-6 rounded-[40px] flex items-center justify-between group border border-white/5 hover:border-brand-primary/30 transition-all">
                        <div className="flex items-center gap-5 overflow-hidden">
                          <div className="w-14 h-14 bg-white/5 rounded-[20px] flex items-center justify-center text-white/20 shrink-0 group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors">
                            <FileIcon size={24} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{item.fileName}</h4>
                            <div className="flex items-center gap-3 mt-1 overflow-hidden">
                              <span className="text-[9px] font-black uppercase tracking-widest text-white/20 whitespace-nowrap">{new Date(item.timestamp).toLocaleDateString()}</span>
                              <span className="w-1 h-1 bg-white/10 rounded-full shrink-0" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-brand-primary/60 truncate">por {item.uploaderEmail}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 ml-4">
                          <button onClick={() => onUpdateSettings({ ...settings, downloadUrl: item.downloadUrl, downloadFileName: item.fileName })} className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center hover:scale-110 active:scale-90 transition-all" title="Restaurar Versão"><Zap size={18} /></button>
                          <a href={item.downloadUrl} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:text-white hover:bg-brand-secondary transition-all" title="Baixar"><Download size={18} /></a>
                          <button onClick={() => onDeleteFileHistoryItem(item.id)} className="w-12 h-12 rounded-2xl bg-white/5 text-white/40 flex items-center justify-center hover:text-red-500 hover:bg-red-500/10 transition-all" title="Remover"><Trash2 size={18} /></button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </AdminTabLoader>
        )}
      </div>
    </div>
  );
};

const HeroCard = ({ queueCount, settings, calledEmployee, isLastCalled, currentQueue, onShuffle }: { 
  queueCount: number, 
  settings: AppSettings, 
  calledEmployee: Employee | null, 
  isLastCalled: boolean,
  currentQueue: Employee[],
  onShuffle: () => Promise<boolean>
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  const isPublicShuffleAllowed = useMemo(() => {
    if (!settings.publicShuffleEnabled) return false;
    
    // Check if there are at least 2 active employees to allow shuffle
    if (queueCount < 2) return false;
    
    const now = new Date();
    const currentDay = now.getDay();
    
    // Respect lotteryDays if set, otherwise default to Monday-Friday (1-5)
    const allowedDays = settings.lotteryDays || [1, 2, 3, 4, 5];
    if (!allowedDays.includes(currentDay)) return false;

    // Use local date YYYY-MM-DD
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    
    if (settings.lastLotteryDate === today) return false;
    
    const currentHHmm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const start = (settings.publicShuffleStartTime || '08:00').substring(0, 5);
    const end = (settings.publicShuffleEndTime || '18:00').substring(0, 5);
    
    return currentHHmm >= start && currentHHmm <= end;
  }, [settings.publicShuffleEnabled, settings.lastLotteryDate, settings.publicShuffleStartTime, settings.publicShuffleEndTime, settings.lotteryDays, time, queueCount]);

  const handleDownload = () => {
    if (!currentQueue || currentQueue.length === 0) return;
    
    const sortedQueue = [...currentQueue]
      .filter(e => e.isActive)
      .sort((a, b) => a.position - b.position);

    const headers = ['Posição', 'Nome', 'Status'];
    const rows = sortedQueue.map(e => [
      e.position,
      `"${e.name.replace(/"/g, '""')}"`,
      e.position < (calledEmployee?.position || 0) ? 'Atendido' : e.id === calledEmployee?.id ? 'Chamando' : 'Aguardando'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ordem_servico_${new Date().toLocaleDateString('pt-BR')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
      layout
      className="mx-4 md:mx-6 p-6 md:p-12 rounded-[32px] md:rounded-[40px] bg-brand-card relative overflow-hidden hero-gradient border border-white/5 shadow-2xl"
      style={settings.heroBackgroundImage ? {
        backgroundImage: `linear-gradient(to right, rgba(10, 15, 12, 0.95), rgba(10, 15, 12, 0.4)), url(${settings.heroBackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={12} className="text-brand-secondary md:w-3.5 md:h-3.5" />
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-brand-secondary">{settings.heroSubtitle}</span>
          </div>
          
          <h2 className="text-3xl md:text-6xl font-light leading-none tracking-tight mb-3 md:mb-2">
            {settings.heroTitleLine1} <br />
            <span className="text-brand-primary font-black">{settings.heroTitleLine2}</span>
          </h2>
          
          <p className="text-white/50 text-xs md:text-base font-medium leading-relaxed max-w-full sm:max-w-[280px] md:max-w-md mb-8 md:mb-10">
            {settings.heroDescription}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <div className="px-5 py-3 rounded-full glass flex items-center justify-center gap-3">
              <Clock size={16} className="text-brand-secondary" />
              <span className="text-xs font-bold tracking-widest">{time}</span>
            </div>
            <div className="px-5 py-3 rounded-full glass flex items-center justify-center gap-3">
              <Users size={16} className="text-brand-secondary" />
              <span className="text-xs font-bold tracking-widest whitespace-nowrap">{queueCount} <span className="hidden xs:inline">Pessoas</span></span>
            </div>
            <button 
              onClick={handleDownload}
              title="Baixar Ordem de Serviço"
              className="px-5 py-3 rounded-full glass flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95 transition-all text-white/60 hover:text-white"
            >
              <FileDown size={16} className="text-brand-secondary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Excel</span>
            </button>

            {settings.downloadUrl && (
              <a 
                href={settings.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-full bg-brand-secondary text-brand-bg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-secondary/20"
              >
                <Download size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {settings.downloadFileName || 'Baixar App'}
                </span>
              </a>
            )}

            {isPublicShuffleAllowed && (
              <button 
                onClick={() => onShuffle()}
                className="px-5 py-3 rounded-full bg-purple-600 text-white flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-600/20"
              >
                <Dices size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Sorteio Público</span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {calledEmployee && (
            <motion.div 
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="flex-shrink-0 w-full md:w-auto"
            >
              <div className="bg-[#121814] p-6 md:p-8 rounded-[32px] border-2 border-brand-primary/30 relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary" />
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-brand-primary/50 shadow-2xl relative z-10 text-brand-bg">
                      {calledEmployee.photoUrl ? (
                        <img src={calledEmployee.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-4xl">
                          {calledEmployee.position}
                        </div>
                      )}
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-brand-secondary text-brand-bg rounded-lg flex items-center justify-center font-black text-xs shadow-lg z-20">
                      {calledEmployee.position}º
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary animate-pulse">Chamando Agora</span>
                    </div>
                    <h4 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate">
                      {calledEmployee.name}
                    </h4>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">
                      {isLastCalled ? (
                        <span className="text-brand-primary font-black animate-bounce inline-block">(Chamada Encerrada)</span>
                      ) : "Próximo da Fila"}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="absolute -bottom-12 -right-12 w-48 md:w-64 h-48 md:h-64 bg-brand-primary/10 rounded-full blur-3xl" />
      <div className="absolute -top-12 -left-12 w-32 md:w-48 h-32 md:h-48 bg-brand-secondary/5 rounded-full blur-3xl" />
    </motion.div>
  );
};

const LotteryCountdownCard = ({ settings }: { settings: AppSettings }) => {
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculate = () => {
      if (!settings.lotteryEnabled || !settings.lotteryDays || !settings.lotteryDays.length || !settings.lotteryTime) {
        setNextDate(null);
        return;
      }

      const [hours, minutes] = settings.lotteryTime.split(':').map(Number);
      const now = new Date();
      let next = new Date(now);
      next.setHours(hours, minutes, 0, 0);

      const daysOfWeek = settings.lotteryDays;
      
      // If today is a lottery day and time hasn't passed
      if (daysOfWeek.includes(now.getDay()) && next > now) {
        // use this next
      } else {
        // find next day
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const check = new Date(now);
          check.setDate(now.getDate() + i);
          check.setHours(hours, minutes, 0, 0);
          if (daysOfWeek.includes(check.getDay())) {
            next = check;
            found = true;
            break;
          }
        }
        if (!found) {
          setNextDate(null);
          return;
        }
      }
      
      setNextDate(next);
      const diff = next.getTime() - now.getTime();
      
      if (diff > 0) {
        setTimeLeft({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [settings.lotteryEnabled, settings.lotteryDays, settings.lotteryTime]);

  if (!settings.lotteryEnabled || !nextDate) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 md:px-6"
    >
      <div className="glass p-6 md:p-10 rounded-[40px] relative overflow-hidden group border border-brand-primary/10 bg-brand-primary/[0.02]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full -mr-16 -mt-16" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Timer size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold uppercase tracking-tight text-white leading-none">Sorteio Programado</h3>
                <p className="text-brand-primary/60 text-[10px] font-black uppercase tracking-widest mt-1">Contagem regressiva</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Data do Próximo Sorteio</p>
              <p className="text-white font-bold text-sm md:text-base capitalize">
                {nextDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} <span className="text-brand-primary">às {settings.lotteryTime}</span>
              </p>
            </div>

            {settings.lotteryEnabledBy && (
              <div className="flex items-center gap-2 pt-1">
                <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center">
                  <UserIcon size={10} className="text-white/30" />
                </div>
                <p className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                  Configurado por <span className="text-white/60 font-black">{settings.lotteryEnabledBy}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 md:gap-4">
              {[
                { label: 'Dias', value: timeLeft.days },
                { label: 'Hrs', value: timeLeft.hours },
                { label: 'Min', value: timeLeft.minutes },
                { label: 'Seg', value: timeLeft.seconds }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 min-w-[50px] md:min-w-[64px]">
                  <div className="w-full aspect-square md:w-16 md:h-20 rounded-2xl bg-brand-card/80 border border-white/5 backdrop-blur-md flex items-center justify-center shadow-xl">
                    <span className="text-xl md:text-3xl font-black text-white font-mono leading-none">
                      {String(item.value).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[7px] md:text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const QueueItem = React.forwardRef<HTMLDivElement, { 
  employee: Employee, 
  isFirst: boolean,
  isAdmin?: boolean,
  onCall?: (id: string) => void
}>(
  ({ employee, isFirst, isAdmin, onCall }, ref) => (
    <motion.div 
      ref={ref}
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      whileHover={!isFirst ? { 
        x: 8, 
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderColor: "rgba(255, 255, 255, 0.1)"
      } : { scale: 1.02 }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 30,
        layout: { duration: 0.3 }
      }}
      className={`group flex items-center justify-between p-5 md:p-6 rounded-[32px] transition-all duration-500 cursor-pointer ${
        isFirst 
          ? 'bg-brand-primary text-white shadow-[0_20px_50px_rgba(235,51,73,0.3)] z-10' 
          : 'bg-brand-card/30 text-white/80 border border-white/5'
      }`}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="relative">
          <div className={`w-16 h-16 md:w-24 md:h-24 rounded-2xl flex items-center justify-center text-xl md:text-3xl font-bold transition-all duration-500 overflow-hidden ${
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
        
        <div className="flex flex-col gap-1.5 md:gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] px-2 py-1 rounded-lg ${
              isFirst ? 'bg-white/20 text-white' : 'bg-brand-secondary/10 text-brand-secondary'
            }`}>
              Em espera
            </span>
            {isFirst && (
              <motion.span 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-2 py-1 bg-white/20 text-white text-[7px] md:text-[8px] font-black uppercase rounded-lg backdrop-blur-md"
              >
                Vez de
              </motion.span>
            )}
          </div>
          <div className="space-y-1">
            <h4 className={`text-lg md:text-2xl font-black tracking-tighter uppercase leading-none ${isFirst ? 'text-white' : 'text-white/90 group-hover:text-white transition-colors'}`}>
              {employee.name}
            </h4>
            <div className="flex items-center gap-2">
              <span className={`w-1 h-1 rounded-full ${isFirst ? 'bg-white' : 'bg-brand-secondary'}`} />
              <p className={`text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] ${isFirst ? 'text-white/60' : 'text-white/20'}`}>
                Registro #{employee.id.slice(0, 6)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-[24px] flex flex-col items-center justify-center transition-all border-2 ${
          isFirst 
            ? 'bg-white text-brand-primary border-white shadow-[0_0_30px_rgba(255,255,255,0.4)]' 
            : 'bg-brand-secondary/5 text-brand-secondary border-brand-secondary/20 group-hover:bg-brand-secondary/10 group-hover:border-brand-secondary/30'
        }`}>
          <span className="text-xl md:text-2xl font-black leading-none">{employee.position}</span>
          <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60">Pos</span>
        </div>
      </div>
    </motion.div>
  )
);

const SystemLoader = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[300] bg-brand-bg flex flex-col items-center justify-center gap-8"
  >
    <div className="relative">
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-20 h-20 border-4 border-brand-primary/20 border-t-brand-primary rounded-3xl"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0 bg-brand-primary/20 blur-2xl rounded-full"
      />
    </div>
    <div className="flex flex-col items-center gap-2">
      <motion.h2 
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-white font-black uppercase tracking-[0.4em] text-sm"
      >
        Iniciando Sistema
      </motion.h2>
      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-gradient-to-r from-transparent via-brand-primary to-transparent"
        />
      </div>
    </div>
  </motion.div>
);

function AppContent() {
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const isFirstCallRef = useRef(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'coordinator' | null>(null);
  const [publicTab, setPublicTab] = useState<'current' | 'history'>('current');
  const [selectedLotteryForList, setSelectedLotteryForList] = useState<LotteryHistory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{ id: string, message: string, type: 'success' | 'error' | 'info', description?: string }[]>([]);
  const [queue, setQueue] = useState<Employee[]>([]);
  const [history, setHistory] = useState<LotteryHistory[]>([]);
  const [currentHistoryPage, setCurrentHistoryPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [fileHistory, setFileHistory] = useState<FileHistory[]>([]);
  const [isProcessingShuffle, setIsProcessingShuffle] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingFileHistory, setIsLoadingFileHistory] = useState(true);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [lastLotteryEffect, setLastLotteryEffect] = useState<string | null>(null);
  const [lastCallEffect, setLastCallEffect] = useState<string | null>(null);
  const [currentAdminName, setCurrentAdminName] = useState('');
  const [calledEmployeeData, setCalledEmployeeData] = useState<Employee | null>(null);
  const [showCallPopup, setShowCallPopup] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [localVoiceEnabled, setLocalVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('localVoiceEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleLocalVoice = () => {
    const newValue = !localVoiceEnabled;
    setLocalVoiceEnabled(newValue);
    localStorage.setItem('localVoiceEnabled', String(newValue));
    addNotification(newValue ? 'Chamada por voz ativada' : 'Chamada por voz desativada', 'info');
  };

  const addNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', description?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type, description }]);
    const duration = type === 'error' ? 8000 : 4000;
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  // Voice Pre-loading Helper
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      
      // Some browsers need this called initially
      loadVoices();
      
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      
      // Prime the system
      const prime = () => {
        try {
          const utterance = new SpeechSynthesisUtterance('');
          window.speechSynthesis.speak(utterance);
        } catch (e) {}
      };
      
      window.addEventListener('mousedown', prime, { once: true });
      window.addEventListener('touchstart', prime, { once: true });
      
      return () => {
        window.removeEventListener('mousedown', prime);
        window.removeEventListener('touchstart', prime);
      };
    }
  }, []);

  const speak = useCallback((text: string, force = false) => {
    if (!localVoiceEnabled) return;
    if (!settings.voiceCallEnabled && !force) return;
    
    // Se ainda não houve interação real, enfileirar para quando houver
    if (!hasInteracted) {
      setSpeechQueue(prev => [...prev.slice(-2), text]); // Mantém apenas os últimos 3 para não inundar ao clicar
      return;
    }
    
    try {
      if (!window.speechSynthesis) {
        console.warn('⚠️ SpeechSynthesis não suportado.');
        return;
      }

      // Reiniciar estado se estiver travado
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const performSpeech = () => {
        // Cancelamento duplo para garantir limpeza em hardware lento
        window.speechSynthesis.cancel();
        
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          const currentVoices = window.speechSynthesis.getVoices();
          const ptBRVoices = currentVoices.filter(v => 
            v.lang.toLowerCase().includes('pt-br') || 
            v.lang.toLowerCase().startsWith('pt')
          );
          
          // Fallback mais robusto para vozes
          const selectedVoice = 
            ptBRVoices.find(v => v.name.toLowerCase().includes('google') && v.name.toLowerCase().includes('português')) ||
            ptBRVoices.find(v => v.name.toLowerCase().includes('female')) ||
            ptBRVoices.find(v => v.lang.toLowerCase().includes('pt-br')) ||
            ptBRVoices[0];
          
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
          
          // Fallback de idioma para TVs que não reconhecem o dialeto regional
          utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') return;
            
            // Tratamento especial para o erro de permissão
            if (event.error === 'not-allowed') {
              console.warn('🔇 Áudio bloqueado pelo navegador. Aguardando interação.');
              setHasInteracted(false);
              setSpeechQueue(prev => [...prev.slice(-2), text]);
              return;
            }

            console.error('❌ Erro de voz:', event.error);
            
            // Fallback agressivo de idioma
            if ((event.error === 'language-unavailable' || event.error === 'voice-unavailable') && utterance.lang !== 'pt') {
               console.log('🔄 Tentando fallback para idioma básico "pt"');
               utterance.lang = 'pt';
               window.speechSynthesis.speak(utterance);
            }
          };

          window.speechSynthesis.speak(utterance);
        }, 300); // Aumentado para 300ms para acomodar processadores de TV mais lentos
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        // Se voicesChanged não disparar em 1s, tenta falar mesmo assim com a voz padrão
        const timer = setTimeout(performSpeech, 1000);
        window.speechSynthesis.onvoiceschanged = () => {
          clearTimeout(timer);
          performSpeech();
          window.speechSynthesis.onvoiceschanged = null;
        };
      } else {
        performSpeech();
      }
    } catch (err) {
      console.error('❌ Erro fatal:', err);
    }
  }, [localVoiceEnabled, settings.voiceCallEnabled, hasInteracted]);

  useEffect(() => {
    const handleInteraction = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        console.log('👆 Som liberado por interação.');
        
        try {
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(u);
            
            // Processar fila se houver
            if (speechQueue.length > 0) {
              const lastInQueue = speechQueue[speechQueue.length - 1];
              setTimeout(() => {
                speak(lastInQueue, true);
                setSpeechQueue([]);
              }, 500);
            }
          }
        } catch (e) {}
      }
    };

    const events = ['mousedown', 'touchstart', 'keydown', 'click'];
    events.forEach(e => window.addEventListener(e, handleInteraction));
    
    return () => {
      events.forEach(e => window.removeEventListener(e, handleInteraction));
    };
  }, [hasInteracted]);

  useEffect(() => {
    if (view === 'public' && !hasInteracted && isAuthReady) {
      const timer = setTimeout(() => {
        addNotification("Toque na tela ou interaja para ativar o sistema de voz das chamadas.", "info");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [view, hasInteracted, isAuthReady]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      addNotification('Você está online agora. Os dados serão sincronizados.', 'success');
    };
    const handleOffline = () => {
      setIsOffline(true);
      addNotification('Você está em modo off-line. Mudanças locais serão sincronizadas ao reconectar.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Confetti trigger
  useEffect(() => {
    let interval: any;
    if (settings.lastLotteryTimestamp && settings.lastLotteryTimestamp !== lastLotteryEffect) {
      setLastLotteryEffect(settings.lastLotteryTimestamp);
      
      // Trigger confetti celebration
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        try {
          if (typeof confetti === 'function') {
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
          }
        } catch (confettiError) {
          console.error('Confetti error:', confettiError);
        }
      }, 250);
      
      // Add notification and voice for everyone
      addNotification(`Sorteio Realizado! Nova ordem de serviço gerada.`, 'success');
      speak('Sorteio realizado. Nova ordem de serviço gerada.', true);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [settings.lastLotteryTimestamp, lastLotteryEffect, speak]);

  // Queue Call Listener
  useEffect(() => {
    if (settings.lastCalledTimestamp && settings.lastCalledEmployeeId) {
      // Se for a primeira vez que o componente carrega, apenas sincronizamos o estado sem falar
      if (isFirstCallRef.current) {
        setLastCallEffect(settings.lastCalledTimestamp);
        isFirstCallRef.current = false;
        return;
      }

      if (settings.lastCalledTimestamp !== lastCallEffect) {
        setLastCallEffect(settings.lastCalledTimestamp);
        
        const called = queue.find(e => e.id === settings.lastCalledEmployeeId);
        if (called) {
          setCalledEmployeeData(called);
          setShowCallPopup(true);
          
          // Voice Reproduce for all (especially non-logged)
          // Usamos um pequeno delay extra para garantir que o componente de popup já esteja visível
          setTimeout(() => {
            speak(`Atenção. Próximo da fila: ${called.name}`, true);
          }, 500);

          const timer = setTimeout(() => setShowCallPopup(false), 8000);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [settings.lastCalledTimestamp, settings.lastCalledEmployeeId, lastCallEffect, queue, speak]);

  // Auth Listener
  useEffect(() => {
    // Safety timeout to prevent infinite loading if Firebase takes too long
    // Reduced to 2s for faster public UI readiness
    const timeout = setTimeout(() => {
      setIsAuthReady(true);
      setIsLoadingSettings(false);
    }, 2000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isHardcodedAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
      const dynamicAdmin = user?.email ? admins.find(a => a.email.toLowerCase() === user.email?.toLowerCase() && a.isActive) : null;
      const isAdminUser = isHardcodedAdmin || !!dynamicAdmin;
      
      if (user) {
        if (isAdminUser) {
          setIsAuthenticated(true);
          const adminName = dynamicAdmin?.name || user.displayName || user.email?.split('@')[0] || 'Admin';
          setCurrentAdminName(adminName);
          if (isHardcodedAdmin) {
            setCurrentUserRole('admin');
          } else {
            setCurrentUserRole(dynamicAdmin?.role || 'coordinator');
          }
          setView(prev => prev === 'login' ? 'admin' : prev);
          setIsAuthReady(true);
          clearTimeout(timeout);
        } else if (!isLoadingAdmins) {
          // If admins list is empty, it might have been loaded without permissions before user signed in.
          // Or it could be a stale empty list from a previous guest session.
          // Let's ensure we have tried to fetch the list whileauthenticated.
          if (admins.length === 0) {
            // By setting this to true, we give the Sync Admins effect time 
            // to fetch the list now that auth.currentUser is populated.
            setIsLoadingAdmins(true);
            return;
          }

          // Only sign out if we are SURE they are not an admin (list loaded and they are not in it)
          setIsAuthenticated(false);
          setCurrentUserRole(null);
          if (view === 'admin') setView('public');
          auth.signOut();
          addNotification("Acesso negado. Apenas administradores autorizados.", "error");
          setIsAuthReady(true);
          clearTimeout(timeout);
        }
        // If isLoadingAdmins is true, we wait for the next run of this effect when admins list updates
      } else {
        setIsAuthenticated(false);
        setCurrentUserRole(null);
        if (view === 'admin') setView('public');
        setIsAuthReady(true);
        clearTimeout(timeout);
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [view, admins, isLoadingAdmins]);

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

  // Firestore Real-time Sync: File History
  useEffect(() => {
    setIsLoadingFileHistory(true);
    const q = query(collection(db, 'file_history'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as FileHistory);
      setFileHistory(items);
      setIsLoadingFileHistory(false);
    }, (error) => {
      // Only log if it's not a permission error during initial load
      if (!error.message.includes('permissions')) {
        handleFirestoreError(error, OperationType.LIST, 'file_history');
      }
      setIsLoadingFileHistory(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync: Admins
  useEffect(() => {
    // We only fetch admins if we have a user (to avoid permission errors)
    // or if we are already authenticated.
    if (!auth.currentUser && !isAuthenticated) {
      setAdmins([]);
      // Only set to false if we are sure there is no login in progress
      if (view !== 'login') {
        setIsLoadingAdmins(false);
      }
      return;
    }

    setIsLoadingAdmins(true);
    const unsubscribe = onSnapshot(collection(db, 'admins'), (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as AdminUser);
      setAdmins(items);
      setIsLoadingAdmins(false);
    }, (error) => {
      // If it's a permission error, it might be because the user was just signed out
      if (!error.message.includes('permissions')) {
        console.error('Error fetching admins:', error);
      }
      setIsLoadingAdmins(false);
    });
    return () => unsubscribe();
  }, [auth.currentUser, isAuthenticated, view]);

  // Firestore Real-time Sync: Settings
  useEffect(() => {
    setIsLoadingSettings(true);
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snapshot.data() } as AppSettings);
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
      // Any active admin or coordinator can trigger the automatic lottery
      const isHardcodedAdmin = auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase());
      const isDynamicAdmin = auth.currentUser?.email && admins.some(a => a.email.toLowerCase() === auth.currentUser?.email?.toLowerCase() && a.isActive);
      
      if (!isHardcodedAdmin && !isDynamicAdmin) return;
      
      const now = new Date();
      const currentDay = now.getDay();
      
      // Manual formatting to avoid locale issues
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;
      
      // Manual formatting to avoid locale and timezone issues
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      const targetTime = settings.lotteryTime || '11:00';

      if (
        settings.lotteryEnabled &&
        (settings.lotteryDays || []).includes(currentDay) &&
        currentTime === targetTime &&
        settings.lastLotteryDate !== todayStr &&
        queue.filter(e => e.isActive).length >= 2
      ) {
        console.log('Triggering automatic lottery at', currentTime);
        await handleShuffle('automatic');
      }
    };

    const interval = setInterval(checkLottery, 10000);
    return () => clearInterval(interval);
  }, [settings, queue, admins, auth.currentUser]);

  // Auto Logout for Inactivity
  useEffect(() => {
    if (!isAuthenticated || view !== 'admin') return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        addNotification('Sessão encerrada por inatividade para sua segurança.', 'info');
      }, INACTIVITY_TIMEOUT);
    };

    const handleActivity = () => {
      resetTimer();
    };

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start timer on mount/auth
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, view]);

  const handleLogin = () => {
    // When handleLogin is called, we are likely in the middle of a login transition.
    // We set isLoadingAdmins to true to prevent onAuthStateChanged from signing out 
    // before the admins list has a chance to load for the new user.
    setIsLoadingAdmins(true);
    
    const isHardcodedAdmin = auth.currentUser?.email && ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase());
    const dynamicAdmin = auth.currentUser?.email ? admins.find(a => a.email.toLowerCase() === auth.currentUser?.email?.toLowerCase() && a.isActive) : null;
    
    if (isHardcodedAdmin || dynamicAdmin) {
      setView('admin');
    }
    // If not an admin yet, onAuthStateChanged will handle it once isLoadingAdmins becomes false
    // after the snapshot returns.
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
      position: (queue.length > 0 ? Math.max(...queue.map(e => e.position)) : 0) + 1,
      ...(photoUrl ? { photoUrl } : {})
    };
    try {
      await setDoc(doc(db, 'queue', id), newEmp);
      // Update end of round position to include the new employee
      await updateSettings({
        ...settings,
        endOfRoundPosition: newEmp.position
      });
      addNotification(`${name} adicionado à fila!`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao adicionar funcionário.', 'error', errMsg);
      handleFirestoreError(err, OperationType.CREATE, `queue/${id}`);
    }
  };

  const updateEmployee = async (id: string, name: string, photoUrl?: string) => {
    try {
      console.log('Updating employee:', { id, name, photoUrl });
      const updates: any = { name };
      if (photoUrl !== undefined) updates.photoUrl = photoUrl || "";
      
      const docRef = doc(db, 'queue', id);
      await updateDoc(docRef, updates);
      
      addNotification(`${name} atualizado com sucesso!`, 'success');
      console.log('Employee updated successfully');
    } catch (err) {
      console.error('Error updating employee:', err);
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
      
      // Since we re-ordered everyone to 1..N, update endOfRoundPosition
      await updateSettings({
        ...settings,
        endOfRoundPosition: remaining.length
      });

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

  const handleResetQueue = async () => {
    try {
      addNotification('Limpando fila...', 'info');
      
      // Process in batches of 400 to avoid 500 limit
      const chunks = [];
      for (let i = 0; i < queue.length; i += 400) {
        chunks.push(queue.slice(i, i + 400));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(emp => {
          batch.update(doc(db, 'queue', emp.id), { 
            position: 0, 
            isActive: false 
          });
        });
        await batch.commit();
      }

      // Reset settings related to the queue
      await updateSettings({
        ...settings,
        currentCallPosition: 1,
        endOfRoundPosition: 0
      });

      addNotification('Fila limpa com sucesso! Os funcionários continuam cadastrados.', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao limpar fila.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'queue/reset');
    }
  };

  const [isShufflingGlobal, setIsShufflingGlobal] = useState(false);
  const [shuffleDisplayGlobal, setShuffleDisplayGlobal] = useState<Employee | null>(null);

  const handleShuffle = async (type: 'manual' | 'automatic' = 'manual') => {
    if (isProcessingShuffle) return false;
    
    console.log(`Iniciando handleShuffle (${type}). Queue size:`, queue.length);
    const activeEmployees = queue.filter(emp => emp.isActive);
    
    if (activeEmployees.length < 2) {
      if (type === 'manual') {
        addNotification('É necessário pelo menos 2 funcionários ativos para o sorteio.', 'error');
      }
      return false;
    }

    setIsProcessingShuffle(true);
    setIsShufflingGlobal(true);
    
    // Virtual visual shuffle for the admin who triggers it
    let iterations = 0;
    const maxIterations = 15;
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * activeEmployees.length);
      setShuffleDisplayGlobal(activeEmployees[randomIndex]);
      iterations++;
    }, 100);

    if (type === 'manual') {
      addNotification('Iniciando sorteio...', 'info');
    } else {
      console.log('Sorteio automático disparado!');
    }

    try {
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

      const historyId = Math.random().toString(36).substr(2, 9);
      const now = new Date();
      const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
      
      const historyEntry: LotteryHistory = {
        id: historyId,
        timestamp: now.toISOString(),
        winnerName: winner.name,
        winnerId: winner.id,
        type: type,
        fullList: shuffled.map(emp => ({ 
          id: emp.id, 
          name: emp.name, 
          ...(emp.photoUrl ? { photoUrl: emp.photoUrl } : {})
        }))
      };

      await setDoc(doc(db, 'history', historyId), historyEntry);
      
      const updateData = {
        ...settings, 
        lastLotteryDate: todayStr,
        lastLotteryTimestamp: now.toISOString(),
        endOfRoundPosition: activeEmployees.length,
        currentCallPosition: 1,
        lastCalledEmployeeId: null,
        lastCalledTimestamp: null
      } as AppSettings;

      await setDoc(doc(db, 'settings', 'global'), updateData);

      clearInterval(interval);
      setTimeout(() => {
        setIsShufflingGlobal(false);
        setShuffleDisplayGlobal(null);
      }, 1000);

      addNotification(`Sorteio ${type === 'automatic' ? 'automático ' : ''}realizado! Vencedor: ${winner.name}`, 'success');
      return true;
    } catch (err) {
      clearInterval(interval);
      setIsShufflingGlobal(false);
      setShuffleDisplayGlobal(null);
      console.error('Erro fatal no handleShuffle:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao realizar sorteio.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'queue/shuffle');
      return false;
    } finally {
      setIsProcessingShuffle(false);
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
      
      setCurrentHistoryPage(1);
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
      // Adjust page if necessary
      if (history.length % ITEMS_PER_PAGE === 1 && currentHistoryPage > 1) {
        setCurrentHistoryPage(prev => prev - 1);
      }
      addNotification('Registro removido do histórico.', 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao remover item do histórico.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, `history/${id}`);
    }
  };

  const addAdmin = async (name: string, email: string, role: 'admin' | 'coordinator', password?: string, photoUrl?: string, username?: string) => {
    const adminId = email.toLowerCase();
    
    // Check if admin already exists in Firestore
    if (admins.some(a => a.id === adminId)) {
      addNotification('Este email já está cadastrado como administrador.', 'error');
      return;
    }

    // Check if username already exists if provided
    if (username) {
      const usernameLower = username.toLowerCase();
      const usernameDoc = await getDoc(doc(db, 'usernames', usernameLower));
      if (usernameDoc.exists()) {
        addNotification('Este nome de usuário já está em uso.', 'error');
        return;
      }
    }

    // Create Auth User if password is provided
    if (password) {
      const secondaryApp = initializeApp(firebaseConfigExport, `Secondary-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      try {
        await createAuthUser(secondaryAuth, email, password);
        await signOut(secondaryAuth);
      } catch (authErr: any) {
        console.error("Auth Creation Error:", authErr);
        
        // Define user-friendly messages for common Firebase Auth errors
        let errorTitle = 'Erro ao criar conta de acesso';
        let errorMessage = 'Ocorreu um erro inesperado ao configurar as credenciais.';
        let isCritical = true;

        switch (authErr.code) {
          case 'auth/email-already-in-use':
            errorTitle = 'Conta identificada';
            errorMessage = 'Este e-mail já possui uma conta no sistema. O acesso administrativo será vinculado a ela.';
            isCritical = false;
            break;
          case 'auth/weak-password':
            errorMessage = 'A senha escolhida é muito fraca. Mínimo de 6 caracteres.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'O formato do e-mail é inválido.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'O provedor de e-mail/senha não está ativado no Firebase.';
            break;
          case 'auth/invalid-credential':
            errorMessage = 'As credenciais fornecidas são inválidas ou expiraram.';
            break;
          default:
            errorMessage = 'Erro interno de autenticação. Tente novamente.';
        }

        if (isCritical) {
          addNotification(errorTitle, 'error', errorMessage);
          await deleteApp(secondaryApp);
          return;
        } else {
          addNotification(errorTitle, 'info', errorMessage);
        }
      } finally {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error("Error deleting secondary app:", e);
        }
      }
    }

    const newAdmin: AdminUser = {
      id: adminId,
      name,
      username,
      email,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      ...(password ? { password } : {}),
      ...(photoUrl ? { photoUrl } : {})
    };
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'admins', adminId), newAdmin);
      if (username) {
        batch.set(doc(db, 'usernames', username.toLowerCase()), { email: email.toLowerCase() });
      }
      await batch.commit();
      addNotification(`Administrador ${name} adicionado!`, 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao adicionar administrador.', 'error', errMsg);
      handleFirestoreError(err, OperationType.CREATE, `admins/${adminId}`);
    }
  };

  const updateAdmin = async (id: string, updates: Partial<AdminUser>) => {
    try {
      const oldAdmin = admins.find(a => a.id === id);
      const batch = writeBatch(db);

      // Sanitize updates to remove undefined
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
      batch.update(doc(db, 'admins', id), sanitizedUpdates);

      // Manage username map changes
      if (updates.username !== undefined && updates.username !== oldAdmin?.username) {
        // Delete old username mapping
        if (oldAdmin?.username) {
          batch.delete(doc(db, 'usernames', oldAdmin.username.toLowerCase()));
        }
        // Add new username mapping
        if (updates.username) {
          batch.set(doc(db, 'usernames', updates.username.toLowerCase()), { email: id.toLowerCase() });
        }
      }

      await batch.commit();
      addNotification('Administrador atualizado com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao atualizar administrador.', 'error', errMsg);
      handleFirestoreError(err, OperationType.UPDATE, `admins/${id}`);
    }
  };

  const deleteAdmin = async (id: string) => {
    try {
      const adminToDelete = admins.find(a => a.id === id);
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'admins', id));
      
      if (adminToDelete?.username) {
        batch.delete(doc(db, 'usernames', adminToDelete.username.toLowerCase()));
      }

      await batch.commit();
      addNotification('Administrador removido.', 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao remover administrador.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, `admins/${id}`);
    }
  };

  const addFileHistory = async (fileName: string, fileSize: number, downloadUrl: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const historyEntry: FileHistory = {
      id,
      timestamp: new Date().toISOString(),
      fileName,
      fileSize,
      uploaderEmail: auth.currentUser?.email || 'unknown',
      downloadUrl
    };
    try {
      await setDoc(doc(db, 'file_history', id), historyEntry);
    } catch (err) {
      console.error('Error adding file history:', err);
    }
  };

  const deleteFileHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'file_history', id));
      addNotification('Registro removido do histórico de arquivos.', 'info');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao remover item do histórico.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, `file_history/${id}`);
    }
  };

  const clearFileHistory = async () => {
    if (fileHistory.length === 0) return;
    try {
      const chunks = [];
      for (let i = 0; i < fileHistory.length; i += 500) {
        chunks.push(fileHistory.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.delete(doc(db, 'file_history', item.id));
        });
        await batch.commit();
      }
      
      addNotification('Histórico de arquivos limpo com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao limpar histórico de arquivos.', 'error', errMsg);
      handleFirestoreError(err, OperationType.DELETE, 'file_history/clear');
    }
  };

  const setQueueBulk = async (newQueue: Employee[]) => {
    try {
      addNotification('Atualizando banco de dados...', 'info');
      
      // Combine all operations (deletes + sets)
      const operations: { type: 'delete' | 'set', emp: Employee }[] = [
        ...queue.map(emp => ({ type: 'delete' as const, emp })),
        ...newQueue.map(emp => ({ type: 'set' as const, emp }))
      ];

      // Process in batches of 400
      for (let i = 0; i < operations.length; i += 400) {
        const chunk = operations.slice(i, i + 400);
        const batch = writeBatch(db);
        
        chunk.forEach(op => {
          if (op.type === 'delete') {
            batch.delete(doc(db, 'queue', op.emp.id));
          } else {
            batch.set(doc(db, 'queue', op.emp.id), op.emp);
          }
        });
        
        await batch.commit();
      }

      addNotification('Banco de dados atualizado com sucesso!', 'success');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      addNotification('Erro ao atualizar banco de dados.', 'error', errMsg);
      handleFirestoreError(err, OperationType.WRITE, 'queue/bulk');
    }
  };

  const filteredQueue = queue
    .filter(emp => emp.isActive && emp.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const currentPos = settings.currentCallPosition || 1;
      const aCalled = a.isActive && a.position < currentPos;
      const bCalled = b.isActive && b.position < currentPos;
      
      if (aCalled !== bCalled) return aCalled ? 1 : -1;
      return a.position - b.position;
    });

  if (!isAuthReady || isLoadingSettings) {
    return <SystemLoader />;
  }

  return (
    <div className="min-h-screen pb-20">
      {view === 'login' && <Login onLogin={handleLogin} onBack={() => setView('public')} />}
      
      <AnimatePresence>
        {showCallPopup && calledEmployeeData && (
          <CallNotificationPopup 
            employee={calledEmployeeData} 
            onClose={() => setShowCallPopup(false)} 
            isAuthenticated={isAuthenticated}
            isLastCalled={queue.filter(e => e.isActive).every(e => e.position <= calledEmployeeData.position)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLotteryForList && (
          <LotteryResultModal 
            historyItem={selectedLotteryForList} 
            onClose={() => setSelectedLotteryForList(null)} 
          />
        )}
      </AnimatePresence>

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
        <>
          {isOffline && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 bg-brand-primary/90 backdrop-blur-md rounded-full border border-white/20 shadow-xl flex items-center gap-3 pointer-events-none"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Modo Off-line Ativo</span>
            </motion.div>
          )}
          <AdminPanel 
            onLogout={handleLogout} 
          queue={queue} 
          onAdd={addEmployee}
          onRemove={removeEmployee}
          onToggleActive={toggleEmployeeActive}
          settings={settings}
          onUpdateSettings={updateSettings}
          onShuffle={handleShuffle}
          currentAdminName={currentAdminName}
          isShuffling={isShufflingGlobal}
          shuffleDisplay={shuffleDisplayGlobal}
          onSetQueue={setQueueBulk}
          onUpdateEmployee={updateEmployee}
          onDeleteHistoryItem={deleteHistoryItem}
          history={history}
          onClearHistory={clearHistory}
          onViewPublic={() => setView('public')}
          admins={admins}
          onAddAdmin={addAdmin}
          onUpdateAdmin={updateAdmin}
          onDeleteAdmin={deleteAdmin}
          currentUserRole={currentUserRole}
          isLoadingQueue={isLoadingQueue}
          isLoadingHistory={isLoadingHistory}
          fileHistory={fileHistory}
          onDeleteFileHistoryItem={deleteFileHistoryItem}
          onClearFileHistory={clearFileHistory}
          onAddFileHistory={addFileHistory}
          onResetQueue={handleResetQueue}
          isLoadingFileHistory={isLoadingFileHistory}
          isLoadingAdmins={isLoadingAdmins}
          isLoadingSettings={isLoadingSettings}
          addNotification={addNotification}
          currentHistoryPage={currentHistoryPage}
          setCurrentHistoryPage={setCurrentHistoryPage}
          ITEMS_PER_PAGE={ITEMS_PER_PAGE}
          speak={speak}
        />
        </>
      )}

      {view === 'public' && (
        <>
          <Header 
            onAdminClick={() => setView(isAuthenticated ? 'admin' : 'login')} 
            isAuthenticated={isAuthenticated}
            settings={settings}
            localVoiceEnabled={localVoiceEnabled}
            onToggleVoice={toggleLocalVoice}
          />
          
          {isOffline && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 bg-brand-primary/90 backdrop-blur-md rounded-full border border-white/20 shadow-xl flex items-center gap-3 pointer-events-none"
            >
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Modo Off-line Ativo</span>
            </motion.div>
          )}

          <main className="max-w-3xl mx-auto space-y-12">
            {!hasInteracted && localVoiceEnabled && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setHasInteracted(true);
                  speak('Áudio ativado com sucesso.', true);
                }}
                className="fixed bottom-6 right-6 z-[200] bg-brand-secondary text-brand-bg px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-brand-secondary/40 flex items-center gap-3 animate-bounce"
              >
                <Volume2 size={18} />
                Ativar Áudio da TV
              </motion.button>
            )}

            <div className="space-y-8">
              <div className="space-y-4">
                <HeroCard 
                  queueCount={queue.filter(e => e.isActive).length} 
                  settings={settings} 
                  calledEmployee={showCallPopup ? calledEmployeeData : null}
                  isLastCalled={showCallPopup && calledEmployeeData ? queue.filter(e => e.isActive).every(e => e.position <= calledEmployeeData.position) : false}
                  currentQueue={queue}
                  onShuffle={() => handleShuffle('manual')}
                />
                
                {history.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center"
                  >
                    <button 
                      onClick={() => setSelectedLotteryForList(history[0])}
                      className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 active:scale-95 rounded-[32px] border border-white/5 transition-all group backdrop-blur-sm shadow-xl"
                    >
                      <Trophy size={16} className="text-brand-secondary animate-pulse" />
                      <div className="text-left">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-secondary block leading-none mb-1">Copa Último Sorteio</span>
                        <span className="text-xs font-bold text-white/70 block leading-none">Ver resultado completo do bolão</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-brand-secondary/10 flex items-center justify-center ml-2 group-hover:bg-brand-secondary/20 transition-colors">
                        <ChevronRight size={16} className="text-brand-secondary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="px-4 md:px-0">
                <LotteryCountdownCard settings={settings} />
              </div>
            </div>

            
            <div className="flex justify-center gap-4 px-4 md:px-0 mt-6">
              <button 
                onClick={() => setPublicTab('current')}
                className={`flex-1 md:flex-none px-6 py-4 rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${publicTab === 'current' ? 'bg-brand-secondary text-brand-bg shadow-lg shadow-brand-secondary/20 scale-105 z-10' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                <Target size={16} />
                Sorteio Atual
              </button>
              <button 
                onClick={() => setPublicTab('history')}
                className={`flex-1 md:flex-none px-6 py-4 rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${publicTab === 'history' ? 'bg-brand-secondary text-brand-bg shadow-lg shadow-brand-secondary/20 scale-105 z-10' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
              >
                <History size={16} />
                Anteriores
              </button>
            </div>

            {publicTab === 'current' && (isLoadingQueue || queue.some(e => e.isActive)) && (
              <section className="px-4 md:px-6 space-y-8">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                  <div className="text-center lg:text-left">
                    <h3 className="text-2xl md:text-4xl font-light uppercase tracking-tight text-white mb-2">
                      {settings.queueTitleLine1} <span className="font-black">{settings.queueTitleLine2}</span>
                    </h3>
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] md:tracking-[0.4em] text-brand-secondary/60">
                      {settings.queueSubtitle}
                      {settings.lastLotteryDate && (
                        <span className="ml-3 text-brand-secondary brightness-125 text-[12px] md:text-base font-black">
                          • {new Date(settings.lastLotteryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="relative group w-full lg:max-w-md">
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
                  <AnimatePresence mode="wait">
                    {isLoadingQueue ? (
                      <SkeletonQueue />
                    ) : (
                      <>
                        {filteredQueue.map((employee, index) => (
                          <QueueItem 
                            key={employee.id} 
                            employee={employee} 
                            isFirst={index === 0 && searchQuery === ''} 
                            isAdmin={isAuthenticated}
                            onCall={(id) => toggleEmployeeActive(id, true)}
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
            )}

            {publicTab === 'history' && (
              <section className="px-4 md:px-6 space-y-8">
                <div className="text-center">
                  <h3 className="text-2xl md:text-4xl font-light uppercase tracking-tight text-white mb-2">
                    Sorteios <span className="font-black">Anteriores</span>
                  </h3>
                  <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-brand-secondary/60">
                    Histórico de vencedores
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isLoadingHistory ? (
                    <SkeletonHistory />
                  ) : history.length === 0 ? (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-white/30 font-medium uppercase tracking-widest text-xs">Nenhum sorteio registrado</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedLotteryForList(item)}
                        className="glass p-6 rounded-[32px] flex items-center gap-4 group cursor-pointer hover:bg-white/5 active:scale-95 transition-all border border-white/5 hover:border-brand-secondary/20"
                      >
                        <div className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden shrink-0 border border-white/10 p-0.5 group-hover:border-brand-secondary/40 transition-colors">
                          {item.fullList?.[0]?.photoUrl ? (
                            <img src={item.fullList[0].photoUrl} alt="" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-primary bg-brand-primary/10 rounded-xl">
                              <Trophy size={28} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40">
                              {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-brand-secondary">
                                Ver Lista
                              </span>
                              <ChevronRight size={10} className="text-brand-secondary" />
                            </div>
                          </div>
                          <h4 className="text-white font-bold uppercase tracking-tight text-base">
                            {item.winnerName}
                          </h4>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            )}
          </main>
          
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
