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
  Upload
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  writeBatch,
  deleteDoc,
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
}

interface AppSettings {
  heroTitleLine1: string;
  heroTitleLine2: string;
  heroSubtitle: string;
  heroDescription: string;
  lotteryTime: string;
  lotteryDays: number[];
  lastLotteryDate: string | null;
}

// --- Constants ---
const DEFAULT_SETTINGS: AppSettings = {
  heroTitleLine1: 'SABOR',
  heroTitleLine2: 'AMAZÔNICO',
  heroSubtitle: 'Tropical Dining',
  heroDescription: 'Bem-vindo ao Edifício Amazonas. Desfrute de uma experiência gastronômica única inspirada na natureza.',
  lotteryTime: '11:00',
  lotteryDays: [1, 2, 3, 4, 5], // Seg-Sex
  lastLotteryDate: null
};

const MOCK_QUEUE: Employee[] = [
  { id: '1', name: 'Ricardo Oliveira', position: 1 },
  { id: '2', name: 'Ana Beatriz Silva', position: 2 },
  { id: '3', name: 'Marcos Vinícius', position: 3 },
  { id: '4', name: 'Juliana Costa', position: 4 },
  { id: '5', name: 'Felipe Santos', position: 5 },
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

// --- Components ---

const Header = ({ onAdminClick, isAuthenticated }: { onAdminClick: () => void, isAuthenticated: boolean }) => (
  <header className="px-6 py-8 flex items-center justify-between sticky top-0 z-50 bg-brand-bg/80 backdrop-blur-md">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20">
        <Leaf className="text-white fill-white" size={20} />
      </div>
      <div>
        <h1 className="text-sm font-black tracking-[0.2em] text-white leading-none">EDIFÍCIO AMAZONAS</h1>
        <p className="text-[10px] font-bold tracking-[0.3em] text-brand-secondary mt-1 uppercase">Gourmet Experience</p>
      </div>
    </div>
    
    <div className="flex items-center gap-3">
      <button 
        onClick={onAdminClick}
        className={`w-10 h-10 rounded-2xl glass flex items-center justify-center transition-all ${isAuthenticated ? 'text-brand-secondary' : 'text-white/70 hover:text-white'}`}
      >
        {isAuthenticated ? <Settings size={18} /> : <Lock size={18} />}
      </button>
      <button className="w-10 h-10 rounded-2xl glass flex items-center justify-center text-white/70 hover:text-white transition-all">
        <MenuIcon size={20} />
      </button>
    </div>
  </header>
);

const Login = ({ onLogin, onBack }: { onLogin: () => void, onBack: () => void }) => {
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err: any) {
      setError("Erro ao fazer login com Google.");
      setTimeout(() => setError(null), 3000);
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
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-primary rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl rotate-3">
            <Lock size={36} />
          </div>
          <h2 className="text-3xl font-light uppercase tracking-tight text-white">Acesso Restrito</h2>
          <p className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.3em] mt-2">Área Administrativa</p>
        </div>

        <div className="space-y-6">
          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white text-brand-bg font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>
          
          {error && <p className="text-red-400 text-[10px] font-bold text-center uppercase tracking-widest mt-2">{error}</p>}
          
          <p className="text-white/30 text-[8px] text-center uppercase tracking-widest leading-relaxed">
            Apenas administradores autorizados têm acesso às configurações do sistema.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const LotteryOverlay = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-bg/95 backdrop-blur-2xl"
    >
      <div className="text-center space-y-8">
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 0.5, repeat: 5 }}
          className="w-32 h-32 bg-brand-primary rounded-[40px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-brand-primary/40"
        >
          <Dices size={64} />
        </motion.div>
        
        <div className="space-y-2">
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-black uppercase tracking-tighter text-white"
          >
            Sorteando <span className="text-brand-secondary">Fila</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-brand-secondary text-[10px] font-black uppercase tracking-[0.5em]"
          >
            Gourmet Experience
          </motion.p>
        </div>

        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 bg-brand-primary rounded-full"
            />
          ))}
        </div>
      </div>
      
      <motion.div 
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 3, ease: "linear" }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary origin-left"
      />
    </motion.div>
  );
};

const AdminPanel = ({ 
  onLogout, 
  queue, 
  onAdd, 
  onRemove,
  settings,
  onUpdateSettings,
  onShuffle,
  onSetQueue
}: { 
  onLogout: () => void, 
  queue: Employee[], 
  onAdd: (name: string) => void,
  onRemove: (id: string) => void,
  settings: AppSettings,
  onUpdateSettings: (settings: AppSettings) => void,
  onShuffle: () => void,
  onSetQueue: (queue: Employee[]) => void
}) => {
  const [newName, setNewName] = useState('');
  const [activeTab, setActiveTab] = useState<'queue' | 'settings' | 'lottery' | 'database'>('queue');
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
            onSetQueue(json);
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
            position: typeof item.position === 'number' ? item.position : idx + 1
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
        </div>

        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="glass p-6 md:p-8 rounded-[32px] md:rounded-[40px] space-y-6">
                <h3 className="text-lg md:text-xl font-bold uppercase tracking-tight flex items-center gap-3">
                  <Users className="text-brand-secondary" size={20} /> Adicionar na Fila
                </h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do funcionário..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all text-sm md:text-base"
                  />
                  <button 
                    onClick={() => {
                      if (newName.trim()) {
                        onAdd(newName);
                        setNewName('');
                      }
                    }}
                    className="h-14 sm:w-14 bg-brand-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 ml-4">Fila Atual ({queue.length})</h3>
                <div className="space-y-3">
                  {queue.map((emp) => (
                    <div key={emp.id} className="glass p-4 md:p-5 rounded-[24px] md:rounded-[32px] flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 font-bold text-sm">
                          {emp.position}
                        </div>
                        <span className="text-white font-bold uppercase tracking-tight text-sm md:text-base">{emp.name}</span>
                      </div>
                      <button 
                        onClick={() => onRemove(emp.id)}
                        className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
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
                  onClick={onShuffle}
                  className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-bg font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-brand-secondary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} /> Sortear Agora
                </button>
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
        {activeTab === 'settings' && (
          <div className="glass p-6 md:p-10 rounded-[40px] space-y-8 max-w-2xl">
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

              <button 
                onClick={() => onUpdateSettings(tempSettings)}
                className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-lg shadow-brand-primary/20 transition-all active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
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
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-lg md:text-xl font-bold transition-all duration-500 ${
            isFirst ? 'bg-white/20 backdrop-blur-md text-white' : 'bg-white/5 text-white/30 group-hover:bg-brand-secondary/20 group-hover:text-brand-secondary'
          }`}>
            {employee.name.charAt(0)}
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
  const [isShuffling, setIsShuffling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [queue, setQueue] = useState<Employee[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAdminUser = user?.email === 'l2xbrasil@gmail.com';
      
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
    const q = query(collection(db, 'queue'), orderBy('position', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => doc.data() as Employee);
      setQueue(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'queue');
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-time Sync: Settings
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as AppSettings);
      } else {
        // If settings don't exist in Firestore, we use DEFAULT_SETTINGS (already set as initial state)
        // We only attempt to initialize the document if the user is the authorized admin
        if (auth.currentUser?.email === 'l2xbrasil@gmail.com') {
          setDoc(doc(db, 'settings', 'global'), DEFAULT_SETTINGS).catch(err => {
            handleFirestoreError(err, OperationType.WRITE, 'settings/global');
          });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });
    return () => unsubscribe();
  }, [isAuthenticated]); // Re-run when auth state changes to check for admin initialization

  useEffect(() => {
    const checkLottery = () => {
      // Only the authorized admin can trigger the automatic lottery write
      if (auth.currentUser?.email !== 'l2xbrasil@gmail.com') return;
      
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const todayStr = now.toISOString().split('T')[0];

      if (
        (settings.lotteryDays || []).includes(currentDay) &&
        currentTime === (settings.lotteryTime || '11:00') &&
        settings.lastLotteryDate !== todayStr &&
        queue.length > 1
      ) {
        handleShuffle();
        updateSettings({ ...settings, lastLotteryDate: todayStr });
      }
    };

    const interval = setInterval(checkLottery, 30000);
    return () => clearInterval(interval);
  }, [settings, queue, isAuthenticated]);

  const handleLogin = () => {
    if (auth.currentUser?.email === 'l2xbrasil@gmail.com') {
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

  const addEmployee = async (name: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEmp: Employee = {
      id,
      name,
      position: queue.length + 1
    };
    try {
      await setDoc(doc(db, 'queue', id), newEmp);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `queue/${id}`);
    }
  };

  const removeEmployee = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'queue', id));
      // Re-order remaining positions
      const remaining = queue.filter(e => e.id !== id);
      const batch = writeBatch(db);
      remaining.forEach((emp, idx) => {
        batch.update(doc(db, 'queue', emp.id), { position: idx + 1 });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `queue/${id}`);
    }
  };

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    }
  };

  const handleShuffle = () => {
    if (queue.length < 2) return;
    setIsShuffling(true);
  };

  const completeShuffle = async () => {
    const shuffled = [...queue].sort(() => Math.random() - 0.5);
    const batch = writeBatch(db);
    shuffled.forEach((emp, idx) => {
      batch.update(doc(db, 'queue', emp.id), { position: idx + 1 });
    });
    try {
      await batch.commit();
      setIsShuffling(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'queue/shuffle');
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
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'queue/bulk');
    }
  };

  const filteredQueue = queue.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      <AnimatePresence>
        {isShuffling && <LotteryOverlay onComplete={completeShuffle} />}
      </AnimatePresence>

      {view === 'login' && <Login onLogin={handleLogin} onBack={() => setView('public')} />}
      
      {view === 'admin' && isAuthenticated && (
        <AdminPanel 
          onLogout={handleLogout} 
          queue={queue} 
          onAdd={addEmployee}
          onRemove={removeEmployee}
          settings={settings}
          onUpdateSettings={updateSettings}
          onShuffle={handleShuffle}
          onSetQueue={setQueueBulk}
        />
      )}

      {view === 'public' && (
        <>
          <Header 
            onAdminClick={() => setView(isAuthenticated ? 'admin' : 'login')} 
            isAuthenticated={isAuthenticated}
          />
          
          <main className="max-w-3xl mx-auto space-y-12">
            <HeroCard queueCount={queue.length} settings={settings} />
            
            <section className="px-6 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-2xl md:text-4xl font-light uppercase tracking-tight text-white mb-2">
                    FILA DE <span className="font-black">SERVIÇO</span>
                  </h3>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-secondary">Ordem de Prioridade</p>
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
