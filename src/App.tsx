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
  onClose: () => void;
  onSuccess: (user: User) => void;
}> = ({ isOpen, onClose, onSuccess }) => {
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
  parseISO
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
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BannerAd, useInterstitialAd, useRewardedAd, useAppOpenAd, initializeAdMob } from './components/AdMob';
import { ErrorBoundary } from './components/ErrorBoundary';

// Types
interface Student {
  id: string;
  name: string;
  startDate: string;
  tuitionTime?: string; // HH:MM
  daysPerMonth: number;
  monthlySalary: number;
  createdAt: string;
}

interface Reminder {
  id: string;
  title: string;
  message: string;
  type: 'class' | 'payment';
  studentId?: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  createdAt: string;
}

interface SalaryRecord {
  id: string;
  studentId: string;
  studentName: string;
  month: string;
  amount: number;
  status: 'paid' | 'unpaid';
  paidAt?: string;
  createdAt: string;
}

interface BackupData {
  students: Student[];
  attendance: AttendanceRecord[];
  salaries: SalaryRecord[];
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
  onClose: () => void;
  onUpdate: (name: string, email: string) => Promise<void>;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isOpen, user, onClose, onUpdate, onBackup, onRestore }) => {
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

  if (!isOpen || !user) return null;

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
            <h3 className="text-xl font-black text-slate-900">User Profile</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="pt-4 border-t border-slate-100">
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
            </div>

            {error && (
              <div className="p-3 bg-red-50 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

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

const AppContent: React.FC = () => {
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'salary' | 'report'>('dashboard');
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
  const [newStudentMonthlySalary, setNewStudentMonthlySalary] = useState('');
  const [newStudentTuitionTime, setNewStudentTuitionTime] = useState('15:00');

  // Attendance State
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const filteredAttendance = useMemo(() => {
    if (!selectedStudentId) return [];
    return allAttendance.filter(r => r.studentId === selectedStudentId);
  }, [allAttendance, selectedStudentId]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Salary State
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [newSalary, setNewSalary] = useState({ studentId: '', month: format(new Date(), 'MMMM yyyy'), amount: '' });
  
  // Premium State
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  // AdMob Hooks
  const { triggerAction, InterstitialAd } = useInterstitialAd();
  const { showRewarded, RewardedAd } = useRewardedAd();
  const { AppOpenAd } = useAppOpenAd();

  // Reminders State
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [notifiedClassIds, setNotifiedClassIds] = useState<Set<string>>(new Set());

  // Reminder Logic
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');
      
      const newReminders: Reminder[] = [];

      // 1. Class Reminders (10 minutes before)
      students.forEach(student => {
        if (student.tuitionTime && typeof student.tuitionTime === 'string' && student.tuitionTime.includes(':')) {
          const [hours, minutes] = student.tuitionTime.split(':').map(Number);
          const classTime = new Date();
          classTime.setHours(hours, minutes, 0, 0);
          
          const diffInMinutes = (classTime.getTime() - now.getTime()) / (1000 * 60);
          
          // 10-minute Reminder
          if (diffInMinutes > 9 && diffInMinutes <= 11) {
            const reminderId = `class_10_${student.id}_${todayStr}_${student.tuitionTime}`;
            if (!notifiedClassIds.has(reminderId)) {
              newReminders.push({
                id: reminderId,
                title: 'আজ পড়াতে যাবে',
                message: `${student.name} এর পড়াতে যাওয়ার সময় হয়েছে (১০ মিনিট বাকি)`,
                type: 'class',
                studentId: student.id
              });
              setNotifiedClassIds(prev => {
                const next = new Set(prev);
                next.add(reminderId);
                return next;
              });
            }
          }

          // 5-minute Alarm
          if (diffInMinutes > 4 && diffInMinutes <= 6) {
            const alarmId = `alarm_5_${student.id}_${todayStr}_${student.tuitionTime}`;
            if (!notifiedClassIds.has(alarmId)) {
              // Play Alarm Sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log("Audio play failed", e));

              newReminders.push({
                id: alarmId,
                title: 'এলার্ম: পড়াতে যাওয়ার সময়',
                message: `${student.name} এর পড়াতে যাওয়ার ৫ মিনিট বাকি!`,
                type: 'class',
                studentId: student.id
              });
              setNotifiedClassIds(prev => {
                const next = new Set(prev);
                next.add(alarmId);
                return next;
              });
            }
          }
        }
      });

      // 2. Payment Reminders (Unpaid salaries)
      salaries.forEach(salary => {
        if (salary.status === 'unpaid') {
          const reminderId = `payment_${salary.id}`;
          if (!notifiedClassIds.has(reminderId)) {
             newReminders.push({
               id: reminderId,
               title: 'বেতন বাকি আছে',
               message: `${salary.studentName} এর ${salary.month} এর বেতন বাকি আছে`,
               type: 'payment',
               studentId: salary.studentId
             });
             setNotifiedClassIds(prev => {
               const next = new Set(prev);
               next.add(reminderId);
               return next;
             });
          }
        }
      });

      // 3. Cycle End Payment Reminder
      students.forEach(student => {
        const studentAttendance = allAttendance.filter(a => a.studentId === student.id).length;
        if (studentAttendance === 0) return;

        const daysCompleted = studentAttendance % student.daysPerMonth;
        const daysLeft = daysCompleted === 0 ? 0 : student.daysPerMonth - daysCompleted;
        const currentCycle = Math.floor(studentAttendance / student.daysPerMonth) + (daysCompleted > 0 ? 1 : 0);
        
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
              newReminders.push({
                id: reminderId,
                title: daysLeft === 0 ? 'মাস পূর্ণ হয়েছে' : 'মাস শেষ হতে চলেছে',
                message: daysLeft === 0 
                  ? `${student.name} এর ${student.daysPerMonth} দিনের পড়ানোর মাস পূর্ণ হয়েছে। বেতন সংগ্রহ করুন।`
                  : `${student.name} এর পড়ানোর মাস শেষ হতে আর মাত্র ${daysLeft} দিন বাকি।`,
                type: 'payment',
                studentId: student.id
              });
              setNotifiedClassIds(prev => {
                const next = new Set(prev);
                next.add(reminderId);
                return next;
              });
            }
          }
        }
      });

      if (newReminders.length > 0) {
        setReminders(prev => [...prev, ...newReminders]);
      }
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check
    
    return () => clearInterval(interval);
  }, [students, salaries, notifiedClassIds, allAttendance]);

  // Auto-dismiss Reminders
  useEffect(() => {
    if (reminders.length > 0) {
      const timer = setTimeout(() => {
        setReminders(prev => prev.slice(1));
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

  // Attendance Listener
  useEffect(() => {
    if (!user) {
      setAllAttendance([]);
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
    
    return unsubscribe;
  }, [user]);

  // Salary Listener
  useEffect(() => {
    if (!user) {
      setSalaries([]);
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
    
    return unsubscribe;
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
    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, path, id), {
        name: newStudentName.trim(),
        startDate: newStudentStartDate,
        tuitionTime: newStudentTuitionTime,
        daysPerMonth: parseInt(newStudentDaysPerMonth) || 20,
        monthlySalary: parseFloat(newStudentMonthlySalary) || 0,
        createdAt: new Date().toISOString()
      });
      setNewStudentName('');
      setNewStudentStartDate(format(new Date(), 'yyyy-MM-dd'));
      setNewStudentDaysPerMonth('20');
      setNewStudentMonthlySalary('');
      setNewStudentTuitionTime('15:00');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
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
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, path);
        }
      }
    );
  };

  const toggleAttendance = async (date: Date) => {
    if (!user || !selectedStudentId) return;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = filteredAttendance.find(a => a.date === dateStr);
    const path = `users/${user.uid}/attendance`;

    try {
      if (existing) {
        await deleteDoc(doc(db, path, existing.id));
      } else {
        const id = `${selectedStudentId}_${dateStr}`;
        await setDoc(doc(db, path, id), {
          userId: user.uid,
          studentId: selectedStudentId,
          date: dateStr,
          createdAt: new Date().toISOString()
        });

        // Check for cycle completion
        const totalAttendance = filteredAttendance.length + 1;
        
        if (student.daysPerMonth > 0 && totalAttendance % student.daysPerMonth === 0) {
          const cycleNumber = Math.floor(totalAttendance / student.daysPerMonth);
          const salaryPath = `users/${user.uid}/salary`;
          const salaryId = `auto_${selectedStudentId}_cycle_${cycleNumber}`;
          
          // Check if this cycle salary already exists to avoid duplicates
          const existingSalary = salaries.find(s => s.id === salaryId);
          if (!existingSalary) {
            await setDoc(doc(db, salaryPath, salaryId), {
              userId: user.uid,
              studentId: selectedStudentId,
              studentName: student.name,
              month: `Cycle ${cycleNumber} (${format(date, 'MMM yyyy')})`,
              amount: student.monthlySalary,
              status: 'unpaid',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const addSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSalary.studentId || !newSalary.amount) return;
    const student = students.find(s => s.id === newSalary.studentId);
    if (!student) return;

    const path = `users/${user.uid}/salary`;

    try {
      const id = crypto.randomUUID();
      await setDoc(doc(db, path, id), {
        userId: user.uid,
        studentId: newSalary.studentId,
        studentName: student.name,
        month: newSalary.month,
        amount: parseFloat(newSalary.amount),
        status: 'paid',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      setNewSalary({ ...newSalary, studentId: '', amount: '' });
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const markSalaryAsPaid = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/salary`;
    try {
      await updateDoc(doc(db, path, id), {
        status: 'paid',
        paidAt: new Date().toISOString()
      });
      triggerAction();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteSalary = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/salary`;
    openConfirm(
      'Delete Salary Record?',
      'Are you sure you want to delete this salary record?',
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

  const totalMonthlyEarnings = useMemo(() => {
    const currentMonthName = format(new Date(), 'MMMM');
    return salaries
      .filter(s => s.status === 'paid' && s.month.includes(currentMonthName))
      .reduce((sum, s) => sum + s.amount, 0);
  }, [salaries]);

  const chartData = useMemo(() => {
    return MONTHS.map(m => ({
      name: m.substring(0, 3),
      amount: salaries
        .filter(s => s.status === 'paid' && s.month.includes(m))
        .reduce((sum, s) => sum + s.amount, 0)
    }));
  }, [salaries]);

  const studentAttendanceData = useMemo(() => {
    return students.map(s => ({
      name: s.name,
      days: allAttendance.filter(a => a.studentId === s.id).length
    }));
  }, [students, allAttendance]);

  const attendanceThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return allAttendance.filter(a => {
      if (!a.date) return false;
      const d = parseISO(a.date);
      return d >= start && d <= end;
    }).length;
  }, [allAttendance]);

  const dismissReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
  };


  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
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
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-600 p-1 transition-colors">
                  <LogOut size={20} />
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

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
          {(['dashboard', 'attendance', 'salary', 'report'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

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
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Reminders</h3>
                    <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">{reminders.length}</span>
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

              {/* Welcome Card */}
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

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setActiveTab('attendance')}
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-blue-600 transition-all group text-left"
                    >
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={24} />
                      </div>
                      <h3 className="font-bold text-slate-900">Mark Attendance</h3>
                      <p className="text-xs text-slate-400 mt-1">Log your teaching hours</p>
                    </button>
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
                  </div>

                  {/* Students Summary */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Your Students</h3>
                      <button onClick={() => setActiveTab('attendance')} className="text-xs font-bold text-blue-600">Manage</button>
                    </div>
                    {students.length === 0 ? (
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
                    )}
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Recent Activity</h3>
                      <button onClick={() => setActiveTab('attendance')} className="text-xs font-bold text-blue-600">View All</button>
                    </div>
                    {allAttendance.length === 0 && salaries.length === 0 ? (
                      <div className="bg-white p-12 rounded-[2rem] text-center border border-dashed border-slate-300">
                        <Info size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-400 text-sm">No activity recorded yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {allAttendance.slice(0, 3).map(record => (
                          <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                                <CheckCircle2 size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Attendance Logged</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{record.date ? format(parseISO(record.date), 'dd MMM yyyy') : 'Unknown Date'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {salaries.slice(0, 2).map(record => (
                          <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                <DollarSign size={20} />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">Salary: {record.studentName}</p>
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

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {!selectedStudentId ? (
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
                              <p className="font-bold text-slate-900">{student.name}</p>
                              <p className="text-[10px] text-slate-400 uppercase font-bold">Starts: {student.startDate ? format(parseISO(student.startDate), 'dd MMM yyyy') : 'Unknown Date'}</p>
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
              ) : (
                <>
                  {/* Calendar Card */}
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setSelectedStudentId(null)}
                          className="p-2 hover:bg-slate-50 rounded-full text-slate-400"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <div>
                          <h2 className="text-lg font-bold text-slate-900">{students.find(s => s.id === selectedStudentId)?.name}</h2>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{format(currentMonth, 'MMMM yyyy')}</p>
                            {selectedStudentId && (
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                {filteredAttendance.length % (students.find(s => s.id === selectedStudentId)?.daysPerMonth || 20)} / {students.find(s => s.id === selectedStudentId)?.daysPerMonth || 20} Days
                              </span>
                            )}
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

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Padding for start of month */}
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {days.map(day => {
                    const isSelected = filteredAttendance.some(a => a.date === format(day, 'yyyy-MM-dd'));
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
                  {filteredAttendance.length === 0 ? (
                    <div className="bg-white p-8 rounded-[2rem] text-center border border-dashed border-slate-300">
                      <Clock size={32} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-400 text-sm">No dates selected yet.</p>
                    </div>
                  ) : (
                    filteredAttendance
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
                  {Math.floor(filteredAttendance.length / (students.find(s => s.id === selectedStudentId)?.daysPerMonth || 20)) === 0 ? (
                    <p className="text-slate-400 text-xs px-2 italic">No cycles completed yet.</p>
                  ) : (
                    Array.from({ length: Math.floor(filteredAttendance.length / (students.find(s => s.id === selectedStudentId)?.daysPerMonth || 20)) }).map((_, i) => (
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
              </div>
            </>
          )}
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
              <>
                {/* Stats Card */}
              <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-200 overflow-hidden relative">
                <div className="relative z-10">
                  <p className="text-slate-400 text-sm font-medium mb-1">{format(new Date(), 'MMMM')} Earnings</p>
                  <h2 className="text-4xl font-bold">৳{totalMonthlyEarnings.toLocaleString()}</h2>
                  <div className="mt-4 flex items-center gap-2 text-green-400 text-sm font-bold">
                    <TrendingUp size={16} />
                    <span>Auto-calculated</span>
                  </div>
                </div>
                <div className="absolute -right-8 -bottom-8 opacity-10">
                  <DollarSign size={160} />
                </div>
              </div>

              {/* Add Salary Form */}
              <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Add Salary Record</h3>
                <form onSubmit={addSalary} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Select Student</label>
                    <select
                      required
                      value={newSalary.studentId}
                      onChange={e => setNewSalary({ ...newSalary, studentId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Choose a student</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Month</label>
                      <select
                        value={newSalary.month}
                        onChange={e => setNewSalary({ ...newSalary, month: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
                      >
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 px-1">Amount</label>
                      <input
                        required
                        type="number"
                        value={newSalary.amount}
                        onChange={e => setNewSalary({ ...newSalary, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-100"
                  >
                    <Plus size={20} />
                    Save Record
                  </button>
                </form>
              </div>

              {/* Salary List */}
              <div className="space-y-6">
                {/* Unpaid Salaries */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider px-2 flex items-center gap-2">
                    <AlertCircle size={14} />
                    Unpaid Salaries (Due)
                  </h3>
                  {salaries.filter(s => s.status === 'unpaid').length === 0 ? (
                    <div className="bg-white p-6 rounded-[2rem] text-center border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs">No unpaid salaries.</p>
                    </div>
                  ) : (
                    salaries.filter(s => s.status === 'unpaid').map(record => (
                      <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border-2 border-red-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                            <DollarSign size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{record.studentName}</p>
                            <p className="text-[10px] text-red-500 uppercase font-bold">৳{record.amount} • {record.month}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => markSalaryAsPaid(record.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-100"
                        >
                          Paid
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Paid Salaries */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-green-600 uppercase tracking-wider px-2 flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    Paid Salaries
                  </h3>
                  {salaries.filter(s => s.status === 'paid').length === 0 ? (
                    <div className="bg-white p-6 rounded-[2rem] text-center border border-dashed border-slate-200">
                      <p className="text-slate-400 text-xs">No paid salaries yet.</p>
                    </div>
                  ) : (
                    salaries.filter(s => s.status === 'paid').map(record => (
                      <div key={record.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{record.studentName}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">৳{record.amount} • {record.month}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteSalary(record.id)}
                          className="text-slate-300 hover:text-red-500 p-2"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* All Time Earnings per Student */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">All Time Earnings</h3>
                  <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200 space-y-4">
                    {students.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center">No students added.</p>
                    ) : (
                      students.map(student => {
                        const total = salaries
                          .filter(s => s.studentId === student.id && s.status === 'paid')
                          .reduce((sum, s) => sum + s.amount, 0);
                        return (
                          <div key={student.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center">
                                <UserIcon size={14} />
                              </div>
                              <p className="text-sm font-bold text-slate-700">{student.name}</p>
                            </div>
                            <p className="text-sm font-black text-blue-600">৳{total.toLocaleString()}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
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
              {!isPremiumUnlocked ? (
                <div className="bg-white p-8 rounded-[2rem] text-center border border-slate-200 shadow-sm">
                  <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp size={32} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Detailed Analytics</h3>
                  <p className="text-slate-500 mb-6 text-sm">Unlock visual reports and monthly trends by watching a quick ad.</p>
                  <button
                    onClick={() => showRewarded(() => setIsPremiumUnlocked(true))}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 mx-auto hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Play size={18} fill="currentColor" />
                    Unlock with Ad
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900">Earnings Trend</h3>
                      <div className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Premium Unlocked</div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                            tickFormatter={(value) => `৳${value}`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`৳${value}`, 'Amount']}
                          />
                          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.amount > 0 ? '#2563eb' : '#e2e8f0'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-slate-900">Student Attendance</h3>
                      <div className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Total Days</div>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={studentAttendanceData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis 
                            type="number"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                          />
                          <YAxis 
                            dataKey="name"
                            type="category"
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} 
                            width={80}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="days" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Records</p>
                      <p className="text-2xl font-bold text-slate-900">{salaries.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Salary</p>
                      <p className="text-2xl font-bold text-slate-900">
                        ৳{salaries.length > 0 ? Math.round(salaries.reduce((s, a) => s + a.amount, 0) / salaries.length) : 0}
                      </p>
                    </div>
                  </div>
                </div>
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
        onClose={() => setIsProfileOpen(false)}
        onUpdate={handleUpdateProfile}
        onBackup={handleBackup}
        onRestore={handleRestore}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(u) => setUser(u)}
      />
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
