
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
// FIX: import Variants to fix framer-motion type errors
import { motion, AnimatePresence, Variants } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Position, PositionInput, PositionUpdate, TreeNode, AIAnalysisResult } from './types';
import { initialData } from './initialData';
import SummaryTable from './components/SummaryTable';
import PositionEditor from './components/PositionEditor';
import OrgChart from './components/OrgChart';
import OrgChartListView from './components/OrgChartListView';
import AIAnalysis from './components/AIAnalysis';
import { useAuth } from './auth';
import StickyHeader from './components/StickyHeader';
import CookieConsent from './components/CookieConsent';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import MobileNotice from './components/MobileNotice';

// --- Local Storage Keys ---
/** Key for storing the user's positions array in local storage. */
const POSITIONS_STORAGE_KEY = 'teamledger-positions';
/** Key for storing global financial settings in local storage. */
const SETTINGS_STORAGE_KEY = 'teamledger-settings';
/** Defines the maximum number of states to keep in the undo history. */
const MAX_HISTORY_SIZE = 30;

/**
 * A custom hook to manage accessibility for modals. It handles:
 * - Trapping focus within the modal.
 * - Closing the modal when the Escape key is pressed.
 * @param isOpen - Boolean indicating if the modal is open.
 * @param onClose - Callback function to close the modal.
 * @param modalRef - A React ref attached to the modal's root element.
 */
const useAccessibilityModal = (isOpen: boolean, onClose: () => void, modalRef: React.RefObject<HTMLElement>) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        const handleFocusTrap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab' || !modalRef.current) return;

            const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleFocusTrap);
        
        // Focus the first focusable element in the modal when it opens
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        firstFocusable?.focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keydown', handleFocusTrap);
        };
    }, [isOpen, onClose, modalRef]);
};


/**
 * Calculates all financial metrics for a given position based on global settings.
 * This is a pure function, central to the application's logic.
 * @param positionInput An object containing the core inputs: salary, rate, and utilization.
 * @param benefitsMultiplier A multiplier for salary to account for benefits, taxes, etc. (e.g., 1.3 for 30%).
 * @param overheadMultiplier A multiplier for total salary to account for operational overhead (e.g., 0.15 for 15%).
 * @param annualBillableHours The total number of billable hours in a year for a fully utilized employee.
 * @returns An object with all calculated financial metrics.
 */
const calculateFinancials = (
  positionInput: { salary: number; rate: number; utilization: number; },
  benefitsMultiplier: number,
  overheadMultiplier: number,
  annualBillableHours: number,
): Pick<Position, 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'> => {
  const totalSalary = positionInput.salary * benefitsMultiplier;
  const overheadCost = totalSalary * overheadMultiplier;
  const totalCost = totalSalary + overheadCost;
  const revenue = positionInput.rate * (positionInput.utilization / 100) * annualBillableHours;
  const profit = revenue - totalCost;
  // Calculate margin as a percentage. Handle cases with no revenue to avoid division by zero.
  const margin = revenue > 0 ? (profit / revenue) * 100 : (totalCost > 0 ? -100 : 0);

  return { totalSalary, overheadCost, totalCost, revenue, profit, margin };
};

// --- SVG Icon Components ---
// These are simple, stateless functional components for rendering icons.
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);
const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);
const QuestionMarkCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
);
const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);
const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-2.22-1.01-4.22-2.63-5.63" />
    </svg>
);
const ArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);
const DocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);
const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);
const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

/**
 * @description The main component for the TeamLedger application.
 * Manages all application state, including positions, financial settings, UI state (modals, views),
 * and handles all data manipulation logic (add, update, delete positions).
 */
const App: React.FC = () => {
  // --- State Management ---
  
  // Authentication state from context. `isUnlocked` controls access to premium features.
  const { isUnlocked } = useAuth();

  // Global financial settings. These are used in the `calculateFinancials` function.
  const [benefitsPercent, setBenefitsPercent] = useState(30);
  const [overheadPercent, setOverheadPercent] = useState(15);
  const [workWeekHours, setWorkWeekHours] = useState(35);

  // Local state for debounced settings inputs to improve INP.
  const [benefitsInput, setBenefitsInput] = useState(String(benefitsPercent));
  const [overheadInput, setOverheadInput] = useState(String(overheadPercent));
  const [workWeekHoursInput, setWorkWeekHoursInput] = useState(String(workWeekHours));
  
  // State for the "Global Overwrites" feature in settings.
  const [globalRate, setGlobalRate] = useState('');
  const [globalUtilization, setGlobalUtilization] = useState('');

  // State for the undo functionality. Stores previous versions of the positions array.
  const [history, setHistory] = useState<Position[][]>([]);
  
  // Core application data: the array of all positions.
  // Initialized from URL params, localStorage, or sample data as a fallback.
  const [positions, setPositions] = useState<Position[]>(() => {
    /** Helper to process raw position data, ensuring `roleType` is set and financials are correct. */
    const processPositions = (positions: any[]): Position[] => {
        return positions.map(p => {
            let position = { ...p };
            // Backwards compatibility: if roleType isn't set, infer it.
            if (!position.roleType) {
                const cSuiteRegex = /^(ceo|coo|cfo|cto|cmo|chief)/i;
                position.roleType = cSuiteRegex.test(position.role) ? 'nonBillable' : 'billable';
            }
            // Ensure non-billable roles have no rate/utilization.
            if (position.roleType === 'nonBillable') {
                position.rate = 0;
                position.utilization = 0;
            }
            return position;
        });
    };

    // 1. Check for data in URL parameters (for sharing).
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            const decodedData = atob(data);
            const parsedPositions = processPositions(JSON.parse(decodedData));
            if (Array.isArray(parsedPositions) && parsedPositions.every(p => 'id' in p && 'role' in p)) {
                window.history.replaceState({}, '', window.location.pathname); // Clean URL after loading
                return parsedPositions;
            }
        } catch (error) {
            console.error("Failed to parse positions from URL, checking localStorage.", error);
        }
    }

    // 2. If no URL data, check local storage (for persistence).
    try {
        const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
        if (savedPositions) {
            const parsed = processPositions(JSON.parse(savedPositions));
            if (Array.isArray(parsed) && parsed.length >= 0) {
                return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to load positions from localStorage, loading sample data.", error);
    }
    
    // 3. If nothing else, load initial sample data.
    return initialData.map(p => {
        const financials = calculateFinancials(p, 1 + 30 / 100, 15 / 100, 35 * 44);
        return { ...p, ...financials };
    });
  });
  
  // --- UI State ---
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newPositionParentId, setNewPositionParentId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'tree' | 'list'>('tree');
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Position | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'disabled'>('idle');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShowingSampleData, setIsShowingSampleData] = useState(false);
  const [isSampleNoticeVisible, setIsSampleNoticeVisible] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  
  // --- Refs for DOM elements ---
  const orgChartRef = useRef<HTMLDivElement>(null);
  const orgStructureRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true); // Prevents autosave on the very first render.
  
  // --- Derived State & Memos ---
  const benefitsMultiplier = useMemo(() => 1 + benefitsPercent / 100, [benefitsPercent]);
  const overheadMultiplier = useMemo(() => overheadPercent / 100, [overheadPercent]);
  const annualBillableHours = useMemo(() => workWeekHours * 44, [workWeekHours]); // Assume 44 billable weeks per year

  /** Memoized hierarchical tree structure derived from the flat `positions` array. */
  const tree = useMemo(() => {
    const buildTree = (items: Position[], parentId: string | null = null, depth = 0): TreeNode[] => {
      return items
        .filter(item => item.managerId === parentId)
        .map(item => ({
          ...item,
          depth,
          children: buildTree(items, item.id, depth + 1),
        }));
    };
    return buildTree(positions);
  }, [positions]);

  // --- Effects ---

  /** Loads global settings from local storage on initial app load. */
  useEffect(() => {
    try {
        const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            const { benefitsPercent, overheadPercent, workWeekHours } = JSON.parse(savedSettings);
            const bp = benefitsPercent || 30;
            const op = overheadPercent || 15;
            const wwh = workWeekHours || 35;
            setBenefitsPercent(bp);
            setOverheadPercent(op);
            setWorkWeekHours(wwh);
            setBenefitsInput(String(bp));
            setOverheadInput(String(op));
            setWorkWeekHoursInput(String(wwh));
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  /** Debounces updates to the global financial settings to improve INP. */
  useEffect(() => {
    const handler = setTimeout(() => {
      const newBenefits = parseFloat(benefitsInput);
      const newOverhead = parseFloat(overheadInput);
      const newWorkWeek = parseFloat(workWeekHoursInput);
      if (!isNaN(newBenefits) && newBenefits !== benefitsPercent) setBenefitsPercent(newBenefits);
      if (!isNaN(newOverhead) && newOverhead !== overheadPercent) setOverheadPercent(newOverhead);
      if (!isNaN(newWorkWeek) && newWorkWeek !== workWeekHours) setWorkWeekHours(newWorkWeek);
    }, 500);
    return () => clearTimeout(handler);
  }, [benefitsInput, overheadInput, workWeekHoursInput]);

  /** Determines if the sample data notice should be shown on initial load. */
  useEffect(() => {
    const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    // If there's no saved data and no data from the URL, we're showing the sample data.
    if (!savedPositions && !data) {
        setIsShowingSampleData(true);
        setIsSampleNoticeVisible(true);
    }
  }, []);

  /** Handles autosaving of positions and settings to local storage when they change. */
  useEffect(() => {
    // Skip autosave on the very first render cycle.
    if (isInitialLoad.current) {
        setAutosaveStatus(isUnlocked ? 'saved' : 'disabled');
        isInitialLoad.current = false;
        return;
    }

    // Autosave is a premium feature.
    if (!isUnlocked) {
        setAutosaveStatus('disabled');
        return;
    }

    setAutosaveStatus('saving');

    // Debounce the save operation to avoid excessive writes.
    const handler = setTimeout(() => {
        try {
            const settingsToSave = JSON.stringify({ benefitsPercent, overheadPercent, workWeekHours });
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, settingsToSave);
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
            setAutosaveStatus('saved');
        } catch (error) {
            console.error("Failed to save to localStorage", error);
            // Optionally set an 'error' status here.
        }
    }, 1000);

    return () => clearTimeout(handler);
  }, [positions, benefitsPercent, overheadPercent, workWeekHours, isUnlocked]);

  /** Recalculates financial data for all positions whenever global settings change. */
  useEffect(() => {
    // Do not run on initial load if we already have calculated data from storage.
    if (isInitialLoad.current) return;

    setPositions(currentPositions =>
        currentPositions.map(p => {
            const financials = calculateFinancials(p, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...p, ...financials };
        })
    );
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours]);

  /** Attaches a scroll listener to show/hide the sticky header. */
  useEffect(() => {
    const handleScroll = () => {
        if (logoRef.current) {
            const { bottom } = logoRef.current.getBoundingClientRect();
            setIsStickyHeaderVisible(bottom <= 0);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /** Manages the visibility of the "Unlock Successful" toast notification. */
  useEffect(() => {
    if (showUnlockToast) {
        const timer = setTimeout(() => setShowUnlockToast(false), 5000);
        return () => clearTimeout(timer);
    }
  }, [showUnlockToast]);

  // --- Data Manipulation Functions ---

  /** Saves the current state to history for the undo feature. */
  const saveStateForUndo = useCallback((currentState: Position[]) => {
    setHistory(prev => {
        const newHistory = [...prev, currentState];
        // Prune the history to prevent it from growing indefinitely.
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, []);

  /** Adds a new position to the state. */
  const addPosition = (positionInput: PositionInput) => {
    saveStateForUndo(positions);
    const financials = calculateFinancials(positionInput, benefitsMultiplier, overheadMultiplier, annualBillableHours);
    const newPosition: Position = {
      id: crypto.randomUUID(),
      ...positionInput,
      ...financials,
    };
    setPositions([...positions, newPosition]);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Updates an existing position in the state. */
  const updatePosition = useCallback((positionUpdate: PositionUpdate) => {
    saveStateForUndo(positions);
    const financials = calculateFinancials(positionUpdate, benefitsMultiplier, overheadMultiplier, annualBillableHours);
    setPositions(currentPositions => currentPositions.map(p =>
      p.id === positionUpdate.id ? { ...p, ...positionUpdate, ...financials } : p
    ));
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours, positions, saveStateForUndo]);

  /** Deletes a position and re-parents its children. */
  const deletePosition = (id: string) => {
    saveStateForUndo(positions);
    setPositions(prev => {
        const positionToDelete = prev.find(p => p.id === id);
        if (!positionToDelete) return prev;
        
        const parentId = positionToDelete.managerId;
        // Filter out the deleted position and update managerId for its direct reports.
        const updatedPositions = prev.filter(p => p.id !== id)
          .map(p => p.managerId === id ? { ...p, managerId: parentId } : p);

        return updatedPositions;
    });
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Clears all positions from the chart. */
  const deleteAllPositions = () => {
    saveStateForUndo(positions);
    setPositions([]);
    setIsDeleteAllConfirmOpen(false);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  /** Loads the default sample data into the application. */
  const loadSampleData = () => {
    saveStateForUndo(positions);
    const recalculatedSampleData = initialData.map(p => {
        const financials = calculateFinancials(p, benefitsMultiplier, overheadMultiplier, annualBillableHours);
        return { ...p, ...financials };
    });
    setPositions(recalculatedSampleData);
    setIsActionMenuOpen(false);
    setIsShowingSampleData(true);
    setIsSampleNoticeVisible(true);
    window.history.pushState({}, '', window.location.pathname); // Clear URL params if any
  };

  /** Applies a global billable rate to all applicable roles. */
  const handleApplyGlobalRate = () => {
    const rateValue = parseFloat(globalRate);
    if (isNaN(rateValue)) return;
    
    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, rate: rateValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalRate('');
  };

  /** Applies a global utilization percentage to all applicable roles. */
  const handleApplyGlobalUtilization = () => {
    const utilValue = parseFloat(globalUtilization);
    if (isNaN(utilValue)) return;

    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, utilization: utilValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalUtilization('');
  };

  /** Reverts the `positions` state to the most recent entry in the history. */
  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setPositions(lastState);
    setHistory(prev => prev.slice(0, prev.length - 1));
    setIsActionMenuOpen(false);
  };

  // --- UI Event Handlers ---

  const handleOpenEditorForNew = (managerId: string | null) => {
    setEditingPosition(null);
    setDuplicateSource(null);
    setNewPositionParentId(managerId);
    setIsEditorOpen(true);
  };
  
  const handleAddRootRole = () => handleOpenEditorForNew(null);
  
  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setDuplicateSource(null);
    setIsEditorOpen(true);
  };

  const handleDuplicatePosition = (position: Position) => {
    setEditingPosition(null);
    setDuplicateSource(position);
    setIsEditorOpen(true);
  };

  /** Callback for the PositionEditor to save data and close the modal. */
  const handleSavePosition = (positionData: PositionInput | PositionUpdate) => {
    if ('id' in positionData) {
      updatePosition(positionData as PositionUpdate);
    } else {
      addPosition(positionData as PositionInput);
    }
    // Reset editor state
    setIsEditorOpen(false);
    setEditingPosition(null);
    setNewPositionParentId(null);
    setDuplicateSource(null);
  };
  
  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPosition(null);
    setDuplicateSource(null);
  };

  /** Generates a shareable link and CSV data for export. */
  const handleExport = (): { link: string; csv: string } => {
    // CSV generation
    const headers = ['Role', 'Salary', 'Total Salary', 'Overhead Cost', 'Rate', 'Utilization', 'Revenue', 'Profit'];
    const headerKeys: (keyof Position)[] = ['role', 'salary', 'totalSalary', 'overheadCost', 'rate', 'utilization', 'revenue', 'profit'];
    const csvRows = [
        headers.join(','),
        ...positions.map(pos => 
            headerKeys.map(header => {
                const value = pos[header];
                if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                return value;
            }).join(',')
        )
    ];
    // Add totals row to CSV
    const totals = positions.reduce((acc, pos) => ({
        salary: acc.salary + pos.salary,
        totalSalary: acc.totalSalary + pos.totalSalary,
        overheadCost: acc.overheadCost + pos.overheadCost,
        revenue: acc.revenue + pos.revenue,
        profit: acc.profit + pos.profit,
    }), { salary: 0, totalSalary: 0, overheadCost: 0, revenue: 0, profit: 0 });
    const totalsRow = ['Totals', totals.salary, totals.totalSalary, totals.overheadCost, '', '', totals.revenue, totals.profit].join(',');
    csvRows.push(totalsRow);
    const csvContent = csvRows.join('\n');
    
    // Shareable link generation
    const dataString = JSON.stringify(positions);
    const encodedData = btoa(dataString);
    const link = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    return { link, csv: csvContent };
  };
  
  /** Handles downloading the org chart as a PNG image. */
  const handleDownloadPng = async () => {
    if (!orgChartRef.current) {
        console.error("Org chart element not found for PNG export.");
        return;
    }
    const element = orgChartRef.current;
    const canvas = await html2canvas(element, {
        backgroundColor: '#161B22',
        scale: 2, // Higher scale for better resolution
        useCORS: true,
        // Ensure the canvas captures the full scrollable area of the chart
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'org-chart.png';
    link.href = image;
    link.click();
  };

  /** Wrapper to handle export click, checking for unlock status. */
  const handleExportClick = () => {
    setIsActionMenuOpen(false);
    if (isUnlocked) {
        setIsExportModalOpen(true);
    } else {
        setIsUnlockModalOpen(true);
    }
  };

  /** Handles the AI analysis request. */
  const handleRunAnalysis = async () => {
    if (!isUnlocked) {
        setIsUnlockModalOpen(true);
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
        // Augment data with direct report counts for better analysis.
        const positionsWithReportCount = positions.map(p => ({
            ...p,
            directReports: positions.filter(r => r.managerId === p.id).length
        }));

        const dataForAnalysis = {
            positions: positionsWithReportCount.map(({ id, managerId, ...rest }) => rest), // Omit IDs for privacy/simplicity
            settings: {
                benefitsPercent,
                overheadPercent,
                workWeekHours,
                annualBillableWeeks: 44,
            }
        };

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataForAnalysis }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }
        
        const analysisResult = await response.json() as AIAnalysisResult;
        setAiAnalysis(analysisResult);

    } catch (error) {
        console.error("AI analysis failed:", error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  /** Smooth scroll handler for the "Get Started" button. */
  const handleGetStartedClick = () => {
    if (orgStructureRef.current) {
        // The sticky header is 64px (h-16). We add extra space for better visual alignment.
        const headerOffset = 80;
        const elementPosition = orgStructureRef.current.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
  };

  // --- Animation Variants ---
  const mainContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  // --- Render ---
  return (
    <div className="min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      {/* The sticky header is rendered conditionally when the user scrolls past the main header. */}
      <AnimatePresence>
        {isStickyHeaderVisible && (
            <StickyHeader
                isUnlocked={isUnlocked}
                isActionMenuOpen={isActionMenuOpen}
                setIsActionMenuOpen={setIsActionMenuOpen}
                onExportClick={handleExportClick}
                onLoadSampleData={loadSampleData}
                onAddRootRole={handleAddRootRole}
                onDeleteAll={() => setIsDeleteAllConfirmOpen(true)}
                onSignInClick={() => setIsUnlockModalOpen(true)}
                autosaveStatus={autosaveStatus}
                onUndo={handleUndo}
                canUndo={history.length > 0}
            />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        {/* --- Hero/Header Section --- */}
        <header className="text-center" style={{ margin: '2rem 0 6rem 0' }}>
            <div ref={logoRef} className="font-parkinsans" style={{ fontSize: '1.5rem', marginBottom: '4.5rem' }}>
                <span className="text-brand-accent">Team</span><span className="text-white">Ledger</span>
            </div>
            <h1 className="font-bold text-white max-w-4xl mx-auto text-4xl sm:text-5xl lg:text-[3.35rem] leading-[1.15] sm:leading-[1.15]">A smarter organizational structure chart maker that helps you grow your business with confidence.</h1>
            <p className="text-gray-300 mt-4 max-w-3xl mx-auto" style={{ fontSize: '1.15rem' }}>
                TeamLedger is a free org chart and financial forecasting tool that combines team structure and financial data. Model your growth, see the impact of every role, and get AI-powered insights to operate with confidence.
            </p>
            <div className="mt-8">
                <motion.button
                    onClick={handleGetStartedClick}
                    className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-soft-glow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Get Started
                </motion.button>
            </div>
        </header>

        {/* --- Main Content --- */}
        <motion.main 
          id="main-content"
          className="space-y-12"
          variants={mainContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* --- Organizational Structure Section --- */}
          <motion.div variants={itemVariants} ref={orgStructureRef}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-semibold">Organizational Structure</h2>
                {/* View switcher: Tree vs. List */}
                <div role="tablist" aria-label="Chart view" className="flex items-center rounded-lg bg-brand-surface p-1 border border-brand-border">
                  <button role="tab" aria-selected={chartView === 'tree'} onClick={() => setChartView('tree')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'tree' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>Tree</button>
                  <button role="tab" aria-selected={chartView === 'list'} onClick={() => setChartView('list')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'list' ? 'bg-brand-accent/80 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>List</button>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="How to use this section"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-border overflow-x-auto relative min-h-[200px]">
              {isShowingSampleData && isSampleNoticeVisible && (
                <div className="absolute top-5 right-5 bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm max-w-xs shadow-lg backdrop-blur-sm z-10">
                  <button
                      onClick={() => setIsSampleNoticeVisible(false)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-800 hover:bg-yellow-700 transition-colors"
                      aria-label="Dismiss notice"
                  >
                      <XIcon className="w-4 h-4 text-yellow-200" />
                  </button>
                  <p>
                    This is a sample org chart. Customize it, or{' '}
                    <button
                      onClick={() => setIsDeleteAllConfirmOpen(true)}
                      className="font-semibold underline hover:text-white transition-colors"
                    >
                      delete it to start from scratch
                    </button>
                    .
                  </p>
                </div>
              )}
              {/* Animated switch between Tree and List views */}
              <AnimatePresence mode="wait">
                  <motion.div
                      key={chartView}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                  >
                  {tree.length > 0 ? (
                    <>
                    {chartView === 'tree' ? (
                      <OrgChart 
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                        captureRef={orgChartRef}
                      />
                    ) : (
                      <OrgChartListView
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                      />
                    )}
                    </>
                  ) : (
                      // Empty state for the org chart
                      <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                          <InformationCircleIcon className="w-16 h-16 text-gray-600 mb-4" />
                          <h3 className="text-lg font-semibold text-white">Your organizational chart is empty.</h3>
                          <p className="mt-2 max-w-sm">Create your first position to get started. A CEO or Founder is a great place to begin.</p>
                          <motion.button 
                              onClick={handleAddRootRole}
                              className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-5 rounded-lg transition-colors duration-200 flex items-center"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                          >
                              <PlusIcon className="w-5 h-5 mr-2" />
                              Add First Role
                          </motion.button>
                      </div>
                  )}
                  </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
          
          {/* --- Financial Breakdown Section --- */}
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Financial Breakdown</h2>
              <motion.button
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  aria-expanded={isSettingsOpen}
                  aria-controls="financial-settings-panel"
                  className="bg-brand-surface hover:bg-gray-800/60 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center border border-brand-border"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                  Settings
                  <motion.div animate={{ rotate: isSettingsOpen ? 180 : 0 }}>
                      <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" />
                  </motion.div>
              </motion.button>
            </div>
            {/* Collapsible settings panel */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  id="financial-settings-panel"
                  initial={{ maxHeight: 0, opacity: 0 }}
                  animate={{ maxHeight: '420px', opacity: 1, transition: { opacity: { duration: 0.3, delay: 0.1 } } }}
                  exit={{ maxHeight: 0, opacity: 0, transition: { opacity: { duration: 0.2 } } }}
                  className="overflow-hidden"
                >
                  <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border mb-4">
                    <h3 className="text-lg font-semibold mb-4 text-white">Global Financial Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      
                      {/* --- Multipliers --- */}
                      <div>
                        <label htmlFor="benefits-percent" className="block text-sm font-medium text-gray-300">Total Salary Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for benefits, taxes, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">Salary +</span>
                          <input type="number" id="benefits-percent" value={benefitsInput} onChange={e => setBenefitsInput(e.target.value)} className="block w-full flex-1 rounded-none bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="overhead-percent" className="block text-sm font-medium text-gray-300">Overhead Cost Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for rent, software, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="overhead-percent" value={overheadInput} onChange={e => setOverheadInput(e.target.value)} className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">% of Total Salary</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="work-week-hours" className="block text-sm font-medium text-gray-300">Work Week (Hours)</label>
                        <p className="mt-1 text-xs text-gray-400">Affects Revenue totals.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="work-week-hours" value={workWeekHoursInput} onChange={e => setWorkWeekHoursInput(e.target.value)} className="block w-full flex-1 rounded-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                        </div>
                      </div>
                      
                      {/* --- Global Overwrites --- */}
                      <div className="md:col-span-2 lg:col-span-3 border-t border-brand-border pt-6 mt-2">
                        <h4 className="text-md font-semibold mb-3 text-white">Global Overwrites</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label htmlFor="global-rate" className="block text-sm font-medium text-gray-300">Global Rate ($/hr)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single rate to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-rate" value={globalRate} onChange={e => setGlobalRate(e.target.value)} placeholder="e.g., 200" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalRate} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalRate}>Apply</button>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="global-utilization" className="block text-sm font-medium text-gray-300">Global Utilization (%)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single utilization to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-utilization" value={globalUtilization} onChange={e => setGlobalUtilization(e.target.value)} placeholder="e.g., 80" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalUtilization} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalUtilization}>Apply</button>
                                </div>
                            </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <SummaryTable 
              positions={positions} 
              onUpdatePosition={updatePosition} 
              onAddSubordinate={handleOpenEditorForNew}
              onEdit={handleEditPosition}
              onDelete={deletePosition}
              onDuplicate={handleDuplicatePosition}
              isUnlocked={isUnlocked}
              onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>
          
          {/* --- AI Analysis Section --- */}
          <motion.div variants={itemVariants}>
            <AIAnalysis
                isUnlocked={isUnlocked}
                onRunAnalysis={handleRunAnalysis}
                analysisResult={aiAnalysis}
                isAnalyzing={isAnalyzing}
                onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>

          {/* --- Content/About Section --- */}
          <motion.div variants={itemVariants} className="pt-16 pb-8">
              <div className="max-w-3xl mx-auto text-left space-y-12">
                  <h2 className="text-3xl font-bold mb-0 text-white text-center">About TeamLedger</h2>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Why use TeamLedger as an organizational structure chart maker?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          Most org chart tools stop at boxes and lines. This one goes further, tying each role to salary, utilization, and overhead so you can see how your structure affects profitability.
                      </p>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          Whether you’re mapping a five-person startup or a fifty-person agency, this organizational structure chart maker gives you the full picture: who reports to whom, what each role costs, and how changes ripple through your financial model.
                      </p>
                  </section>
                  
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">What Does TeamLedger Do?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          With this free organizational structure chart maker, you can:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Build your team structure visually. Create, update, delete, and organize roles into clear hierarchies.</li>
                          <li>Attach financial data. Add salaries, billable rates, and capacity to every seat. Real costs are automatically calculated.</li>
                          <li>Plan future hires. Model “what-if” scenarios before you make your next hire.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          It’s not just an organizational structure chart maker — it’s a planning tool for smarter growth.
                      </p>
                  </section>

                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who is this organizational structure chart maker for?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is great for:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Agency owners who want to balance creative growth with profit.</li>
                          <li>Any service businesses who bill by the hour, or by fixed price.</li>
                          <li>Business consultants who help with structure, growth, and forecasting.</li>
                          <li>Startup founders mapping their first org structure.</li>
                          <li>Operations leaders looking for improved department fiscal understanding.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          If you care about both structure and sustainability, this tool was built for you.
                      </p>
                  </section>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who built TeamLedger?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is a fun project by me, Jeff Archibald. I'm an <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">agency consultant</a> who primarily works with creative firms and service businesses. I used a janky spreadsheet in the past to do this type of work, so I figured I'd try building a nicer web version of it. Tada! This is an MVP I hacked together over a weekend; if you'd like to request some features or whatever, use the Feedback button on the right.
                      </p>
                  </section>
              </div>
          </motion.div>
        </motion.main>
        {/* --- Footer --- */}
        <footer className="text-center pt-8 pb-4 mt-8 border-t border-brand-border/20">
            <p className="text-sm text-gray-400">
                &copy; {new Date().getFullYear()} TeamLedger by <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">Jeff Archibald</a>.
                {' '}|{' '}
                <button onClick={() => setIsPrivacyModalOpen(true)} className="hover:underline">
                    Privacy Policy
                </button>
            </p>
        </footer>
      </div>

      {/* --- Modals & Global UI Components --- */}
      {/* These components are rendered outside the main layout flow and are controlled by state. */}
      
      {/* Position Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <PositionEditor
            onClose={handleCloseEditor}
            onSave={handleSavePosition}
            existingPosition={editingPosition}
            positions={positions}
            parentId={newPositionParentId}
            duplicateSource={duplicateSource}
            isOpen={isEditorOpen}
          />
        )}
      </AnimatePresence>

      {/* Confirm Delete All Modal */}
      <AnimatePresence>
        {isDeleteAllConfirmOpen && (
           <ConfirmDeleteModal 
              isOpen={isDeleteAllConfirmOpen}
              onClose={() => setIsDeleteAllConfirmOpen(false)}
              onConfirm={deleteAllPositions}
           />
        )}
      </AnimatePresence>

      {/* Export/Share Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
           <ExportModal 
              isOpen={isExportModalOpen}
              onClose={() => setIsExportModalOpen(false)}
              onConfirm={handleExport}
              onDownloadPng={handleDownloadPng}
              isPngExportAvailable={chartView === 'tree'}
           />
        )}
      </AnimatePresence>

      {/* Unlock Features Modal */}
      <AnimatePresence>
        {isUnlockModalOpen && (
            <UnlockModal
                isOpen={isUnlockModalOpen} 
                onClose={() => setIsUnlockModalOpen(false)}
                onUnlockSuccess={() => {
                    setIsUnlockModalOpen(false);
                    setShowUnlockToast(true);
                }}
            />
        )}
      </AnimatePresence>
      
      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
            <HelpModal 
                isOpen={isHelpModalOpen}
                onClose={() => setIsHelpModalOpen(false)}
                isShowingSampleData={isShowingSampleData}
            />
        )}
      </AnimatePresence>

      {/* Privacy Policy Modal */}
      <AnimatePresence>
        {isPrivacyModalOpen && (
            <PrivacyPolicyModal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)} />
        )}
      </AnimatePresence>

      {/* Success Toast Notification */}
      <AnimatePresence>
        {showUnlockToast && <SuccessToast />}
      </AnimatePresence>
      
      {/* Cookie Consent Banner */}
      <CookieConsent onPrivacyClick={() => setIsPrivacyModalOpen(true)} />
      
      {/* Mobile Notice Banner */}
      <MobileNotice />
    </div>
  );
};

// --- Sub-components defined within App.tsx for co-location and simplicity ---

/**
 * @description A confirmation modal for the "Delete All" action.
 */
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}
const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };
    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
        >
          <motion.div 
            ref={modalRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-sm"
            variants={modalVariants}
          >
            <div className="p-6">
              <h3 id="delete-modal-title" className="text-xl font-bold text-white">Confirm Deletion</h3>
              <p className="text-gray-400 mt-2">Are you sure you want to delete all positions? This action cannot be undone.</p>
            </div>
            <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete All</motion.button>
            </div>
          </motion.div>
        </motion.div>
    )
}

/**
 * @description A modal that provides quick instructions on how to use the app.
 */
interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
    isShowingSampleData: boolean;
}
const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, isShowingSampleData }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };
    const UserPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.375 19.5h17.25a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-2.25-2.25H3.375a2.25 2.25 0 0 0-2.25 2.25v1.5a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
    const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
    );
    
    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
            onClick={onClose}
        >
            <motion.div 
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-modal-title"
                className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-lg"
                variants={modalVariants}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h3 id="help-modal-title" className="text-xl font-bold text-white">How to Use TeamLedger</h3>
                    {isShowingSampleData && (
                        <div className="mt-4 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm">
                            <p className="font-semibold">You're currently viewing a sample org chart.</p>
                            <p>Feel free to edit these roles, or use the "Actions" menu to delete them all and start fresh.</p>
                        </div>
                    )}
                    <ul className="space-y-3 mt-4 text-gray-300 list-disc list-inside">
                        <li><b>Build your chart:</b> Use the <UserPlusIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> <PencilIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> and <TrashIcon className="w-4 h-4 inline-block -mt-1 mx-1" aria-hidden="true" /> icons on each card to add, edit, or delete roles. The "Actions" menu also allows you to add roles and clear the chart.</li>
                        <li><b>Change views:</b> Toggle between the "Tree" and "List" views to see your structure differently.</li>
                        <li><b>Quick edits:</b> Click on any Role, Salary, Rate, or Utilization value in the Financial Breakdown table to edit it directly.</li>
                        <li><b>Global settings:</b> Adjust the company-wide multipliers for benefits and overhead in the "Settings" section.</li>
                        <li><b>Export & Share:</b> Use the "Actions" menu to get a shareable link or download your data as a PNG or CSV.</li>
                        <li><b>Get insights:</b> Use the AI Analysis section to get a strategic overview of your team structure.</li>
                    </ul>
                </div>
                <div className="bg-gray-900/50 px-6 py-4 flex justify-end rounded-b-lg">
                    <motion.button 
                        onClick={onClose} 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }} 
                        className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Got it!
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * @description Modal for unlocking premium features by providing an email address.
 */
interface UnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUnlockSuccess: () => void;
}
const UnlockModal: React.FC<UnlockModalProps> = ({ isOpen, onClose, onUnlockSuccess }) => {
    const { unlockApp } = useAuth();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [apiError, setApiError] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting'>('idle');
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status !== 'idle' || !email) return;

        // Use a more robust, industry-standard regex for client-side format validation.
        // This is a first line of defense. The ultimate validation (including MX records)
        // is handled by the backend service (FormSpree).
        const emailRegex = new RegExp(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );

        if (!emailRegex.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError('');
        setApiError('');

        setStatus('submitting');
        const result = await unlockApp(email);
        if (result.success) {
            onUnlockSuccess();
        } else {
            setApiError(result.message || 'An unexpected error occurred. Please try again.');
            setStatus('idle');
        }
    };
    
    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden" onClick={onClose}
        >
          <motion.div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlock-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants} onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="px-6 pt-6 pb-4">
                <h3 id="unlock-modal-title" className="text-xl font-bold text-white">Unlock All Features</h3>
                <p className="text-gray-400 mt-2">Get the full picture. Unlock these powerful features by entering your email:</p>
                
                <ul className="space-y-3 mt-4 text-gray-300">
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Automatically save your work to this browser</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Unlock the complete financial breakdown</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Enable sharing & exporting</span></li>
                    <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Get custom AI insights and SWOT on your org structure so you can operate confidently</span></li>
                     <li className="flex items-start"><CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" /><span>Be notified of new feature releases</span></li>
                </ul>
                
                <div className="mt-6">
                  <label htmlFor="unlock-email" className="sr-only">Email Address</label>
                  <input
                      id="unlock-email"
                      type="email" value={email}
                      onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                          if (apiError) setApiError('');
                      }}
                      placeholder="your@email.com" required
                      aria-invalid={!!emailError || !!apiError}
                      aria-describedby="unlock-email-error"
                      className={`w-full bg-white border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-500 focus:ring-2 focus:border-brand-accent ${emailError || apiError ? 'border-red-500 focus:ring-red-500' : 'border-brand-border focus:ring-brand-accent'}`}
                  />
                  {(emailError || apiError) && (
                    <p id="unlock-email-error" className="text-red-400 text-sm mt-1">
                      {emailError || apiError}
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-gray-900/50 px-6 py-4 rounded-b-lg">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-start sm:items-center sm:space-x-4">
                  <motion.button 
                      type="submit" disabled={status === 'submitting' || !email} 
                      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                      className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                      {status === 'submitting' ? 'Unlocking...' : 'Unlock Now'}
                      <SparklesIcon className="w-4 h-4 ml-2" />
                  </motion.button>
                  <motion.button 
                      type="button" whileHover={{ y: -2 }} whileTap={{ y: 0 }} 
                      onClick={onClose} className="text-gray-400 hover:text-white text-sm transition-colors font-semibold py-2 sm:py-0"
                  >
                      Cancel
                  </motion.button>
                </div>
                <p className="text-center text-gray-500 text-xs mt-4">No fees, no spam, and you can unsubscribe at any time.</p>
              </div>
            </form>
          </motion.div>
        </motion.div>
    );
};

/**
 * @description A toast notification that appears on successful app unlock.
 */
const SuccessToast: React.FC = () => {
    return (
        <motion.div
            role="status"
            className="fixed bottom-5 right-5 bg-green-600/90 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center z-[100] backdrop-blur-sm border border-green-500"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-200" />
            <div>
                <p className="font-bold">App Unlocked!</p>
                <p className="text-sm text-green-100">Full features enabled & your work is now autosaved.</p>
            </div>
        </motion.div>
    );
};

/**
 * @description Modal for exporting data as a shareable link, CSV, or PNG.
 */
interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => { link: string; csv: string };
    onDownloadPng: () => Promise<void>;
    isPngExportAvailable: boolean;
}
const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, onConfirm, onDownloadPng, isPngExportAvailable }) => {
    const [shareableLink, setShareableLink] = useState('');
    const [csvData, setCsvData] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isGeneratingPng, setIsGeneratingPng] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    useAccessibilityModal(isOpen, onClose, modalRef);

    // Generate the export data when the modal opens.
    useEffect(() => {
        const { link, csv } = onConfirm();
        setShareableLink(link);
        setCsvData(csv);
    }, [onConfirm]);

    const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2500);
        });
    };

    const handleDownloadCsv = () => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'org-chart.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleDownloadPng = async () => {
        if (!isPngExportAvailable) return;
        setIsGeneratingPng(true);
        try {
            await onDownloadPng();
        } catch (error) {
            console.error("Failed to generate PNG:", error);
        } finally {
            setIsGeneratingPng(false);
        }
    };

    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
        >
          <motion.div 
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants}
          >
            <div className="p-6">
                <div className="text-left">
                    <h3 id="export-modal-title" className="text-xl font-bold text-white">Export & Share</h3>
                    <p className="text-gray-400 mt-2 mb-4">Here are your shareable link and export options.</p>
                    
                    <label htmlFor="shareable-link-input" className="block text-sm font-medium text-gray-300 mb-1">Shareable Link</label>
                    <div className="flex space-x-2">
                        <input
                            id="shareable-link-input"
                            type="text" readOnly value={shareableLink}
                            className="w-full bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                        />
                        <motion.button 
                            onClick={handleCopyLink} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                        </motion.button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {isPngExportAvailable && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadPng} disabled={isGeneratingPng} className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <PhotoIcon className="w-5 h-5 mr-2" />
                                {isGeneratingPng ? 'Generating...' : 'Download PNG'}
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadCsv} className="w-full flex justify-center items-center bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors">
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                            Download CSV
                        </motion.button>
                    </div>
                      <div className="mt-3">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Close
                        </motion.button>
                      </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
    )
}

export default App;
