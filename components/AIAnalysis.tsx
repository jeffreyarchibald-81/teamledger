
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAnalysisResult } from '../types';

/**
 * @interface AIAnalysisProps
 * @description Defines the props for the AIAnalysis component.
 */
interface AIAnalysisProps {
    /** Flag indicating if the AI analysis feature is unlocked. */
    isUnlocked: boolean;
    /** Callback function to trigger the AI analysis process. */
    onRunAnalysis: () => void;
    /** The result of the AI analysis, or null if not yet run or in progress. */
    analysisResult: AIAnalysisResult | null;
    /** Flag indicating if the analysis is currently in progress. */
    isAnalyzing: boolean;
    /** Callback to open the unlock modal if the feature is locked. */
    onUnlockRequest: () => void;
}

// --- Icon Components ---
const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);
const LightBulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.311a7.5 7.5 0 0 1-7.5 0c-1.42 1.408-2.5 3.236-2.5 5.192h12.5c0-1.956-1.08-3.784-2.5-5.192ZM12 10.5a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z" />
    </svg>
);
const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);
const ExclamationTriangleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
);

// --- Constants for Usage Limiting ---
const ANALYSIS_LIMIT_KEY = 'teamledger-ai-analysis-limit';
const DAILY_LIMIT = 3;

/**
 * @description A component that provides an AI-powered analysis of the user's organizational structure.
 * It manages the UI for different states: locked, initial, loading, and results.
 * It also handles a daily usage limit stored in local storage.
 */
const AIAnalysis: React.FC<AIAnalysisProps> = ({ isUnlocked, onRunAnalysis, analysisResult, isAnalyzing, onUnlockRequest }) => {
    const [remainingAnalyses, setRemainingAnalyses] = useState(DAILY_LIMIT);
    const [resetTimeMessage, setResetTimeMessage] = useState('');

    /** Effect to check and set the remaining analysis count from local storage. */
    useEffect(() => {
        if (!isUnlocked) return;

        try {
            const storedData = window.localStorage.getItem(ANALYSIS_LIMIT_KEY);
            if (storedData) {
                const { count, timestamp } = JSON.parse(storedData);
                const today = new Date().toDateString();
                const lastAnalysisDay = new Date(timestamp).toDateString();

                // If the last analysis was on a different day, reset the count.
                if (today !== lastAnalysisDay) {
                    window.localStorage.removeItem(ANALYSIS_LIMIT_KEY);
                    setRemainingAnalyses(DAILY_LIMIT);
                } else {
                    setRemainingAnalyses(Math.max(0, DAILY_LIMIT - count));
                }
            } else {
                setRemainingAnalyses(DAILY_LIMIT);
            }
        } catch (error) {
            console.error("Failed to read analysis limit from localStorage", error);
            setRemainingAnalyses(DAILY_LIMIT);
        }
    }, [isUnlocked]);

    /** Effect to calculate and display the time until the daily limit resets. */
    useEffect(() => {
        let timer: number | null = null;
        if (remainingAnalyses <= 0) {
            const calculateResetTime = () => {
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(0, 0, 0, 0); // Midnight tomorrow
                
                const diffMs = tomorrow.getTime() - now.getTime();
                if (diffMs <= 0) { // If past midnight, reset.
                    setRemainingAnalyses(DAILY_LIMIT);
                    setResetTimeMessage('');
                    window.localStorage.removeItem(ANALYSIS_LIMIT_KEY);
                    if (timer) clearInterval(timer);
                    return;
                }

                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                setResetTimeMessage(`Resets in ${diffHours}h ${diffMinutes}m`);
            };
            
            calculateResetTime();
            timer = setInterval(calculateResetTime, 1000 * 30); // Update every 30 seconds
            
            return () => { if (timer) clearInterval(timer); };
        }
    }, [remainingAnalyses]);

    /**
     * A wrapper for the onRunAnalysis prop that also handles decrementing
     * the daily usage count in local storage.
     */
    const handleProtectedAnalysis = () => {
        if (remainingAnalyses <= 0 || !isUnlocked) return;

        try {
            const storedData = window.localStorage.getItem(ANALYSIS_LIMIT_KEY);
            let currentCount = 0;
            if (storedData) {
                const { count, timestamp } = JSON.parse(storedData);
                if (new Date().toDateString() === new Date(timestamp).toDateString()) {
                    currentCount = count;
                }
            }
            const newCount = currentCount + 1;
            window.localStorage.setItem(ANALYSIS_LIMIT_KEY, JSON.stringify({ count: newCount, timestamp: Date.now() }));
            setRemainingAnalyses(DAILY_LIMIT - newCount);
        } catch (error) {
            console.error("Failed to update analysis limit in localStorage", error);
        }
        onRunAnalysis();
    };

    /** Renders the content of the analysis card based on the current state. */
    const renderContent = () => {
        if (isAnalyzing) return <LoadingState />;
        if (analysisResult) return <ResultsDisplay result={analysisResult} onRerun={handleProtectedAnalysis} remaining={remainingAnalyses} resetTimeMessage={resetTimeMessage} />;
        return <InitialState onAnalyze={handleProtectedAnalysis} remaining={remainingAnalyses} resetTimeMessage={resetTimeMessage} />;
    };

    return (
        <div className="relative">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center">
                    <SparklesIcon className="w-6 h-6 mr-3 text-brand-accent" />
                    AI-Powered Analysis
                </h2>
            </div>
            <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border min-h-[250px] flex flex-col">
                {isUnlocked ? renderContent() : <LockedState onUnlockRequest={onUnlockRequest} />}
            </div>
        </div>
    );
};

// --- Child Components for Different States ---

/** A dummy analysis result used for the blurred background of the locked state. */
const dummyAnalysis: AIAnalysisResult = {
    strengths: ["Strong leadership team with clear reporting lines.", "High utilization in development indicates strong project demand.", "Healthy profit margins on senior roles suggest effective pricing."],
    risks_opportunities: ["Creative Director has a wide span of control, risking bottleneck.", "Opportunity to add a mid-level PM to support Client Services.", "Consider a dedicated QA role to improve development workflow."],
    key_observations: ["Development department is the largest portion of salary cost.", "Client services has lowest average salary but high growth potential.", "2:1 ratio of individual contributors to management."]
};

/** @description The UI state shown when the AI analysis feature is locked. */
const LockedState: React.FC<{ onUnlockRequest: () => void; }> = ({ onUnlockRequest }) => (
    <div className="relative cursor-pointer" onClick={onUnlockRequest}>
        <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
            <div className="grid md:grid-cols-3 gap-6">
                <AnalysisCard title="Strengths" icon={CheckCircleIcon} items={dummyAnalysis.strengths} iconColor="text-white" />
                <AnalysisCard title="Risks & Opportunities" icon={ExclamationTriangleIcon} items={dummyAnalysis.risks_opportunities} iconColor="text-white" />
                <AnalysisCard title="Key Observations" icon={LightBulbIcon} items={dummyAnalysis.key_observations} iconColor="text-white" />
            </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-black/60 rounded-lg p-4">
            <SparklesIcon className="w-8 h-8 text-brand-accent mb-3" />
            <h3 className="text-lg font-bold text-white">Unlock Actionable Insights</h3>
            <p className="text-gray-300 mt-1 max-w-xs">See AI-powered strengths, risks, and opportunities for your team structure.</p>
        </div>
    </div>
);

/** @description The initial UI state before an analysis has been run. */
const InitialState: React.FC<{onAnalyze: () => void; remaining: number; resetTimeMessage: string}> = ({ onAnalyze, remaining, resetTimeMessage }) => {
    const hasAnalysesLeft = remaining > 0;
    const buttonText = !hasAnalysesLeft ? "Daily Limit Reached" : remaining === 1 ? "Run Analysis (1 left)" : "Run Analysis";

    return (
        <div className="text-center flex flex-col items-center justify-center min-h-[250px]">
            <h3 className="text-lg font-semibold text-white">Get instant insights on your org chart</h3>
            <p className="text-gray-300 mt-2 max-w-md mx-auto">Have a custom-trained AI analyze your team's structure, costs, and profitability to find strengths, risks, and opportunities.</p>
            <motion.button 
                onClick={onAnalyze} disabled={!hasAnalysesLeft}
                className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-gray-900 font-bold py-2 px-5 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: hasAnalysesLeft ? 1.05 : 1 }} whileTap={{ scale: hasAnalysesLeft ? 0.95 : 1 }}
            >
                {buttonText}
            </motion.button>
             {!hasAnalysesLeft && resetTimeMessage && <p className="text-sm text-gray-400 mt-3">{resetTimeMessage}</p>}
        </div>
    );
};

/** @description The UI state shown while the analysis is in progress. */
const LoadingState: React.FC = () => (
    <div role="status" className="text-center flex flex-col items-center justify-center min-h-[250px]">
        <motion.div
            aria-label="Loading analysis"
            animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-4 border-t-brand-accent border-gray-700 rounded-full mx-auto"
        />
        <p className="mt-4 text-gray-400">Analyzing your org chart...</p>
        <p className="text-sm text-gray-400">This may take a moment.</p>
    </div>
);

/** @description The UI state for displaying the analysis results. */
const ResultsDisplay: React.FC<{result: AIAnalysisResult; onRerun: () => void; remaining: number; resetTimeMessage: string}> = ({ result, onRerun, remaining, resetTimeMessage }) => {
    const hasAnalysesLeft = remaining > 0;
    const buttonText = !hasAnalysesLeft ? "Daily Limit Reached" : remaining === 1 ? "Re-analyze Chart (1 left)" : "Re-analyze Chart";
    
    return (
    <div aria-live="polite" className="flex-grow flex flex-col">
        <div className="grid md:grid-cols-3 gap-6 flex-grow">
            <AnalysisCard title="Strengths" icon={CheckCircleIcon} items={result.strengths} iconColor="text-white" />
            <AnalysisCard title="Risks & Opportunities" icon={ExclamationTriangleIcon} items={result.risks_opportunities} iconColor="text-white" />
            <AnalysisCard title="Key Observations" icon={LightBulbIcon} items={result.key_observations} iconColor="text-white" />
        </div>
         <div className="text-center mt-8">
            <motion.button 
                onClick={onRerun} disabled={!hasAnalysesLeft}
                className="text-brand-accent hover:text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ y: hasAnalysesLeft ? -2 : 0 }} whileTap={{ y: hasAnalysesLeft ? 0 : 0 }}
            >
                {buttonText}
            </motion.button>
            {!hasAnalysesLeft && resetTimeMessage && <p className="text-sm text-gray-400 mt-2">{resetTimeMessage}</p>}
        </div>
    </div>
    );
};

/** @description A reusable card component to display a list of analysis points. */
interface AnalysisCardProps {
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    items: string[];
    iconColor: string;
}
const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, icon: Icon, items, iconColor }) => (
    <motion.div 
        className="bg-gray-900/50 p-4 rounded-lg border border-brand-border h-full"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
    >
        <div className="flex items-center mb-3">
            <Icon className={`w-6 h-6 mr-3 ${iconColor}`} />
            <h4 className="font-semibold text-white">{title}</h4>
        </div>
        <ul className="space-y-2 list-disc list-inside text-gray-300 text-sm leading-relaxed font-medium">
            {items.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
    </motion.div>
);

export default AIAnalysis;