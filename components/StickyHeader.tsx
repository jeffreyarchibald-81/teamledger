
import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Type definition for the possible states of the autosave indicator. */
type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'disabled';

/**
 * @interface StickyHeaderProps
 * @description Defines the props for the StickyHeader component.
 */
interface StickyHeaderProps {
    /** Flag indicating if premium features are unlocked. */
    isUnlocked: boolean;
    /** State for the visibility of the 'Actions' dropdown menu. */
    isActionMenuOpen: boolean;
    /** Function to set the visibility of the 'Actions' dropdown menu. */
    setIsActionMenuOpen: (isOpen: boolean) => void;
    /** Callback for the 'Export & Share' action. */
    onExportClick: () => void;
    /** Callback for the 'Load Sample Data' action. */
    onLoadSampleData: () => void;
    /** Callback to add a new top-level (root) role. */
    onAddRootRole: () => void;
    /** Callback for the 'Delete All' action. */
    onDeleteAll: () => void;
    /** Callback to open the sign-in/unlock modal. */
    onSignInClick: () => void;
    /** The current status of the autosave feature. */
    autosaveStatus: AutosaveStatus;
    /** Callback for the 'Undo' action. */
    onUndo: () => void;
    /** Flag indicating if there is any action to undo. */
    canUndo: boolean;
}

// --- Icons ---
const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);
const UndoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
);
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const NoSymbolIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

/**
 * @interface AutosaveIndicatorProps
 * @description Defines props for the AutosaveIndicator component.
 */
interface AutosaveIndicatorProps {
    /** The current autosave status. */
    status: AutosaveStatus;
    /** An optional click handler, used to trigger the unlock modal when status is 'disabled'. */
    onClick?: () => void;
}

/**
 * @description A small UI component within the header that provides visual feedback
 * on the current autosave status (e.g., "Saving...", "All changes saved", "Autosave off").
 */
const AutosaveIndicator: React.FC<AutosaveIndicatorProps> = ({ status, onClick }) => {
    // Configuration object to map status to UI elements (icon, text, color).
    const statusConfig = {
        saving: { Icon: ArrowPathIcon, text: 'Saving...', color: 'text-gray-400' },
        saved: { Icon: CheckCircleIcon, text: 'All changes saved', color: 'text-gray-400' },
        disabled: { Icon: NoSymbolIcon, text: 'Autosave off', color: 'text-gray-400' },
        idle: { Icon: () => null, text: '', color: '' }
    };

    const currentStatus = statusConfig[status];
    if (status === 'idle') return <div className="w-48 h-5" />; // Reserve space to prevent layout shifts.

    const motionProps = {
        key: status, // Key is crucial for AnimatePresence to detect changes.
        initial: { opacity: 0, y: -5 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 5 },
        transition: { duration: 0.3 }
    };

    const content = (
        <>
            {status === 'saving' ? ( // Special case for a spinning icon.
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <currentStatus.Icon className="w-4 h-4" />
                </motion.div>
            ) : (
                <currentStatus.Icon className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="font-semibold">{currentStatus.text}</span>
        </>
    );

    return (
        <div aria-live="polite" aria-atomic="true" className="w-48 h-5 flex justify-end items-center">
            <AnimatePresence mode="wait">
                {status === 'disabled' ? (
                    <motion.button {...motionProps} onClick={onClick}
                        className={`flex items-center space-x-2 text-sm ${currentStatus.color} transition-opacity hover:opacity-80 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent`}
                        aria-label="Autosave is off. Click to sign in and enable."
                    >
                        {content}
                    </motion.button>
                ) : (
                    <motion.div {...motionProps} className={`flex items-center space-x-2 text-sm ${currentStatus.color}`}>
                        {content}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * @description A header component that becomes visible and sticks to the top of the
 * viewport when the user scrolls past the main page header. It provides quick access
 * to primary actions and shows the autosave status.
 */
const StickyHeader: React.FC<StickyHeaderProps> = ({
    isUnlocked, isActionMenuOpen, setIsActionMenuOpen, onExportClick,
    onLoadSampleData, onAddRootRole, onDeleteAll, onSignInClick,
    autosaveStatus, onUndo, canUndo
}) => {
    const actionMenuRef = useRef<HTMLDivElement>(null);

    // Effect to handle closing the actions menu when clicking outside of it.
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [setIsActionMenuOpen]);

    return (
        <motion.header
            className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#243B55] to-[#141E30] backdrop-blur-md shadow-lg z-50"
            initial={{ y: -100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div className="font-parkinsans text-xl">
                            <span className="text-brand-accent">Team</span><span className="text-white">Ledger</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-4">
                        <AutosaveIndicator status={autosaveStatus} onClick={onSignInClick} />
                        
                        <div className="relative" ref={actionMenuRef}>
                            <motion.button
                                id="actions-menu-button"
                                aria-haspopup="true"
                                aria-expanded={isActionMenuOpen}
                                aria-controls="actions-menu"
                                onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                                className="bg-transparent border border-brand-accent text-brand-accent font-bold py-1.5 px-3 text-sm rounded-lg transition-colors duration-200 flex items-center hover:bg-brand-accent/20"
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            >
                                Actions
                                <motion.div animate={{ rotate: isActionMenuOpen ? 180 : 0 }}>
                                    <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" />
                                </motion.div>
                            </motion.button>
                            <AnimatePresence>
                                {isActionMenuOpen && (
                                    <motion.div
                                        id="actions-menu"
                                        role="menu"
                                        aria-labelledby="actions-menu-button"
                                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-20"
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.15 }}
                                    >
                                        <div className="py-1">
                                            <button onClick={onUndo} disabled={!canUndo} role="menuitem" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                                <UndoIcon className="w-4 h-4 mr-3 text-gray-400" />Undo Last Action
                                            </button>
                                            <div className="border-t border-brand-border my-1"></div>
                                            <button onClick={onExportClick} role="menuitem" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white">
                                                <ArrowUpTrayIcon className="w-4 h-4 mr-3 text-gray-400" />Export & Share
                                            </button>
                                            <button onClick={onLoadSampleData} role="menuitem" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white">
                                                <ArrowPathIcon className="w-4 h-4 mr-3 text-gray-400" />Load Sample Data
                                            </button>
                                            <button onClick={onAddRootRole} role="menuitem" className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 hover:text-white">
                                                <PlusIcon className="w-4 h-4 mr-3 text-gray-400" />Add Role
                                            </button>
                                            <div className="border-t border-brand-border my-1"></div>
                                            <button onClick={() => { onDeleteAll(); setIsActionMenuOpen(false); }} role="menuitem" className="w-full text-left flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                                <TrashIcon className="w-4 h-4 mr-3" />Delete All
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {!isUnlocked && (
                            <motion.button
                                onClick={onSignInClick}
                                className="bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-1.5 px-3 text-sm rounded-lg transition-colors duration-200 flex items-center shadow-soft-glow"
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            >
                                Sign In
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </motion.header>
    );
};

export default StickyHeader;