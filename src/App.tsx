import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import emailjs from '@emailjs/browser';
import { 
  auth, 
  db, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signInAnonymously,
  signOut, 
  onAuthStateChanged, 
  updateProfile,
  updateEmail,
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  addDoc,
  deleteDoc, 
  updateDoc,
  query, 
  where,
  onSnapshot, 
  orderBy, 
  Timestamp,
  handleFirestoreError,
  OperationType,
  User
} from './firebase';

// ... (types and other components)

const LoginModal: React.FC<{
  isOpen: boolean;
  appMode: 'teacher' | 'student';
  onClose: () => void;
  onSuccess: (user: User) => void;
}> = ({ isOpen, appMode, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedOtp, setGeneratedOtp] = useState('');

  if (!isOpen) return null;

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);

      // EmailJS Configuration - You need to replace these with your actual IDs from emailjs.com
      const SERVICE_ID = 'service_hlqygmo'; // e.g., 'service_xxxxx'
      const TEMPLATE_ID = 'template_0adcs3i'; // e.g., 'template_xxxxx'
      const PUBLIC_KEY = 'R5zaUzpB9xS06L2SB'; // e.g., 'user_xxxxx'

      const templateParams = {
        to_email: email.trim(),
        passcode: code,
        time: new Date().toLocaleTimeString(),
      };

      try {
        const result = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('EmailJS Success:', result.status, result.text);
        setStep('otp');
      } catch (emailError: any) {
        console.error('EmailJS Error Details:', emailError);
        const errorMessage = emailError?.text || emailError?.message || JSON.stringify(emailError);
        throw new Error(`EmailJS Error: ${errorMessage}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your email or try again.');
      console.error('Full Error Object:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (otp === generatedOtp) {
        // In a real app, you'd use a more secure way to sign in.
        // Here we'll use a fixed password for the email or create a new user.
        // Since we don't have a password from the user, we'll use a deterministic one 
        // or just sign in anonymously and link it (but that's complex).
        // Let's use a simple approach: createUserWithEmailAndPassword with a fixed suffix
        // or just sign in if they already exist.
        
        const dummyPassword = `OTP_AUTH_${email.split('@')[0]}_SECURE`;
        
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, dummyPassword);
          onSuccess(userCredential.user);
          onClose();
        } catch (signInErr: any) {
          // Handle both user-not-found and invalid-credential (which replaces it in some configs)
          if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, dummyPassword);
              await updateProfile(userCredential.user, { displayName: email.split('@')[0] });
              onSuccess(userCredential.user);
              onClose();
            } catch (createErr: any) {
              if (createErr.code === 'auth/email-already-in-use') {
                setError('This email is already registered with a different login method (e.g., Google). For security, please use a different email or enable Email/Password login for this account in Firebase Console.');
              } else {
                setError(createErr.message || 'Failed to create account.');
              }
            }
          } else {
            setError(signInErr.message || 'Sign in failed.');
          }
        }
      } else {
        setError('Invalid verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100 p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900">
            {step === 'email' ? 'Sign In' : 'Verify Email'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Plus className="rotate-45" size={24} />
          </button>
        </div>

        {step === 'email' ? (
          <form onSubmit={sendOtp} className="space-y-4">
            <p className="text-xs text-slate-500">Enter your email to receive a 6-digit verification code.</p>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="email@gmail.com"
                required
              />
            </div>
            {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Send Code'}
            </button>

            <a
              href="mailto:xutfur0@gmail.com?subject=Issue Report - Tuition Tracker Pro&body=Hello Support,%0D%0A%0D%0AI would like to report an issue:%0D%0A%0D%0A[Describe your issue here]%0D%0A%0D%0AApp Version: 1.0.0"
              className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-all text-[10px] font-bold mt-2"
            >
              <LifeBuoy size={12} />
              Report an Issue
            </a>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-xs text-slate-500">We've sent a code to <span className="font-bold text-slate-900">{email}</span></p>
            <div className="relative">
              <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="000000"
                required
              />
            </div>
            {error && <p className="text-[10px] text-red-500 font-bold">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-green-100 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Change Email
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  differenceInDays,
  startOfDay
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  GraduationCap,
  Presentation,
  DollarSign, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  User as UserIcon,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Info,
  Settings,
  Mail,
  Download,
  Upload,
  Wifi,
  WifiOff,
  Copy,
  ClipboardList,
  Trophy,
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  FileBarChart,
  LifeBuoy,
  Paperclip,
  Image as ImageIcon,
  X,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BannerAd, useInterstitialAd, useRewardedAd, useAppOpenAd, initializeAdMob } from './components/AdMob';
import { ErrorBoundary } from './components/ErrorBoundary';

// Types
interface Student {
  id: string;
  name: string;
  startDate: string;
  tuitionTime?: string; // HH:MM
  daysPerMonth: number;
  subject: string;
  customSubject?: string;
  monthlySalary: number;
  createdAt: string;
  connectionCode?: string;
}

interface Teacher {
  id: string;
  name: string;
  startDate: string;
  time?: string; // HH:MM
  daysPerMonth: number;
  subject: string;
  customSubject?: string;
  monthlySalary: number;
  createdAt: string;
  // Connected Mode fields
  mode?: 'manual' | 'connected';
  updatedAt?: string;
  syncStatus?: 'pending' | 'synced';
  teacherId?: string;
  studentId?: string;
  isReadOnly?: boolean;
}

interface Reminder {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'class' | 'payment';
  studentId?: string;
  isRead: boolean;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  createdAt: string;
}

interface SalaryRecord {
  id: string;
  userId: string;
  studentId: string;
  studentName: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid';
  paidAt?: string;
  createdAt: string;
}

interface Exam {
  id: string;
  subject: string;
  customSubject?: string;
  date: string;
  totalMarks: number;
  obtainedMarks: number;
  studentId?: string;
  teacherId?: string;
  createdAt: string;
  uid: string;
}

interface Journal {
  id: string;
  userId: string;
  studentId?: string;
  teacherId?: string;
  date: string;
  subject: string;
  customSubject?: string;
  content: string;
  createdAt: string;
}

interface StudentNote {
  id: string;
  studentId: string;
  teacherId: string;
  content: string;
  attachment?: {
    name: string;
    type: 'image' | 'pdf';
    data: string;
  };
  createdAt: string;
}

interface BackupData {
  students: Student[];
  teachers?: Teacher[];
  attendance: AttendanceRecord[];
  teacherAttendance?: AttendanceRecord[];
  salaries: SalaryRecord[];
  teacherSalaries?: SalaryRecord[];
  exams?: Exam[];
  journals?: Journal[];
  version: string;
  exportedAt: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ isOpen, title, message, onConfirm, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-6">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-2xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProfileModal: React.FC<{
  isOpen: boolean;
  user: User | null;
  appMode: 'teacher' | 'student';
  onClose: () => void;
  onUpdate: (name: string, email: string) => Promise<void>;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleMode: () => void;
  onLogout: () => void;
  onLogin: () => void;
}> = ({ isOpen, user, appMode, onClose, onUpdate, onBackup, onRestore, onToggleMode, onLogout, onLogin }) => {
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    try {
      await onUpdate(name, email);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-slate-900">{user ? 'User Profile' : 'Account Settings'}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {user && !user.isAnonymous && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="Your Name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">App Mode</h4>
              <button
                type="button"
                onClick={onToggleMode}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-sm font-bold transition-all border border-blue-100 mb-4"
              >
                Switch to {appMode === 'teacher' ? 'Student' : 'Teacher'} Version
              </button>
              
              {user && !user.isAnonymous && (
                <>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Cloud Backup & Restore</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={onBackup}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-all border border-slate-100"
                    >
                      <Download size={14} />
                      Backup Data
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-all border border-slate-100"
                    >
                      <Upload size={14} />
                      Restore Data
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onRestore}
                      accept=".json"
                      className="hidden"
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {user && !user.isAnonymous && (
              <button
                type="submit"
                disabled={updating}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updating ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  'Save Profile Changes'
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                if (user && !user.isAnonymous) {
                  onLogout();
                } else {
                  onLogin();
                }
              }}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-[0.98] mt-4 border border-slate-100 ${user && !user.isAnonymous ? 'bg-slate-50 text-red-600 hover:bg-red-50' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'}`}
            >
              {user && !user.isAnonymous ? 'Logout' : 'Sign In'}
            </button>

            <a
              href="mailto:xutfur0@gmail.com?subject=Issue Report - Tuition Tracker Pro&body=Hello Support,%0D%0A%0D%0AI would like to report an issue:%0D%0A%0D%0A[Describe your issue here]%0D%0A%0D%0AApp Version: 1.0.0"
              className="w-full py-3 flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 transition-all text-xs font-bold mt-2"
            >
              <LifeBuoy size={14} />
              Report an Issue
            </a>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const SplashScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/20">
          <GraduationCap size={48} className="text-white" />
        </div>
        <div className="text-center">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-3xl font-black text-white tracking-tight"
          >
            Tuition Tracker <span className="text-blue-500">Pro</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-slate-400 font-medium mt-2"
          >
            Manage your tuitions with ease
          </motion.p>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-12 flex flex-col items-center gap-2"
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-1.5 h-1.5 bg-blue-500 rounded-full"
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const RoleSelectionScreen: React.FC<{ onSelect: (role: 'teacher' | 'student') => void }> = ({ onSelect }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6"
    >
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-500/20 mb-8">
        <GraduationCap size={40} className="text-white" />
      </div>
      <h1 className="text-3xl font-black text-slate-900 mb-2 text-center">Welcome To Tuition Tracker App</h1>
      <p className="text-slate-500 text-center mb-12 max-w-xs">How do you want to use the application?</p>
      
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => onSelect('teacher')}
          className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <UserIcon size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">I am a Teacher</h3>
            <p className="text-sm text-slate-500">Manage students, attendance, and fees</p>
          </div>
        </button>
        
        <button
          onClick={() => onSelect('student')}
          className="w-full bg-white p-6 rounded-3xl shadow-sm border border-slate-200 hover:border-green-500 hover:shadow-md transition-all flex items-center gap-4 text-left group"
        >
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
            <GraduationCap size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">I am a Student</h3>
            <p className="text-sm text-slate-500">Track classes, teachers, and payments</p>
          </div>
        </button>
      </div>
    </motion.div>
  );
};

// Notification Helper
const sendNotification = (title: string, options?: NotificationOptions) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    new Notification(title, options);
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification(title, options);
      }
    });
  }
};

const AppContent: React.FC = () => {
  const [hasSelectedMode, setHasSelectedMode] = useState<boolean>(
    localStorage.getItem('appMode') !== null
  );
  const [appMode, setAppMode] = useState<'teacher' | 'student'>(
    (localStorage.getItem('appMode') as 'teacher' | 'student') || 'teacher'
  );
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStatusToast, setShowStatusToast] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // AdMob ইনিশিয়ালাইজ করা
    initializeAdMob();

    const handleOnline = () => {
      setIsOnline(true);
      setShowStatusToast(true);
      setTimeout(() => setShowStatusToast(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowStatusToast(true);
      setTimeout(() => setShowStatusToast(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'salary' | 'report' | 'exams'>('dashboard');

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // Students State
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentStartDate, setNewStudentStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newStudentDaysPerMonth, setNewStudentDaysPerMonth] = useState('20');
  const [newStudentSubject, setNewStudentSubject] = useState('Mathematics');
  const [newStudentCustomSubject, setNewStudentCustomSubject] = useState('');
  const [newStudentMonthlySalary, setNewStudentMonthlySalary] = useState('');
  const [newStudentTuitionTime, setNewStudentTuitionTime] = useState('15:00');

  // Teachers State (for Student Mode)
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherStartDate, setNewTeacherStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newTeacherDaysPerMonth, setNewTeacherDaysPerMonth] = useState('20');
  const [newTeacherSubject, setNewTeacherSubject] = useState('Mathematics');
  const [newTeacherCustomSubject, setNewTeacherCustomSubject] = useState('');
  const [newTeacherMonthlySalary, setNewTeacherMonthlySalary] = useState('');
  const [newTeacherTime, setNewTeacherTime] = useState('15:00');

  // Connected Mode State
  const [studentCode, setStudentCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Attendance State
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const filteredAttendance = useMemo(() => {
    if (!selectedStudentId) return [];
    return allAttendance.filter(r => r.studentId === selectedStudentId);
  }, [allAttendance, selectedStudentId]);

  const [teacherAttendance, setTeacherAttendance] = useState<AttendanceRecord[]>([]);
  const filteredTeacherAttendance = useMemo(() => {
    if (!selectedTeacherId) return [];
    return teacherAttendance.filter(r => r.studentId === selectedTeacherId);
  }, [teacherAttendance, selectedTeacherId]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Salary State
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [newSalary, setNewSalary] = useState({ studentId: '', month: format(new Date(), 'MMMM yyyy'), amount: '' });

  const [teacherSalaries, setTeacherSalaries] = useState<SalaryRecord[]>([]);
  const [newTeacherSalary, setNewTeacherSalary] = useState({ teacherId: '', month: format(new Date(), 'MMMM yyyy'), amount: '' });

  // Scroll to top when tab, mode, selected entity, or month changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, appMode, selectedStudentId, selectedTeacherId, currentMonth]);

  // Exams State
  const [exams, setExams] = useState<Exam[]>([]);
  const [newExam, setNewExam] = useState({
    subject: 'Mathematics',
    customSubject: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    totalMarks: '100',
    obtainedMarks: '',
    studentId: '',
    teacherId: ''
  });

  const [journals, setJournals] = useState<Journal[]>([]);
  const [newJournal, setNewJournal] = useState({
    studentId: '',
    teacherId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    subject: 'Mathematics',
    customSubject: '',
    content: ''
  });

  // Notes State
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteAttachment, setNewNoteAttachment] = useState<{ name: string, type: 'image' | 'pdf', data: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const filteredNotes = useMemo(() => {
    if (appMode === 'teacher') return studentNotes;
    if (!selectedTeacherId) return [];
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    if (!teacher) return [];
    if (teacher.mode === 'connected') {
      return studentNotes.filter(n => n.teacherId === teacher.teacherId);
    }
    return []; // Manual teachers don't have synced notes in this system yet
  }, [studentNotes, appMode, selectedTeacherId, teachers]);

  
  // AdMob Hooks
  const { triggerAction, InterstitialAd } = useInterstitialAd();

  const generateConnectionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'LRx';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  const { showRewarded, RewardedAd } = useRewardedAd();
  const { AppOpenAd } = useAppOpenAd();

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifiedClassIds, setNotifiedClassIds] = useState<Set<string>>(new Set());

  // Reminders Listener
  useEffect(() => {
    if (!user) {
      setReminders([]);
      return;
    }
    const path = `users/${user.uid}/reminders`;
    const q = query(collection(db, path), where('isRead', '==', false), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder));
      setReminders(records);
      
      // Update notifiedClassIds to avoid re-notifying in current session
      setNotifiedClassIds(prev => {
        const next = new Set(prev);
        records.forEach(r => next.add(r.id));
        return next;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    
    return unsubscribe;
  }, [user]);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Reminder Logic
  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      // 1. Class Reminders (10 minutes before)
      students.forEach(async (student) => {
        if (student.tuitionTime && typeof student.tuitionTime === 'string' && student.tuitionTime.includes(':')) {
          const [hours, minutes] = student.tuitionTime.split(':').map(Number);
          const classTime = new Date();
          classTime.setHours(hours, minutes, 0, 0);
          
          const diffInMinutes = (classTime.getTime() - now.getTime()) / (1000 * 60);
          
          // 10-minute Reminder
          if (diffInMinutes > 9 && diffInMinutes <= 11) {
            const reminderId = `class_10_${student.id}_${todayStr}_${student.tuitionTime}`;
            if (!notifiedClassIds.has(reminderId)) {
              const reminderData: Omit<Reminder, 'id'> = {
                userId: user.uid,
                title: 'আজ পড়াতে যাবে',
                message: `${student.name} এর পড়াতে যাওয়ার সময় হয়েছে (${formatTime12H(student.tuitionTime)})`,
                type: 'class',
                studentId: student.id,
                isRead: false,
                createdAt: new Date().toISOString()
              };
              
              try {
                await setDoc(doc(db, `users/${user.uid}/reminders`, reminderId), reminderData);
                sendNotification(reminderData.title, { body: reminderData.message });
                setNotifiedClassIds(prev => new Set(prev).add(reminderId));
              } catch (err) {
                console.error("Failed to save reminder", err);
              }
            }
          }

          // 5-minute Alarm
          if (diffInMinutes > 4 && diffInMinutes <= 6) {
            const alarmId = `alarm_5_${student.id}_${todayStr}_${student.tuitionTime}`;
            if (!notifiedClassIds.has(alarmId)) {
              // Play Alarm Sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log("Audio play failed", e));

              const reminderData: Omit<Reminder, 'id'> = {
                userId: user.uid,
                title: 'এলার্ম: পড়াতে যাওয়ার সময়',
                message: `${student.name} এর পড়াতে যাওয়ার সময় হয়েছে (${formatTime12H(student.tuitionTime)})`,
                type: 'class',
                studentId: student.id,
                isRead: false,
                createdAt: new Date().toISOString()
              };

              try {
                await setDoc(doc(db, `users/${user.uid}/reminders`, alarmId), reminderData);
                sendNotification(reminderData.title, { body: reminderData.message });
                setNotifiedClassIds(prev => new Set(prev).add(alarmId));
              } catch (err) {
                console.error("Failed to save reminder", err);
              }
            }
          }
        }
      });

      // 2. Payment Reminders (Unpaid salaries)
      salaries.forEach(async (salary) => {
        if (salary.status === 'unpaid') {
          const reminderId = `payment_${salary.id}`;
          if (!notifiedClassIds.has(reminderId)) {
            const reminderData: Omit<Reminder, 'id'> = {
              userId: user.uid,
              title: 'বেতন বাকি আছে',
              message: `${salary.studentName} এর ${salary.month} এর বেতন বাকি আছে`,
              type: 'payment',
              studentId: salary.studentId,
              isRead: false,
              createdAt: new Date().toISOString()
            };

            try {
              await setDoc(doc(db, `users/${user.uid}/reminders`, reminderId), reminderData);
              sendNotification(reminderData.title, { body: reminderData.message });
              setNotifiedClassIds(prev => new Set(prev).add(reminderId));
            } catch (err) {
              console.error("Failed to save reminder", err);
            }
          }
        }
      });

      // 3. Cycle End Payment Reminder
      students.forEach(async (student) => {
        const studentAttendanceRecords = allAttendance
          .filter(a => a.studentId === student.id)
          .sort((a, b) => a.date.localeCompare(b.date));
        
        if (studentAttendanceRecords.length === 0) return;

        const totalAttendance = studentAttendanceRecords.length;
        const daysCompletedInCurrentCycle = totalAttendance % student.daysPerMonth;
        const daysLeft = daysCompletedInCurrentCycle === 0 ? 0 : student.daysPerMonth - daysCompletedInCurrentCycle;
        const currentCycle = Math.floor(totalAttendance / student.daysPerMonth) + (daysCompletedInCurrentCycle > 0 ? 1 : 0);
        
        // Notify if 1 or 2 days left, or if cycle just finished (0 days left)
        if (daysLeft <= 2) {
          let hasPaid = false;
          if (daysLeft === 0) {
             // Cycle finished, check if the auto-generated salary for this cycle is paid
             hasPaid = salaries.some(s => s.studentId === student.id && s.month.includes(`Cycle ${currentCycle}`) && s.status === 'paid');
          }

          if (!hasPaid) {
            const reminderId = `cycle_end_${student.id}_${currentCycle}_${daysLeft}`;
            if (!notifiedClassIds.has(reminderId)) {
              const reminderData: Omit<Reminder, 'id'> = {
                userId: user.uid,
                title: daysLeft === 0 ? 'মাস পূর্ণ হয়েছে' : 'মাস শেষ হতে চলেছে',
                message: daysLeft === 0 
                  ? `${student.name} এর ${student.daysPerMonth} দিনের পড়ানোর মাস পূর্ণ হয়েছে। বেতন সংগ্রহ করুন।`
                  : `${student.name} এর পড়ানোর মাস শেষ হতে আর মাত্র ${daysLeft} দিন বাকি।`,
                type: 'payment',
                studentId: student.id,
                isRead: false,
                createdAt: new Date().toISOString()
              };

              try {
                await setDoc(doc(db, `users/${user.uid}/reminders`, reminderId), reminderData);
                sendNotification(reminderData.title, { body: reminderData.message });
                setNotifiedClassIds(prev => new Set(prev).add(reminderId));
              } catch (err) {
                console.error("Failed to save reminder", err);
              }
            }
          }
        }

        // 4. Post-Completion Reminders (2, 4, 5 days after)
        if (daysLeft === 0) {
          const lastRecordDate = parseISO(studentAttendanceRecords[totalAttendance - 1].date);
          const daysSinceCompletion = differenceInDays(startOfDay(now), startOfDay(lastRecordDate));
          
          if ([2, 4, 5].includes(daysSinceCompletion)) {
            const hasPaid = salaries.some(s => s.studentId === student.id && s.month.includes(`Cycle ${currentCycle}`) && s.status === 'paid');
            if (!hasPaid) {
              const reminderId = `post_completion_${student.id}_${currentCycle}_${daysSinceCompletion}`;
              if (!notifiedClassIds.has(reminderId)) {
                const reminderData: Omit<Reminder, 'id'> = {
                  userId: user.uid,
                  title: 'বেতন এখনো বাকি',
                  message: `${student.name} এর মাস পূর্ণ হওয়ার ${daysSinceCompletion} দিন অতিবাহিত হয়েছে। দ্রুত বেতন সংগ্রহ করুন।`,
                  type: 'payment',
                  studentId: student.id,
                  isRead: false,
                  createdAt: new Date().toISOString()
                };

                try {
                  await setDoc(doc(db, `users/${user.uid}/reminders`, reminderId), reminderData);
                  sendNotification(reminderData.title, { body: reminderData.message });
                  setNotifiedClassIds(prev => new Set(prev).add(reminderId));
                } catch (err) {
                  console.error("Failed to save post-completion reminder", err);
                }
              }
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check
    
    return () => clearInterval(interval);
  }, [students, salaries, notifiedClassIds, allAttendance, user]);

  // Auto-dismiss Reminders
  useEffect(() => {
    if (reminders.length > 0) {
      const timer = setTimeout(() => {
        dismissReminder(reminders[0].id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [reminders]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u); // Always update the user state first
      
      if (!u) {
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          console.error("Auto guest login failed", err);
          if (err.code === 'auth/admin-restricted-operation') {
            setAuthError("Anonymous Sign-in is disabled in your Firebase Console. Please enable it in Authentication > Sign-in method to allow guest access.");
          } else {
            setAuthError("Failed to sign in. Please check your internet connection.");
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
        setAuthError(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleRetryAuth = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await signInAnonymously(auth);
    } catch (err: any) {
      console.error("Retry guest login failed", err);
      if (err.code === 'auth/admin-restricted-operation') {
        setAuthError("Anonymous Sign-in is still disabled. Please enable it in the Firebase Console.");
      } else {
        setAuthError("Failed to sign in. Please check your internet connection.");
      }
      setLoading(false);
    }
  };

  // Students Listener
  useEffect(() => {
    if (!user) {
      setStudents([]);
      return;
    }
    const path = `users/${user.uid}/students`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    
    return unsubscribe;
  }, [user]);

  // Teachers Listener
  useEffect(() => {
    if (!user) {
      setTeachers([]);
      return;
    }
    const path = `users/${user.uid}/teachers`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      setTeachers(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
    
    return unsubscribe;
  }, [user]);

  // Attendance Listener
  useEffect(() => {
    if (!user) {
      setAllAttendance([]);
      setTeacherAttendance([]);
      return;
    }
    const path = `users/${user.uid}/attendance`;
    const q = query(collection(db, path), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAllAttendance(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    const teacherPath = `users/${user.uid}/teacher_attendance`;
    const teacherQ = query(collection(db, teacherPath), orderBy('date', 'desc'));
    
    const unsubscribeTeacher = onSnapshot(teacherQ, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setTeacherAttendance(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, teacherPath);
    });
    
    return () => {
      unsubscribe();
      unsubscribeTeacher();
    };
  }, [user]);

  // Connected Teachers Attendance & Salary Listener
  useEffect(() => {
    if (!user || appMode !== 'student') return;

    const connectedTeachers = teachers.filter(t => t.mode === 'connected' && t.teacherId && t.studentId);
    if (connectedTeachers.length === 0) return;

    const unsubscribes = connectedTeachers.flatMap(teacher => {
      // Attendance Listener
      const attendancePath = `teachers/${teacher.teacherId}/students/${teacher.studentId}/attendance`;
      const attendanceQ = query(collection(db, attendancePath), orderBy('date', 'desc'));

      const unsubAttendance = onSnapshot(attendanceQ, (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
        setTeacherAttendance(prev => {
          const otherRecords = prev.filter(r => r.studentId !== teacher.id);
          const mappedRecords = records.map(r => ({ ...r, studentId: teacher.id }));
          return [...otherRecords, ...mappedRecords];
        });
      });

      // Salary Listener
      const salaryPath = `teachers/${teacher.teacherId}/students/${teacher.studentId}/salary`;
      const salaryQ = query(collection(db, salaryPath), orderBy('createdAt', 'desc'));

      const unsubSalary = onSnapshot(salaryQ, (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
        setTeacherSalaries(prev => {
          const otherRecords = prev.filter(r => r.studentId !== teacher.id);
          const mappedRecords = records.map(r => ({ ...r, studentId: teacher.id }));
          return [...otherRecords, ...mappedRecords];
        });
      });

      return [unsubAttendance, unsubSalary];
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, teachers, appMode]);

  // Notes Listener
  useEffect(() => {
    if (!user) {
      setStudentNotes([]);
      return;
    }

    let unsubscribes: (() => void)[] = [];

    if (appMode === 'teacher') {
      if (!selectedStudentId) {
        setStudentNotes([]);
        return;
      }
      const path = `users/${user.uid}/students/${selectedStudentId}/notes`;
      const q = query(collection(db, path), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snapshot) => {
        const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentNote));
        setStudentNotes(records);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      });
      unsubscribes.push(unsub);
    } else {
      // Student Mode - Listen to all connected teachers' notes for this student
      const connectedTeachers = teachers.filter(t => t.mode === 'connected' && t.teacherId && t.studentId);
      if (connectedTeachers.length === 0) {
        setStudentNotes([]);
      } else {
        const studentUnsubs = connectedTeachers.map(teacher => {
          const path = `teachers/${teacher.teacherId}/students/${teacher.studentId}/notes`;
          const q = query(collection(db, path), orderBy('createdAt', 'desc'));
          return onSnapshot(q, (snapshot) => {
            const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentNote));
            setStudentNotes(prev => {
              const otherNotes = prev.filter(n => n.teacherId !== teacher.teacherId);
              return [...otherNotes, ...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            });
          }, (error) => {
            console.error(`Failed to fetch notes for teacher ${teacher.name}`, error);
          });
        });
        unsubscribes = studentUnsubs;
      }
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user, appMode, selectedStudentId, teachers]);

  // Salary Listener
  useEffect(() => {
    if (!user) {
      setSalaries([]);
      setTeacherSalaries([]);
      return;
    }
    const path = `users/${user.uid}/salary`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
      setSalaries(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    const teacherPath = `users/${user.uid}/teacher_salary`;
    const teacherQ = query(collection(db, teacherPath), orderBy('createdAt', 'desc'));
    
    const unsubscribeTeacher = onSnapshot(teacherQ, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
      setTeacherSalaries(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, teacherPath);
    });

    // Exams Listener
    const examsPath = `users/${user.uid}/exams`;
    const examsQ = query(collection(db, examsPath), orderBy('date', 'desc'));
    const unsubscribeExams = onSnapshot(examsQ, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
      setExams(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, examsPath);
    });

    // Journal Listener
    const journalPath = `users/${user.uid}/journal`;
    const journalQ = query(collection(db, journalPath), orderBy('date', 'desc'));
    const unsubscribeJournal = onSnapshot(journalQ, (snapshot) => {
      const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Journal));
      setJournals(records);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, journalPath);
    });
    
    return () => {
      unsubscribe();
      unsubscribeTeacher();
      unsubscribeExams();
      unsubscribeJournal();
    };
  }, [user]);

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Actions
  const handleLogin = () => {
    setIsLoginOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedStudentId(null);
      setStudents([]);
      setAllAttendance([]);
      setSalaries([]);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleUpdateProfile = async (name: string, email: string) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: name });
      if (email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, email);
      }
      // Force refresh user state
      setUser({ ...auth.currentUser });
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please sign in again to update your email address.');
      }
      throw error;
    }
  };

  const handleBackup = async () => {
    const backupData: BackupData = {
      students,
      attendance: allAttendance,
      salaries,
      version: '1.0.0',
      exportedAt: new Date().toISOString()
    };

    const fileName = `tuition-tracker-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    const dataString = JSON.stringify(backupData, null, 2);

    if (Capacitor.isNativePlatform()) {
      try {
        // Write file to cache directory temporarily
        const result = await Filesystem.writeFile({
          path: fileName,
          data: dataString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Share the file so user can save it or send it
        await Share.share({
          title: 'Tuition Tracker Backup',
          text: 'Here is your tuition data backup file.',
          url: result.uri,
          dialogTitle: 'Save Backup',
        });
      } catch (error) {
        console.error('Backup failed on mobile:', error);
        alert('Failed to create backup on mobile. Please check permissions.');
      }
    } else {
      // Web fallback
      const blob = new Blob([dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data: BackupData = JSON.parse(event.target?.result as string);
        
        if (!data.students || !data.attendance || !data.salaries) {
          throw new Error('Invalid backup file format');
        }

        setConfirmDialog({
          isOpen: true,
          title: 'Restore Data',
          message: `This will restore ${data.students.length} students, ${data.attendance.length} attendance records, and ${data.salaries.length} salary records. Existing data with same IDs will be overwritten. Continue?`,
          onConfirm: async () => {
            try {
              // Restore Students
              for (const student of data.students) {
                await setDoc(doc(db, `users/${user.uid}/students`, student.id), student);
              }
              // Restore Attendance
              for (const record of data.attendance) {
                await setDoc(doc(db, `users/${user.uid}/attendance`, record.id), record);
              }
              // Restore Salaries
              for (const salary of data.salaries) {
                await setDoc(doc(db, `users/${user.uid}/salary`, salary.id), salary);
              }
              
              setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              // Success notification could be added here
            } catch (err) {
              console.error('Restore failed', err);
              alert('Failed to restore some data. Please check your connection.');
            }
          }
        });
      } catch (err) {
        console.error('Failed to parse backup file', err);
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const addStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newStudentName.trim() || !newStudentStartDate || !newStudentMonthlySalary) return;
    const path = `users/${user.uid}/students`;
    const publicPath = `teachers/${user.uid}/students`;
    const codesPath = `connection_codes`;
    try {
      const id = crypto.randomUUID();
      const connectionCode = generateConnectionCode();
      const studentData = {
        name: newStudentName.trim(),
        startDate: newStudentStartDate,
        tuitionTime: newStudentTuitionTime,
        daysPerMonth: parseInt(newStudentDaysPerMonth) || 20,
        subject: newStudentSubject,
        customSubject: newStudentSubject === 'Custom' ? newStudentCustomSubject : '',
        monthlySalary: parseFloat(newStudentMonthlySalary) || 0,
        createdAt: new Date().toISOString(),
        teacherName: user.displayName || 'Teacher',
        teacherId: user.uid,
        connectionCode: connectionCode
      };
      
      // Save to teacher's private node
      await setDoc(doc(db, path, id), studentData);
      
      // Save to public node for student connection
      await setDoc(doc(db, publicPath, id), studentData);

      // Save connection code mapping
      await setDoc(doc(db, codesPath, connectionCode.toUpperCase()), {
        teacherId: user.uid,
        studentId: id,
        createdAt: new Date().toISOString()
      });

      setNewStudentName('');
      setNewStudentStartDate(format(new Date(), 'yyyy-MM-dd'));
      setNewStudentDaysPerMonth('20');
      setNewStudentMonthlySalary('');
      setNewStudentTuitionTime('15:00');
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTeacherName.trim() || !newTeacherStartDate || !newTeacherMonthlySalary) return;
    const path = `users/${user.uid}/teachers`;
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, path, id), {
        name: newTeacherName.trim(),
        startDate: newTeacherStartDate,
        time: newTeacherTime,
        daysPerMonth: parseInt(newTeacherDaysPerMonth) || 20,
        subject: newTeacherSubject === 'Custom' ? newTeacherCustomSubject : newTeacherSubject,
        monthlySalary: parseFloat(newTeacherMonthlySalary) || 0,
        createdAt: new Date().toISOString(),
        mode: 'manual'
      });
      setNewTeacherName('');
      setNewTeacherStartDate(format(new Date(), 'yyyy-MM-dd'));
      setNewTeacherDaysPerMonth('20');
      setNewTeacherSubject('Mathematics');
      setNewTeacherCustomSubject('');
      setNewTeacherMonthlySalary('');
      setNewTeacherTime('15:00');
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const connectTeacher = async () => {
    if (!user || !studentCode.trim()) return;
    setIsConnecting(true);
    try {
      let teacherId = '';
      let studentId = '';

      // Check if it's the new format (LRxXXXXX) or old format (TEACHER_ID:STUDENT_ID)
      const inputCode = studentCode.trim().toUpperCase();
      if (inputCode.startsWith('LRX')) {
        const codeDoc = await getDoc(doc(db, 'connection_codes', inputCode));
        if (!codeDoc.exists()) {
          alert('Invalid Student Code. Please check and try again.');
          setIsConnecting(false);
          return;
        }
        const mapping = codeDoc.data();
        teacherId = mapping.teacherId;
        studentId = mapping.studentId;
      } else {
        const parts = studentCode.trim().split(':');
        if (parts.length !== 2) {
          alert('Invalid Student Code. Format: LRxXXXXX or TEACHER_ID:STUDENT_ID');
          setIsConnecting(false);
          return;
        }
        [teacherId, studentId] = parts;
      }

      // Fetch student data from teacher's node
      const studentDoc = await getDoc(doc(db, `teachers/${teacherId}/students`, studentId));
      if (!studentDoc.exists()) {
        alert('Student not found for this code.');
        return;
      }

      const studentData = studentDoc.data();
      
      // Create a new connected teacher record
      const newConnectedTeacher: Teacher = {
        id: crypto.randomUUID(),
        name: studentData.teacherName || 'Connected Teacher',
        startDate: studentData.startDate,
        time: studentData.tuitionTime,
        daysPerMonth: studentData.daysPerMonth,
        subject: studentData.subject || 'Tuition',
        monthlySalary: studentData.monthlySalary,
        createdAt: new Date().toISOString(),
        mode: 'connected',
        teacherId,
        studentId,
        isReadOnly: true,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };

      // Save to student's own teachers list
      await setDoc(doc(db, `users/${user.uid}/teachers`, newConnectedTeacher.id), newConnectedTeacher);
      
      setStudentCode('');
      alert('Connected successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      alert('Failed to connect. Please check your internet and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const deleteStudent = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/students`;
    openConfirm(
      'Delete Student?',
      'Are you sure you want to delete this student and all their records? This action cannot be undone.',
      async () => {
        try {
          await deleteDoc(doc(db, path, id));
          if (selectedStudentId === id) setSelectedStudentId(null);
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const deleteTeacher = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/teachers`;
    openConfirm(
      'Delete Teacher?',
      'Are you sure you want to delete this teacher and all their records? This action cannot be undone.',
      async () => {
        try {
          await deleteDoc(doc(db, path, id));
          if (selectedTeacherId === id) setSelectedTeacherId(null);
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const addExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newExam.date || !newExam.totalMarks || !newExam.obtainedMarks) return;
    
    const path = `users/${user.uid}/exams`;
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, path, id), {
        subject: newExam.subject === 'Custom' ? newExam.customSubject : newExam.subject,
        customSubject: newExam.customSubject,
        date: newExam.date,
        totalMarks: parseFloat(newExam.totalMarks),
        obtainedMarks: parseFloat(newExam.obtainedMarks),
        studentId: appMode === 'teacher' ? newExam.studentId : '',
        teacherId: appMode === 'student' ? newExam.teacherId : '',
        createdAt: new Date().toISOString(),
        uid: user.uid
      });
      setNewExam(prev => ({
        ...prev,
        obtainedMarks: '',
        customSubject: ''
      }));
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteExam = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/exams`;
    openConfirm(
      'Delete Exam?',
      'Are you sure you want to delete this exam record?',
      async () => {
        try {
          await deleteDoc(doc(db, path, id));
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const addJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newJournal.content.trim()) return;

    const path = `users/${user.uid}/journal`;
    try {
      const id = crypto.randomUUID();
      const journalData = {
        userId: user.uid,
        studentId: appMode === 'teacher' ? newJournal.studentId : '',
        teacherId: appMode === 'student' ? newJournal.teacherId : '',
        date: newJournal.date,
        subject: newJournal.subject === 'Custom' ? newJournal.customSubject : newJournal.subject,
        customSubject: newJournal.customSubject,
        content: newJournal.content,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, path, id), journalData);
      setNewJournal(prev => ({ ...prev, content: '', customSubject: '' }));
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteJournal = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/journal`;
    openConfirm(
      'Delete Journal Entry?',
      'Are you sure you want to delete this class note?',
      async () => {
        try {
          await deleteDoc(doc(db, path, id));
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const generatePDF = async () => {
    const jspdfModule = await import('jspdf');
    const jsPDF = jspdfModule.jsPDF || (jspdfModule as any).default;
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = (autoTableModule as any).default || autoTableModule;
    
    const doc = new jsPDF();
    const monthStr = format(currentMonth, 'MMMM yyyy');
    triggerAction();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('Tuition Tracker Report', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`Report Period: ${monthStr}`, 14, 37);
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(14, 42, 196, 42);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Monthly Summary', 14, 52);

    const monthAttendance = (appMode === 'teacher' ? allAttendance : teacherAttendance).filter(a => format(parseISO(a.date), 'MMMM yyyy') === monthStr);
    const monthSalaries = (appMode === 'teacher' ? salaries : teacherSalaries).filter(s => s.month === monthStr);
    const totalEarnings = monthSalaries.reduce((sum, s) => sum + s.amount, 0);

    doc.setFontSize(10);
    doc.text(`Total Classes: ${monthAttendance.length}`, 14, 60);
    doc.text(`Total ${appMode === 'teacher' ? 'Earnings' : 'Fees'}: ${totalEarnings} BDT`, 14, 67);

    // Attendance Table
    doc.setFontSize(14);
    doc.text('Attendance Details', 14, 80);
    
    const attendanceData = monthAttendance.map(a => {
      const entity = appMode === 'teacher' ? students.find(s => s.id === a.studentId) : teachers.find(t => t.id === a.studentId);
      return [
        format(parseISO(a.date), 'PPP'),
        entity?.name || 'Unknown'
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Date', appMode === 'teacher' ? 'Student' : 'Teacher']],
      body: attendanceData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14, right: 14 }
    });

    // Salary Table
    const finalY = (doc as any).lastAutoTable.finalY || 85;
    doc.setFontSize(14);
    doc.text('Payment Details', 14, finalY + 15);

    const salaryData = monthSalaries.map(s => [
      s.month,
      appMode === 'teacher' ? s.studentName : (teachers.find(t => t.id === s.studentId)?.name || 'Teacher'),
      `${s.amount} ৳`,
      s.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [['Month', appMode === 'teacher' ? 'Student' : 'Teacher', 'Amount', 'Status']],
      body: salaryData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // green-600
      margin: { left: 14, right: 14 }
    });

    doc.save(`Tuition_Report_${monthStr.replace(' ', '_')}.pdf`);
  };

  const toggleAttendance = async (date: Date) => {
    if (!user) return;
    
    if (appMode === 'teacher') {
      if (!selectedStudentId) return;
      const student = students.find(s => s.id === selectedStudentId);
      if (!student) return;

      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = filteredAttendance.find(a => a.date === dateStr);
      const path = `users/${user.uid}/attendance`;
      const publicPath = `teachers/${user.uid}/students/${selectedStudentId}/attendance`;

      try {
        if (existing) {
          await deleteDoc(doc(db, path, existing.id));
          await deleteDoc(doc(db, publicPath, existing.id));
        } else {
          // Check if month limit is reached
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);
          const monthAttendanceCount = filteredAttendance.filter(a => {
            const d = parseISO(a.date);
            return d >= monthStart && d <= monthEnd;
          }).length;

          if (student.daysPerMonth > 0 && monthAttendanceCount >= student.daysPerMonth) {
            // Show a custom alert or toast
            setConfirmDialog({
              isOpen: true,
              title: 'Limit Reached',
              message: `You have already marked ${student.daysPerMonth} days for ${format(date, 'MMMM yyyy')}. You cannot mark more than the set "Days per Month" (${student.daysPerMonth}).`,
              onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            });
            return;
          }

          const id = `${selectedStudentId}_${dateStr}`;
          const attendanceData = {
            userId: user.uid,
            studentId: selectedStudentId,
            date: dateStr,
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, path, id), attendanceData);
          await setDoc(doc(db, publicPath, id), attendanceData);

          // Check for cycle completion
          const totalAttendance = filteredAttendance.length + 1;
          
          if (student.daysPerMonth > 0 && totalAttendance % student.daysPerMonth === 0) {
            const cycleNumber = Math.floor(totalAttendance / student.daysPerMonth);
            const salaryPath = `users/${user.uid}/salary`;
            const salaryId = `auto_${selectedStudentId}_cycle_${cycleNumber}`;
            
            // Check if this cycle salary already exists to avoid duplicates
            const existingSalary = salaries.find(s => s.id === salaryId);
            if (!existingSalary) {
              const salaryData = {
                userId: user.uid,
                studentId: selectedStudentId,
                studentName: student.name,
                month: format(date, 'MMMM yyyy'),
                amount: student.monthlySalary,
                status: 'unpaid',
                createdAt: new Date().toISOString()
              };
              await setDoc(doc(db, salaryPath, salaryId), salaryData);
              const publicSalaryPath = `teachers/${user.uid}/students/${selectedStudentId}/salary`;
              await setDoc(doc(db, publicSalaryPath, salaryId), salaryData);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      // Student Mode
      if (!selectedTeacherId) return;
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (!teacher || teacher.mode === 'connected') return;

      const dateStr = format(date, 'yyyy-MM-dd');
      const existing = filteredTeacherAttendance.find(a => a.date === dateStr);
      const path = `users/${user.uid}/attendance`;

      try {
        if (existing) {
          await deleteDoc(doc(db, path, existing.id));
        } else {
          // Check if month limit is reached
          const monthStart = startOfMonth(date);
          const monthEnd = endOfMonth(date);
          const monthAttendanceCount = filteredTeacherAttendance.filter(a => {
            const d = parseISO(a.date);
            return d >= monthStart && d <= monthEnd;
          }).length;

          if (teacher.daysPerMonth > 0 && monthAttendanceCount >= teacher.daysPerMonth) {
            setConfirmDialog({
              isOpen: true,
              title: 'Limit Reached',
              message: `You have already marked ${teacher.daysPerMonth} days for ${format(date, 'MMMM yyyy')}. You cannot mark more than the set "Days per Month" (${teacher.daysPerMonth}).`,
              onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
            });
            return;
          }

          const id = `${selectedTeacherId}_${dateStr}`;
          await setDoc(doc(db, path, id), {
            userId: user.uid,
            studentId: selectedTeacherId,
            date: dateStr,
            createdAt: new Date().toISOString()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }
  };

  const addSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !(appMode === 'teacher' ? newSalary.studentId : newSalary.teacherId) || !newSalary.amount) return;

    const entity = appMode === 'teacher' 
      ? students.find(s => s.id === newSalary.studentId)
      : teachers.find(t => t.id === newSalary.teacherId);
    if (!entity) return;

    const path = `users/${user.uid}/${appMode === 'teacher' ? 'salary' : 'teacher_salary'}`;
    const publicPath = appMode === 'teacher' ? `teachers/${user.uid}/students/${newSalary.studentId}/salary` : null;

    try {
      const id = crypto.randomUUID();
      const salaryData = {
        userId: user.uid,
        studentId: appMode === 'teacher' ? newSalary.studentId : newSalary.teacherId,
        studentName: entity.name,
        month: newSalary.month,
        amount: parseFloat(newSalary.amount),
        status: 'paid',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, path, id), salaryData);
      if (publicPath) {
        await setDoc(doc(db, publicPath, id), salaryData);
      }
      setNewSalary({ ...newSalary, studentId: '', teacherId: '', amount: '' });
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const markSalaryAsPaid = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/${appMode === 'teacher' ? 'salary' : 'teacher_salary'}`;
    try {
      const updateData = {
        status: 'paid',
        paidAt: new Date().toISOString()
      };
      await updateDoc(doc(db, path, id), updateData);
      
      // Also update public node if it's a teacher marking student salary
      if (appMode === 'teacher') {
        const salaryDoc = await getDoc(doc(db, path, id));
        if (salaryDoc.exists()) {
          const studentId = salaryDoc.data().studentId;
          const publicPath = `teachers/${user.uid}/students/${studentId}/salary`;
          await updateDoc(doc(db, publicPath, id), updateData).catch(() => {});
        }
      }
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteSalary = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/${appMode === 'teacher' ? 'salary' : 'teacher_salary'}`;
    openConfirm(
      'Delete Salary Record?',
      'Are you sure you want to delete this salary record?',
      async () => {
        try {
          // Get studentId before deleting if teacher
          let studentId = '';
          if (appMode === 'teacher') {
            const salaryDoc = await getDoc(doc(db, path, id));
            if (salaryDoc.exists()) {
              studentId = salaryDoc.data().studentId;
            }
          }

          await deleteDoc(doc(db, path, id));

          if (appMode === 'teacher' && studentId) {
            const publicPath = `teachers/${user.uid}/students/${studentId}/salary`;
            await deleteDoc(doc(db, publicPath, id)).catch(() => {});
          }
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || appMode !== 'teacher' || !selectedStudentId || (!newNoteContent.trim() && !newNoteAttachment)) return;

    const path = `users/${user.uid}/students/${selectedStudentId}/notes`;
    const publicPath = `teachers/${user.uid}/students/${selectedStudentId}/notes`;

    try {
      const id = crypto.randomUUID();
      const noteData: StudentNote = {
        id,
        studentId: selectedStudentId,
        teacherId: user.uid,
        content: newNoteContent.trim(),
        createdAt: new Date().toISOString()
      };

      if (newNoteAttachment) {
        noteData.attachment = newNoteAttachment;
      }

      await setDoc(doc(db, path, id), noteData);
      await setDoc(doc(db, publicPath, id), noteData);

      setNewNoteContent('');
      setNewNoteAttachment(null);
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const deleteNote = async (id: string) => {
    if (!user || appMode !== 'teacher' || !selectedStudentId) return;
    const path = `users/${user.uid}/students/${selectedStudentId}/notes`;
    const publicPath = `teachers/${user.uid}/students/${selectedStudentId}/notes`;

    openConfirm(
      'Delete Note?',
      'Are you sure you want to delete this note and its attachment?',
      async () => {
        try {
          await deleteDoc(doc(db, path, id));
          await deleteDoc(doc(db, publicPath, id));
          triggerAction();
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 500KB
    if (file.size > 500 * 1024) {
      alert('File size too large. Please select a file smaller than 500KB.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result as string;
      const type = file.type.includes('image') ? 'image' : 'pdf';
      setNewNoteAttachment({
        name: file.name,
        type: type as 'image' | 'pdf',
        data: data
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const totalMonthlyEarnings = useMemo(() => {
    const currentMonthName = format(new Date(), 'MMMM');
    return salaries
      .filter(s => s.status === 'paid' && s.month.includes(currentMonthName))
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salaries]);

  const chartData = useMemo(() => {
    const currentYear = format(new Date(), 'yyyy');
    return MONTHS.map(m => {
      const monthIndex = MONTHS.indexOf(m);
      const monthStr = format(new Date(parseInt(currentYear), monthIndex, 1), 'yyyy-MM');
      
      return {
        name: m.substring(0, 3),
        count: (appMode === 'teacher' ? allAttendance : teacherAttendance)
          .filter(a => a.date && a.date.startsWith(monthStr))
          .length
      };
    });
  }, [allAttendance, teacherAttendance, appMode]);

  const studentAttendanceData = useMemo(() => {
    return students.map(s => ({
      name: s.name,
      days: allAttendance.filter(a => a.studentId === s.id).length
    }));
  }, [students, allAttendance]);

  const formatTime12H = (time24: string | undefined) => {
    if (!time24 || !time24.includes(':')) return 'N/A';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const nextClass = useMemo(() => {
    if (appMode !== 'student' || teachers.length === 0) return null;
    
    const now = new Date();
    const currentTimeStr = format(now, 'HH:mm');
    
    // Sort teachers by time
    const sortedTeachers = [...teachers].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    
    // Find first class today that is after now
    let next = sortedTeachers.find(t => (t.time || '00:00') > currentTimeStr);
    
    // If no more classes today, take the first class tomorrow
    if (!next) {
      next = sortedTeachers[0];
    }
    
    return next;
  }, [teachers, appMode]);

  const subjectStats = useMemo(() => {
    if (appMode !== 'student') return null;
    
    const stats: { [key: string]: number } = {};
    let total = 0;
    
    teacherAttendance.forEach(a => {
      const teacher = teachers.find(t => t.id === a.studentId);
      if (teacher) {
        const subject = teacher.subject === 'Other' ? (teacher.customSubject || 'Other') : teacher.subject;
        stats[subject] = (stats[subject] || 0) + 1;
        total++;
      }
    });
    
    return { total, subjectWise: stats };
  }, [teacherAttendance, teachers, appMode]);

  const attendanceThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return allAttendance.filter(a => {
      if (!a.date) return false;
      const d = parseISO(a.date);
      return d >= start && d <= end;
    }).length;
  }, [allAttendance]);

  const dismissReminder = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/reminders/${id}`;
    try {
      await updateDoc(doc(db, path), { isRead: true });
    } catch (err) {
      console.error("Failed to dismiss reminder", err);
      // Fallback for local state if Firestore fails
      setReminders(prev => prev.filter(r => r.id !== id));
    }
  };


  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : !hasSelectedMode ? (
        <RoleSelectionScreen 
          key="role-selection" 
          onSelect={(role) => {
            setAppMode(role);
            localStorage.setItem('appMode', role);
            setHasSelectedMode(true);
          }} 
        />
      ) : (
        <motion.div
          key="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen bg-slate-50 pb-24"
        >
          {loading ? (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"
              />
            </div>
          ) : (
            <>
              <AppOpenAd />
      {/* Reminders Overlay */}
      <div className="fixed top-4 left-4 right-4 z-[100] pointer-events-none space-y-3">
        <AnimatePresence>
          {reminders.map(reminder => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto bg-white rounded-2xl p-4 shadow-2xl border border-blue-100 flex items-start gap-4 max-w-md mx-auto"
            >
              <div className={`p-3 rounded-xl ${reminder.type === 'class' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                {reminder.type === 'class' ? <Clock size={20} /> : <DollarSign size={20} />}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-slate-900">{reminder.title}</h4>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{reminder.message}</p>
              </div>
              <button 
                onClick={() => dismissReminder(reminder.id)}
                className="p-1 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <Presentation size={18} className="text-white" />
            </div>
            <span className="font-black text-slate-900 tracking-tight">Tuition Tracker Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${isOnline ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600 animate-pulse'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
            </div>
            {user && !user.isAnonymous ? (
              <>
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded-xl transition-colors text-left"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Educator</p>
                  </div>
                  {user.photoURL ? (
                    <img src={user.photoURL} className="w-9 h-9 rounded-full border-2 border-white shadow-sm" alt="Profile" />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-white shadow-sm bg-blue-100 flex items-center justify-center text-blue-600">
                      <UserIcon size={18} />
                    </div>
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={handleLogin}
                className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <UserIcon size={14} />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 pb-32 space-y-6">
        <AnimatePresence mode="wait">
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 border border-red-200 p-4 rounded-2xl mb-6 flex items-start gap-3"
            >
              <div className="text-red-500 mt-0.5">
                <CheckCircle2 size={18} className="rotate-45" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">Setup Required</p>
                <p className="text-xs text-red-700 mt-1 leading-relaxed">{authError}</p>
                <div className="flex items-center gap-4 mt-3">
                  <a 
                    href="https://console.firebase.google.com/project/gen-lang-client-0997374663/authentication/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 underline"
                  >
                    Open Firebase Console
                  </a>
                  <button 
                    onClick={handleRetryAuth}
                    className="text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-600"
                  >
                    Retry
                  </button>
                  <button 
                    onClick={() => setAuthError(null)}
                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-500"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Active Reminders Section */}
              {reminders.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Reminders</h3>
                      <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">{reminders.length}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        if (!user) return;
                        const batch = reminders.map(r => updateDoc(doc(db, `users/${user.uid}/reminders/${r.id}`), { isRead: true }));
                        await Promise.all(batch);
                      }}
                      className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {reminders.map(reminder => (
                      <motion.div
                        key={reminder.id}
                        layout
                        className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4"
                      >
                        <div className={`p-2.5 rounded-xl ${reminder.type === 'class' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                          {reminder.type === 'class' ? <Clock size={18} /> : <DollarSign size={18} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-black text-slate-900">{reminder.title}</p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5">{reminder.message}</p>
                        </div>
                        <button 
                          onClick={() => dismissReminder(reminder.id)}
                          className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Welcome Card / Next Class */}
              {appMode === 'teacher' ? (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">Hello, {user?.displayName && typeof user.displayName === 'string' && user.displayName.trim() !== '' ? user.displayName.split(' ')[0] : 'Educator'}!</h2>
                    <p className="text-slate-400 text-sm mb-6">Here's your teaching summary for {format(new Date(), 'MMMM')}.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Earnings</p>
                        <p className="text-2xl font-black">৳{totalMonthlyEarnings.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Attendance</p>
                        <p className="text-2xl font-black">{attendanceThisMonth} Days</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={120} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Next Class Card */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Clock size={20} />
                        Next Class
                      </h2>
                      {nextClass ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-2xl font-black leading-tight">
                              {nextClass.subject === 'Other' ? nextClass.customSubject : nextClass.subject}
                              <span className="block text-sm font-medium text-blue-100 mt-1">with {nextClass.name}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                              <p className="text-[10px] font-bold text-blue-100 uppercase mb-0.5">Time</p>
                              <p className="text-lg font-black">{formatTime12H(nextClass.time)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-blue-100 text-sm italic">No classes scheduled yet.</p>
                      )}
                    </div>
                    <div className="absolute -right-8 -bottom-8 opacity-10 rotate-12">
                      <Presentation size={160} />
                    </div>
                  </div>

                  {/* Class Statistics Section */}
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-600" />
                        Class Statistics
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Class of all Subject</p>
                        <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                          <span className="text-2xl font-black text-slate-900">{subjectStats?.total || 0}</span>
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                            <GraduationCap size={20} />
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Subject wise total class</p>
                        <div className="space-y-3">
                          {subjectStats && Object.entries(subjectStats.subjectWise).length > 0 ? (
                            Object.entries(subjectStats.subjectWise).map(([subject, count]) => (
                              <div key={subject} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <span className="text-xs font-bold text-slate-700">{subject}</span>
                                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-full">{count} Classes</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-center text-slate-400 text-xs italic py-2">No data yet.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

                  {/* Quick Actions */}
                  <div className={`grid ${appMode === 'teacher' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-600 transition-all group text-left"
                    >
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                      </div>
                      <h3 className="font-bold text-slate-900">{appMode === 'teacher' ? 'Mark Attendance' : 'Log Class'}</h3>
                      <p className="text-xs text-slate-400 mt-1">{appMode === 'teacher' ? 'Log your teaching hours' : 'Log your class attendance'}</p>
                    </button>
                    {appMode === 'teacher' && (
                      <button 
                        onClick={() => setActiveTab('salary')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-600 transition-all group text-left"
                      >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <DollarSign size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900">Add Salary</h3>
                        <p className="text-xs text-slate-400 mt-1">Record new payments</p>
                      </button>
                    )}
                  </div>

                    {appMode === 'student' && (
                      <button 
                        onClick={() => setActiveTab('report')}
                        className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-600 transition-all group text-left"
                      >
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FileBarChart size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900">View Reports</h3>
                        <p className="text-xs text-slate-400 mt-1">Check your progress</p>
                      </button>
                    )}

                  {/* Students/Teachers Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{appMode === 'teacher' ? 'Your Students' : 'Your Teachers'}</h3>
                      <button onClick={() => setActiveTab('attendance')} className="text-xs font-bold text-blue-600">Manage</button>
                    </div>
                    {appMode === 'teacher' ? (
                      students.length === 0 ? (
                        <div className="bg-white p-8 rounded-[2rem] text-center border border-dashed border-slate-300">
                          <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No students added yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {students.map(student => {
                            const studentAttendance = allAttendance.filter(a => a.studentId === student.id).length;
                            const studentEarnings = salaries.filter(s => s.studentId === student.id).reduce((sum, s) => sum + s.amount, 0);
                            return (
                              <div 
                                key={student.id} 
                                onClick={() => {
                                  setSelectedStudentId(student.id);
                                  setActiveTab('attendance');
                                }}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <UserIcon size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{studentAttendance} Days Taught</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-blue-600">৳{studentEarnings}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Paid</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      teachers.length === 0 ? (
                        <div className="bg-white p-8 rounded-[2rem] text-center border border-dashed border-slate-300">
                          <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No teachers added yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {teachers.map(teacher => {
                            const tAttendance = teacherAttendance.filter(a => a.studentId === teacher.id).length;
                            const tEarnings = teacherSalaries.filter(s => s.studentId === teacher.id).reduce((sum, s) => sum + s.amount, 0);
                            return (
                              <div 
                                key={teacher.id} 
                                onClick={() => {
                                  setSelectedTeacherId(teacher.id);
                                  setActiveTab('attendance');
                                  triggerAction();
                                }}
                                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                    <UserIcon size={20} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{teacher.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{tAttendance} Classes</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-blue-600">৳{tEarnings}</p>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Total Paid</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
                      <button onClick={() => setActiveTab('attendance')} className="text-xs font-bold text-blue-600">View All</button>
                    </div>
                    {(appMode === 'teacher' ? allAttendance.length === 0 && salaries.length === 0 : teacherAttendance.length === 0 && teacherSalaries.length === 0) ? (
                      <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">
                        <Info size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm">No activity recorded yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(appMode === 'teacher' ? allAttendance : teacherAttendance).slice(0, 3).map(record => (
                          <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                <CheckCircle2 size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{appMode === 'teacher' ? 'Attendance Logged' : 'Class Logged'}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{record.date ? format(parseISO(record.date), 'dd MMM yyyy') : 'Unknown Date'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(appMode === 'teacher' ? salaries : teacherSalaries).slice(0, 2).map(record => (
                          <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <DollarSign size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{appMode === 'teacher' ? 'Salary' : 'Fee'}: {record.studentName}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">৳{record.amount} • {record.month}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
              </motion.div>
            )}

          {activeTab === 'salary' && (
            <motion.div
              key="salary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Salary List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{appMode === 'teacher' ? 'Student Salaries' : 'Teacher Salaries'}</h3>
                  <button 
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Record Manual Payment',
                        message: 'Use the form below to record a manual payment entry.',
                        onConfirm: () => {}
                      });
                    }}
                    className="text-[10px) font-black text-blue-600 uppercase tracking-widest"
                  >
                    Manual Record
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(appMode === 'teacher' ? students : teachers).map(entity => {
                    const entityAttendance = (appMode === 'teacher' ? allAttendance : teacherAttendance).filter(a => a.studentId === entity.id).length;
                    const entitySalaries = (appMode === 'teacher' ? salaries : teacherSalaries).filter(s => s.studentId === entity.id);
                    
                    const daysCompletedInCurrentCycle = entityAttendance % entity.daysPerMonth;
                    const isCycleComplete = daysCompletedInCurrentCycle === 0 && entityAttendance > 0;
                    const currentCycle = Math.floor(entityAttendance / entity.daysPerMonth) + (daysCompletedInCurrentCycle > 0 ? 1 : 0);
                    
                    const hasPaidCurrentCycle = entitySalaries.some(s => 
                      s.month.includes(`Cycle ${currentCycle}`) && 
                      s.status === 'paid'
                    );

                    const lifetimeEarnings = entitySalaries
                      .filter(s => s.status === 'paid')
                      .reduce((acc, curr) => acc + curr.amount, 0);

                    return (
                      <motion.div 
                        key={entity.id} 
                        whileHover={{ y: -4 }}
                        className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden group"
                      >
                        {/* Decorative background element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 rounded-full -mr-16 -mt-16 blur-3xl transition-all group-hover:bg-blue-100/40" />
                        
                        <div className="flex items-start justify-between mb-6 relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                              <UserIcon size={24} />
                            </div>
                            <div>
                              <h4 className="font-black text-lg text-slate-900 tracking-tight">{entity.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifetime</span>
                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                  ৳{lifetimeEarnings.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {isCycleComplete && !hasPaidCurrentCycle ? (
                            <div className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full flex items-center gap-2 border border-rose-100 animate-pulse">
                              <AlertCircle size={14} className="shrink-0" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Fee Pending</span>
                            </div>
                          ) : (
                            <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full flex items-center gap-2 border border-emerald-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-black uppercase tracking-wider">Active Cycle</span>
                            </div>
                          )}
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-3 mb-6 relative z-10">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attendance Progress</p>
                            <p className="text-xs font-black text-slate-900">
                              {daysCompletedInCurrentCycle === 0 && entityAttendance > 0 ? entity.daysPerMonth : daysCompletedInCurrentCycle} <span className="text-slate-400 font-bold">/ {entity.daysPerMonth} Days</span>
                            </p>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, ((daysCompletedInCurrentCycle === 0 && entityAttendance > 0 ? entity.daysPerMonth : daysCompletedInCurrentCycle) / entity.daysPerMonth) * 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut" }}
                              className={`h-full rounded-full shadow-sm ${
                                isCycleComplete ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-5 border-t border-slate-50 relative z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                              <CalendarIcon size={14} />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Next Payment</p>
                              <p className={`text-xs font-black ${isCycleComplete && !hasPaidCurrentCycle ? 'text-rose-500' : 'text-slate-900'}`}>
                                {isCycleComplete && !hasPaidCurrentCycle ? 'Due Now' : 'In Progress'}
                              </p>
                            </div>
                          </div>
                          
                          {isCycleComplete && !hasPaidCurrentCycle ? (
                            <button
                              onClick={async () => {
                                if (!user) return;
                                const salaryData: Omit<SalaryRecord, 'id'> = {
                                  userId: user.uid,
                                  studentId: entity.id,
                                  studentName: entity.name,
                                  month: `Cycle ${currentCycle} (${format(new Date(), 'MMMM yyyy')})`,
                                  amount: entity.monthlySalary,
                                  status: 'paid',
                                  paidAt: new Date().toISOString(),
                                  createdAt: new Date().toISOString()
                                };
                                try {
                                  const path = `users/${user.uid}/${appMode === 'teacher' ? 'salary' : 'teacher_salary'}`;
                                  await addDoc(collection(db, path), salaryData);
                                  // Also mark any related reminders as read
                                  const q = query(
                                    collection(db, `users/${user.uid}/reminders`), 
                                    where(appMode === 'teacher' ? 'studentId' : 'teacherId', '==', entity.id),
                                    where('type', '==', 'payment'),
                                    where('isRead', '==', false)
                                  );
                                  const snapshot = await getDocs(q);
                                  const batch = snapshot.docs.map(d => updateDoc(doc(db, `users/${user.uid}/reminders/${d.id}`), { isRead: true }));
                                  await Promise.all(batch);
                                  triggerAction();
                                } catch (err) {
                                  console.error("Failed to record payment", err);
                                }
                              }}
                              className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black hover:-translate-y-0.5 transition-all active:scale-95 flex items-center gap-2"
                            >
                              <CheckCircle2 size={14} />
                              Mark Paid
                            </button>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Clock size={14} />
                              <span className="text-[10px] font-black uppercase tracking-widest italic">Pending Cycle</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Record Form */}
              <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Record Manual Entry</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">For offline payments</p>
                  </div>
                </div>
                
                <form onSubmit={addSalary} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select {appMode === 'teacher' ? 'Student' : 'Teacher'}</label>
                      <select
                        value={appMode === 'teacher' ? newSalary.studentId : newSalary.teacherId}
                        onChange={e => setNewSalary({ ...newSalary, [appMode === 'teacher' ? 'studentId' : 'teacherId']: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                        required
                      >
                        <option value="">Choose {appMode === 'teacher' ? 'Student' : 'Teacher'}</option>
                        {(appMode === 'teacher' ? students : teachers).map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Amount (৳)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={newSalary.amount}
                          onChange={e => setNewSalary({ ...newSalary, amount: e.target.value })}
                          placeholder="Amount in ৳"
                          className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm pl-10"
                          required
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">৳</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-white text-slate-900 border border-slate-200 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <Plus size={18} />
                    Record Manual Entry
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Add Journal Entry */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Class Journal</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Record what was taught today</p>
                  </div>
                </div>

                <form onSubmit={addJournal} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Date</label>
                      <input
                        type="date"
                        value={newJournal.date}
                        onChange={(e) => setNewJournal({ ...newJournal, date: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                        {appMode === 'teacher' ? 'Student' : 'Teacher'}
                      </label>
                      <select
                        value={appMode === 'teacher' ? newJournal.studentId : newJournal.teacherId}
                        onChange={(e) => setNewJournal({ 
                          ...newJournal, 
                          [appMode === 'teacher' ? 'studentId' : 'teacherId']: e.target.value 
                        })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      >
                        <option value="">All {appMode === 'teacher' ? 'Students' : 'Teachers'}</option>
                        {(appMode === 'teacher' ? students : teachers).map(entity => (
                          <option key={entity.id} value={entity.id}>{entity.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Subject</label>
                      <select
                        value={newJournal.subject}
                        onChange={(e) => setNewJournal({ ...newJournal, subject: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="History">History</option>
                        <option value="Geography">Geography</option>
                        <option value="Civics">Civics</option>
                        <option value="Economics">Economics</option>
                        <option value="English 1st Paper">English 1st Paper</option>
                        <option value="English 2nd Paper">English 2nd Paper</option>
                        <option value="Bangla 1st Paper">Bangla 1st Paper</option>
                        <option value="Bangla 2nd Paper">Bangla 2nd Paper</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    {newJournal.subject === 'Custom' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Custom Subject</label>
                        <input
                          type="text"
                          value={newJournal.customSubject}
                          onChange={(e) => setNewJournal({ ...newJournal, customSubject: e.target.value })}
                          placeholder="Enter Subject"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                          required
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Notes / Content</label>
                    <textarea
                      value={newJournal.content}
                      onChange={(e) => setNewJournal({ ...newJournal, content: e.target.value })}
                      placeholder="What was covered in today's class?"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <Plus size={18} />
                    Save Journal Entry
                  </button>
                </form>
              </div>

              {/* Journal History */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">Recent Entries</h4>
                <div className="space-y-3">
                  {journals.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center border border-slate-100">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-3">
                        <ClipboardList size={24} />
                      </div>
                      <p className="text-sm font-bold text-slate-400">No journal entries yet</p>
                    </div>
                  ) : (
                    journals.map((entry) => {
                      const entity = appMode === 'teacher' 
                        ? students.find(s => s.id === entry.studentId)
                        : teachers.find(t => t.id === entry.teacherId);
                      
                      return (
                        <motion.div
                          layout
                          key={entry.id}
                          className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-xs font-black text-slate-900">
                                  {format(parseISO(entry.date), 'PPP')}
                                </span>
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">
                                  {entry.subject}
                                </span>
                                {entity && (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                    {entity.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteJournal(entry.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {entry.content}
                          </p>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Performance Report</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly statistics & trends</p>
                </div>
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  <Download size={14} />
                  Export PDF
                </button>
              </div>

              {/* Welcome Card (Moved from Dashboard for Student) */}
              {appMode === 'student' && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">Hello, {user?.displayName && typeof user.displayName === 'string' && user.displayName.trim() !== '' ? user.displayName.split(' ')[0] : 'Student'}!</h2>
                    <p className="text-slate-400 text-sm mb-6">Here's your learning summary for {format(new Date(), 'MMMM')}.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Fees Paid</p>
                        <p className="text-2xl font-black">৳{teacherSalaries.filter(s => s.month.includes(format(new Date(), 'MMMM yyyy'))).reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Classes</p>
                        <p className="text-2xl font-black">{teacherAttendance.filter(a => a.date.startsWith(format(new Date(), 'yyyy-MM'))).length} Days</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp size={120} />
                  </div>
                </div>
              )}

              {/* Summary Cards (Only for Teacher) */}
              {appMode === 'teacher' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3">
                      <TrendingUp size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Earnings</p>
                    <p className="text-xl font-black text-slate-900">৳{salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.amount, 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-3">
                      <CalendarIcon size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Days</p>
                    <p className="text-xl font-black text-slate-900">{allAttendance.length}</p>
                  </div>
                </div>
              )}

              {/* Teacher Fee Tracking (Only for Student) */}
              {appMode === 'student' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black text-slate-900">Teacher Fee Status</h3>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Paid</span>
                      <span className="w-2 h-2 rounded-full bg-orange-500 ml-2"></span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Pending</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {teachers.map(teacher => {
                      const tAttendance = teacherAttendance.filter(a => a.studentId === teacher.id).length;
                      const daysCompleted = tAttendance % (teacher.daysPerMonth || 20);
                      const isCycleComplete = daysCompleted === 0 && tAttendance > 0;
                      const currentCycle = Math.floor(tAttendance / (teacher.daysPerMonth || 20)) + (daysCompleted > 0 ? 1 : 0);
                      
                      const isPaid = teacherSalaries.some(s => 
                        s.studentId === teacher.id && 
                        s.month.includes(`Cycle ${currentCycle}`) && 
                        s.status === 'paid'
                      );

                      return (
                        <div key={teacher.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPaid ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                              <UserIcon size={24} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900 text-sm">{teacher.name}</h4>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {daysCompleted}/{teacher.daysPerMonth || 20} Classes Done
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                              {isPaid ? 'PAID' : 'PENDING'}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              ৳{teacher.monthlySalary.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {teachers.length === 0 && (
                      <p className="text-center text-slate-400 text-xs italic py-4">No teachers added yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Performance Chart */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-600" />
                  Monthly Class Attend
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        dy={10}
                      />
                      <YAxis 
                        hide 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3b82f6" 
                        strokeWidth={4}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <UserIcon size={16} className="text-green-600" />
                  Attendance by {appMode === 'teacher' ? 'Student' : 'Teacher'}
                </h3>
                <div className="space-y-4">
                  {(appMode === 'teacher' ? students : teachers).map(entity => {
                    const count = (appMode === 'teacher' ? allAttendance : teacherAttendance).filter(a => a.studentId === entity.id).length;
                    const max = (appMode === 'teacher' ? allAttendance : teacherAttendance).length || 1;
                    const percentage = (count / max) * 100;
                    
                    return (
                      <div key={entity.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-700">{entity.name}</span>
                          <span className="text-slate-400">{count} Days</span>
                        </div>
                        <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                      </div>
                    );
                  })}
                  {(appMode === 'teacher' ? students : teachers).length === 0 && (
                    <p className="text-center text-slate-400 text-xs py-4 italic">No data available.</p>
                  )}
                </div>
              </div>

              {/* Exam Performance Chart */}
              {exams.length > 0 && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" />
                    Recent Exam Performance (%)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-5).map(e => ({
                        name: e.subject,
                        score: (e.obtainedMarks / e.totalMarks) * 100
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                          dy={10}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 700, fontSize: '12px' }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                        />
                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                          {[...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-5).map((e, index) => {
                            const percentage = (e.obtainedMarks / e.totalMarks) * 100;
                            return <Cell key={`cell-${index}`} fill={percentage >= 80 ? '#22c55e' : percentage >= 50 ? '#3b82f6' : '#ef4444'} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'exams' && appMode === 'student' && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Add Exam Form */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Add Exam Result</h3>
                <form onSubmit={addExam} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Subject</label>
                      <select
                        value={newExam.subject}
                        onChange={e => setNewExam(prev => ({ ...prev, subject: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science">Science</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="History">History</option>
                        <option value="Geography">Geography</option>
                        <option value="Civics">Civics</option>
                        <option value="Economics">Economics</option>
                        <option value="English 1st Paper">English 1st Paper</option>
                        <option value="English 2nd Paper">English 2nd Paper</option>
                        <option value="Bangla 1st Paper">Bangla 1st Paper</option>
                        <option value="Bangla 2nd Paper">Bangla 2nd Paper</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>
                    {newExam.subject === 'Custom' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Custom Subject</label>
                        <input
                          type="text"
                          value={newExam.customSubject}
                          onChange={e => setNewExam(prev => ({ ...prev, customSubject: e.target.value }))}
                          placeholder="Enter Subject"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Exam Date</label>
                      <input
                        type="date"
                        value={newExam.date}
                        onChange={e => setNewExam(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Total Marks</label>
                      <input
                        type="number"
                        value={newExam.totalMarks}
                        onChange={e => setNewExam(prev => ({ ...prev, totalMarks: e.target.value }))}
                        placeholder="e.g. 100"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Obtained Marks</label>
                      <input
                        type="number"
                        value={newExam.obtainedMarks}
                        onChange={e => setNewExam(prev => ({ ...prev, obtainedMarks: e.target.value }))}
                        placeholder="e.g. 85"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">
                        {appMode === 'teacher' ? 'Select Student' : 'Select Teacher'}
                      </label>
                      <select
                        value={appMode === 'teacher' ? newExam.studentId : newExam.teacherId}
                        onChange={e => setNewExam(prev => ({ 
                          ...prev, 
                          [appMode === 'teacher' ? 'studentId' : 'teacherId']: e.target.value 
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      >
                        <option value="">Select {appMode === 'teacher' ? 'Student' : 'Teacher'}</option>
                        {(appMode === 'teacher' ? students : teachers).map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    <Trophy size={18} />
                    Save Result
                  </button>
                </form>
              </div>

              {/* Exam List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Recent Exams</h3>
                {exams.length === 0 ? (
                  <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">
                    <ClipboardList size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-400 text-sm">No exam records yet.</p>
                  </div>
                ) : (
                  [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exam => {
                    const percentage = (exam.obtainedMarks / exam.totalMarks) * 100;
                    const relatedName = appMode === 'teacher' 
                      ? students.find(s => s.id === exam.studentId)?.name 
                      : teachers.find(t => t.id === exam.teacherId)?.name;
                    
                    return (
                      <div key={exam.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              percentage >= 80 ? 'bg-green-50 text-green-600' : 
                              percentage >= 50 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                            }`}>
                              <Trophy size={24} />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-900">{exam.subject === 'Custom' ? exam.customSubject : exam.subject}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {format(parseISO(exam.date), 'dd MMM yyyy')} • {relatedName || 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <button onClick={() => deleteExam(exam.id)} className="text-slate-300 hover:text-red-500 p-2">
                            <Trash2 size={18} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-500">Score: {exam.obtainedMarks} / {exam.totalMarks}</span>
                            <span className={percentage >= 80 ? 'text-green-600' : percentage >= 50 ? 'text-blue-600' : 'text-red-600'}>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className={`h-full ${
                                percentage >= 80 ? 'bg-green-500' : 
                                percentage >= 50 ? 'bg-blue-500' : 'bg-red-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {appMode === 'teacher' ? (
                !selectedStudentId ? (
                  <div className="space-y-6">
                    {/* Add Student Form */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Student</h3>
                      <form onSubmit={addStudent} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Student Name</label>
                            <input
                              type="text"
                              value={newStudentName}
                              onChange={e => setNewStudentName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Starting Date</label>
                            <input
                              type="date"
                              value={newStudentStartDate}
                              onChange={e => setNewStudentStartDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Days per Month</label>
                            <input
                              type="number"
                              value={newStudentDaysPerMonth}
                              onChange={e => setNewStudentDaysPerMonth(e.target.value)}
                              placeholder="e.g. 20"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Monthly Salary (৳)</label>
                            <input
                              type="number"
                              value={newStudentMonthlySalary}
                              onChange={e => setNewStudentMonthlySalary(e.target.value)}
                              placeholder="Amount in ৳"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tuition Time</label>
                            <input
                              type="time"
                              value={newStudentTuitionTime}
                              onChange={e => setNewStudentTuitionTime(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Subject</label>
                            <select
                              value={newStudentSubject}
                              onChange={e => setNewStudentSubject(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                              <option value="Mathematics">Mathematics</option>
                              <option value="Science">Science</option>
                              <option value="Physics">Physics</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Biology">Biology</option>
                              <option value="History">History</option>
                              <option value="Geography">Geography</option>
                              <option value="Civics">Civics</option>
                              <option value="Economics">Economics</option>
                              <option value="English 1st Paper">English 1st Paper</option>
                              <option value="English 2nd Paper">English 2nd Paper</option>
                              <option value="Bangla 1st Paper">Bangla 1st Paper</option>
                              <option value="Bangla 2nd Paper">Bangla 2nd Paper</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                          {newStudentSubject === 'Custom' && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Custom Subject</label>
                              <input
                                type="text"
                                value={newStudentCustomSubject}
                                onChange={e => setNewStudentCustomSubject(e.target.value)}
                                placeholder="Enter Subject"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                        >
                          <Plus size={20} />
                          Add Student
                        </button>
                      </form>
                    </div>

                    {/* Student List */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Select Student for Attendance</h3>
                      {students.length === 0 ? (
                        <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">
                          <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No students added yet.</p>
                        </div>
                      ) : (
                        students.map(student => (
                          <div
                            key={student.id}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer"
                            onClick={() => setSelectedStudentId(student.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <UserIcon size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900">{student.name}</p>
                                  <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                                    {student.subject === 'Custom' ? student.customSubject : student.subject}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">
                                  Starts: {student.startDate ? format(parseISO(student.startDate), 'dd MMM yyyy') : 'Unknown Date'} • {formatTime12H(student.tuitionTime)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteStudent(student.id);
                                }}
                                className="text-slate-300 hover:text-red-500 p-2"
                              >
                                <Trash2 size={18} />
                              </button>
                              <ChevronRight size={20} className="text-slate-300" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null
              ) : (
                !selectedTeacherId ? (
                  <div className="space-y-6">
                    {/* Add Teacher Form */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Add New Teacher</h3>
                      <form onSubmit={addTeacher} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Teacher Name</label>
                            <input
                              type="text"
                              value={newTeacherName}
                              onChange={e => setNewTeacherName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Starting Date</label>
                            <input
                              type="date"
                              value={newTeacherStartDate}
                              onChange={e => setNewTeacherStartDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Days per Month</label>
                            <input
                              type="number"
                              value={newTeacherDaysPerMonth}
                              onChange={e => setNewTeacherDaysPerMonth(e.target.value)}
                              placeholder="e.g. 20"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Subject</label>
                            <select
                              value={newTeacherSubject}
                              onChange={e => setNewTeacherSubject(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                              <option value="Mathematics">Mathematics</option>
                              <option value="Science">Science</option>
                              <option value="Physics">Physics</option>
                              <option value="Chemistry">Chemistry</option>
                              <option value="Biology">Biology</option>
                              <option value="History">History</option>
                              <option value="Geography">Geography</option>
                              <option value="Civics">Civics</option>
                              <option value="Economics">Economics</option>
                              <option value="English 1st Paper">English 1st Paper</option>
                              <option value="English 2nd Paper">English 2nd Paper</option>
                              <option value="Bangla 1st Paper">Bangla 1st Paper</option>
                              <option value="Bangla 2nd Paper">Bangla 2nd Paper</option>
                              <option value="Custom">Custom</option>
                            </select>
                          </div>
                          {newTeacherSubject === 'Custom' && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Custom Subject</label>
                              <input
                                type="text"
                                value={newTeacherCustomSubject}
                                onChange={e => setNewTeacherCustomSubject(e.target.value)}
                                placeholder="Enter Subject"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                          )}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Tuition Time</label>
                            <input
                              type="time"
                              value={newTeacherTime}
                              onChange={e => setNewTeacherTime(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Monthly Salary (৳)</label>
                            <input
                              type="number"
                              value={newTeacherMonthlySalary}
                              onChange={e => setNewTeacherMonthlySalary(e.target.value)}
                              placeholder="Amount in ৳"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                        >
                          <Plus size={20} />
                          Add Teacher
                        </button>
                      </form>
                    </div>

                    {/* Connected Teachers Section */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Wifi size={20} className="text-blue-600" />
                        Connected Teachers (Online)
                      </h3>
                      <div className="space-y-4">
                        <p className="text-xs text-slate-500">Enter your Student Code to connect with your teacher online.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={studentCode}
                            onChange={e => setStudentCode(e.target.value)}
                            placeholder="Enter Student Code"
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                          <button
                            onClick={connectTeacher}
                            disabled={isConnecting}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100 disabled:opacity-50"
                          >
                            {isConnecting ? '...' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Teacher List */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Select Teacher for Attendance</h3>
                      {teachers.length === 0 ? (
                        <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">
                          <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-400 text-sm">No teachers added yet.</p>
                        </div>
                      ) : (
                        teachers.map(teacher => (
                          <div
                            key={teacher.id}
                            className={`bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all cursor-pointer ${teacher.mode === 'connected' ? 'bg-slate-50/50' : ''}`}
                            onClick={() => {
                              setSelectedTeacherId(teacher.id);
                              triggerAction();
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${teacher.mode === 'connected' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                                <UserIcon size={20} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900">{teacher.name}</p>
                                  {teacher.mode === 'connected' ? (
                                    <span className="bg-green-100 text-green-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                                      <Wifi size={8} /> Synced
                                    </span>
                                  ) : (
                                    <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                                      <FileText size={8} /> Local
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">
                                  Starts: {teacher.startDate ? format(parseISO(teacher.startDate), 'dd MMM yyyy') : 'Unknown Date'} • {formatTime12H(teacher.time)}
                                  {teacher.mode === 'connected' && <span className="ml-2 text-blue-500">• Read Only</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {teacher.mode !== 'connected' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTeacher(teacher.id);
                                  }}
                                  className="text-slate-300 hover:text-red-500 p-2"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                              <ChevronRight size={20} className="text-slate-300" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null
              )}

              {(appMode === 'teacher' ? selectedStudentId : selectedTeacherId) && (
                <>
                  {/* Calendar Card */}
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => appMode === 'teacher' ? setSelectedStudentId(null) : setSelectedTeacherId(null)}
                          className="p-2 hover:bg-slate-50 rounded-full text-slate-400"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">
                            {appMode === 'teacher' 
                              ? students.find(s => s.id === selectedStudentId)?.name 
                              : teachers.find(t => t.id === selectedTeacherId)?.name}
                          </h2>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{format(currentMonth, 'MMMM yyyy')}</p>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                              {(() => {
                                const count = (appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance).length;
                                const limit = (appMode === 'teacher' ? students.find(s => s.id === selectedStudentId)?.daysPerMonth : teachers.find(t => t.id === selectedTeacherId)?.daysPerMonth) || 20;
                                const progress = count % limit;
                                return (progress === 0 && count > 0) ? limit : progress;
                              })()} / {(appMode === 'teacher' ? students.find(s => s.id === selectedStudentId)?.daysPerMonth : teachers.find(t => t.id === selectedTeacherId)?.daysPerMonth) || 20} Days
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                              {appMode === 'teacher'
                                ? (students.find(s => s.id === selectedStudentId)?.subject === 'Custom' 
                                    ? students.find(s => s.id === selectedStudentId)?.customSubject 
                                    : students.find(s => s.id === selectedStudentId)?.subject)
                                : (teachers.find(t => t.id === selectedTeacherId)?.subject === 'Custom'
                                    ? teachers.find(t => t.id === selectedTeacherId)?.customSubject
                                    : teachers.find(t => t.id === selectedTeacherId)?.subject)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                          <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Student Code for Teachers */}
                    {appMode === 'teacher' && selectedStudentId && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-blue-600 font-black uppercase mb-1">Student Connection Code</p>
                            <p className="text-lg font-mono font-bold text-blue-900 tracking-wider">
                              {students.find(s => s.id === selectedStudentId)?.connectionCode || `${user?.uid.substring(0, 8)}:${selectedStudentId}`}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const student = students.find(s => s.id === selectedStudentId);
                              const code = student?.connectionCode || `${user?.uid}:${selectedStudentId}`;
                              navigator.clipboard.writeText(code);
                              alert('Code copied to clipboard!');
                            }}
                            className="p-2 bg-white text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:bg-blue-50 transition-all"
                          >
                            <Copy size={18} />
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-500 mt-2 font-medium">Share this code with your student to sync attendance online.</p>
                      </div>
                    )}

                    {/* Read Only Info for Connected Students */}
                    {appMode === 'student' && selectedTeacherId && teachers.find(t => t.id === selectedTeacherId)?.mode === 'connected' && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-6">
                        <p className="text-xs text-blue-700 font-bold flex items-center gap-2">
                          <Info size={14} />
                          This is a synced teacher. Attendance is read-only.
                        </p>
                      </div>
                    )}

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={d + '-' + i} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Padding for start of month */}
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={'pad-' + i} />
                  ))}
                  {days.map(day => {
                    const isSelected = (appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance).some(a => a.date === format(day, 'yyyy-MM-dd'));
                    const isToday = isSameDay(day, new Date());
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => toggleAttendance(day)}
                        className={`aspect-square rounded-xl text-sm font-bold flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-green-500 text-white shadow-lg shadow-green-100' 
                            : isToday 
                              ? 'bg-blue-50 text-blue-600 border border-blue-200'
                              : 'bg-red-50 text-red-400 hover:bg-red-100'
                        }`}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Attendance List */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Recent Attendance</h3>
                  {(appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance).length === 0 ? (
                    <div className="bg-white p-8 rounded-[2rem] text-center border border-dashed border-slate-300">
                      <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-400 text-sm">No dates selected yet.</p>
                    </div>
                  ) : (
                    (appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance)
                      .slice(0, 5)
                      .map(record => (
                        <motion.div
                          layout
                          key={record.id}
                          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                              <CheckCircle2 size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{record.date ? format(parseISO(record.date), 'dd.MM.yyyy') : 'Unknown Date'}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">{record.date ? format(parseISO(record.date), 'EEEE') : 'Unknown'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => record.date && toggleAttendance(parseISO(record.date))}
                            className="text-slate-300 hover:text-red-500 p-2"
                          >
                            <Trash2 size={18} />
                          </button>
                        </motion.div>
                      ))
                  )}
                </div>

                {/* Completed Cycles */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Completed Cycles</h3>
                  {Math.floor((appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance).length / ((appMode === 'teacher' ? students.find(s => s.id === selectedStudentId)?.daysPerMonth : teachers.find(t => t.id === selectedTeacherId)?.daysPerMonth) || 20)) === 0 ? (
                    <p className="text-slate-400 text-xs px-2 italic">No cycles completed yet.</p>
                  ) : (
                    Array.from({ length: Math.floor((appMode === 'teacher' ? filteredAttendance : filteredTeacherAttendance).length / ((appMode === 'teacher' ? students.find(s => s.id === selectedStudentId)?.daysPerMonth : teachers.find(t => t.id === selectedTeacherId)?.daysPerMonth) || 20)) }).map((_, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                            <CheckCircle2 size={16} />
                          </div>
                          <p className="text-sm font-bold text-slate-700">Cycle {i + 1} Completed</p>
                        </div>
                        <span className="text-[10px] font-bold text-green-500 uppercase">Finished</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Notes and Attachments */}
                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Notes & Attachments</h3>
                    {appMode === 'teacher' && (
                      <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full uppercase">Teacher Only</span>
                    )}
                  </div>

                  {appMode === 'teacher' && (
                    <form onSubmit={addNote} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3">
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Write a note for the student..."
                        className="w-full p-3 bg-slate-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                      />
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all">
                            <Paperclip size={18} />
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                          </label>
                          {newNoteAttachment && (
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold">
                              {newNoteAttachment.type === 'image' ? <ImageIcon size={14} /> : <File size={14} />}
                              <span className="max-w-[100px] truncate">{newNoteAttachment.name}</span>
                              <button type="button" onClick={() => setNewNoteAttachment(null)} className="text-blue-400 hover:text-blue-600">
                                <X size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="submit"
                          disabled={isUploading || (!newNoteContent.trim() && !newNoteAttachment)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                          Send
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {filteredNotes.length === 0 ? (
                      <div className="bg-slate-50/50 p-6 rounded-3xl text-center border border-dashed border-slate-200">
                        <FileText size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-xs italic">No notes or attachments yet.</p>
                      </div>
                    ) : (
                      filteredNotes.map(note => (
                        <motion.div
                          layout
                          key={note.id}
                          className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {note.content && <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>}
                              <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">
                                {format(parseISO(note.createdAt), 'dd MMM yyyy, hh:mm a')}
                              </p>
                            </div>
                            {appMode === 'teacher' && (
                              <button onClick={() => deleteNote(note.id)} className="text-slate-300 hover:text-red-500 p-1">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          {note.attachment && (
                            <div className="pt-2 border-t border-slate-50">
                              {note.attachment.type === 'image' ? (
                                <div className="rounded-2xl overflow-hidden border border-slate-100">
                                  <img src={note.attachment.data} alt={note.attachment.name} className="w-full h-auto max-h-[300px] object-cover" referrerPolicy="no-referrer" />
                                  <div className="bg-slate-50 p-2 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 truncate px-1">{note.attachment.name}</span>
                                    <a href={note.attachment.data} download={note.attachment.name} className="p-1.5 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-50">
                                      <Download size={14} />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                                      <FileText size={20} />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{note.attachment.name}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">PDF Document</p>
                                    </div>
                                  </div>
                                  <a href={note.attachment.data} download={note.attachment.name} className="p-2 bg-white text-blue-600 rounded-xl shadow-sm hover:bg-blue-50">
                                    <Download size={16} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* AdMob Components */}
      <BannerAd />
      <InterstitialAd />
      <RewardedAd />

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Status Toast */}
      <AnimatePresence>
        {showStatusToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${isOnline ? 'bg-green-600 border-green-500 text-white' : 'bg-amber-600 border-amber-500 text-white'}`}
          >
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            <span className="font-bold text-sm">
              {isOnline ? 'Internet Connected. Syncing data...' : 'Offline. Data will be saved locally.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfileModal
        isOpen={isProfileOpen}
        user={user}
        appMode={appMode}
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleUpdateProfile}
        onBackup={handleBackup}
        onRestore={handleRestore}
        onLogout={handleLogout}
        onLogin={() => setIsLoginOpen(true)}
        onToggleMode={() => {
          const newMode = appMode === 'teacher' ? 'student' : 'teacher';
          setAppMode(newMode);
          localStorage.setItem('appMode', newMode);
          setActiveTab('dashboard');
          setIsProfileOpen(false);
        }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        appMode={appMode}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(u) => {
          setUser(u);
        }}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-40 pb-safe">
        <div className="max-w-2xl mx-auto px-2 h-20 flex items-center justify-around">
          {(appMode === 'teacher' 
            ? [
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
                { id: 'attendance', label: 'Students', icon: Users },
                { id: 'salary', label: 'Salary', icon: DollarSign },
                { id: 'journal', label: 'Journal', icon: BookOpen },
                { id: 'report', label: 'Report', icon: FileBarChart },
                { id: 'profile', label: (user && !user.isAnonymous) ? 'Account' : 'Sign In', icon: UserIcon }
              ] 
            : [
                { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
                { id: 'attendance', label: 'Teachers', icon: Users },
                { id: 'exams', label: 'Exams', icon: FileText },
                { id: 'journal', label: 'Journal', icon: BookOpen },
                { id: 'report', label: 'Report', icon: FileBarChart },
                { id: 'profile', label: (user && !user.isAnonymous) ? 'Account' : 'Sign In', icon: UserIcon }
              ]
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'profile') {
                  setIsProfileOpen(true);
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all ${
                (activeTab === item.id && item.id !== 'profile') || (item.id === 'profile' && isProfileOpen)
                  ? 'text-blue-600' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className={`text-[10px] font-bold ${activeTab === item.id ? 'font-black' : ''}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
