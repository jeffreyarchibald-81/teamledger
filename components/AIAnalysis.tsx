import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIAnalysisResult } from '../types';

interface AIAnalysisProps {
    isUnlocked: boolean;
    onRunAnalysis: () => void;
    analysisResult: AIAnalysisResult | null;
    isAnalyzing: boolean;
    onUnlockRequest: () => void;
}

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


const AIAnalysis: React.FC<AIAnalysisProps> = ({ isUnlocked, onRunAnalysis, analysisResult, isAnalyzing, onUnlockRequest }) => {

    const renderContent = () => {
        if (isAnalyzing) {
            return <div className="flex-grow flex items-center justify-center"><LoadingState /></div>;
        }
        if (analysisResult) {
            return <ResultsDisplay result={analysisResult} onRerun={onRunAnalysis} />;
        }
        return <div className="flex-grow flex items-center justify-center"><InitialState onAnalyze={onRunAnalysis} /></div>;
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
                {isUnlocked ? (
                    renderContent()
                ) : (
                    <LockedState onUnlockRequest={onUnlockRequest} />
                )}
            </div>
        </div>
    );
};

const dummyAnalysis: AIAnalysisResult = {
    strengths: [
        "Strong leadership team with clear reporting lines.",
        "High utilization in development indicates strong project demand.",
        "Healthy profit margins on senior roles suggest effective pricing.",
    ],
    risks_opportunities: [
        "Creative Director has a wide span of control, risking bottleneck.",
        "Opportunity to add a mid-level PM to support Client Services.",
        "Consider a dedicated QA role to improve development workflow.",
    ],
    key_observations: [
        "Development department is the largest portion of salary cost.",
        "Client services has lowest average salary but high growth potential.",
        "2:1 ratio of individual contributors to management.",
    ]
};

const LockedState: React.FC<{ onUnlockRequest: () => void; }> = ({ onUnlockRequest }) => (
    <div className="relative cursor-pointer" onClick={onUnlockRequest}>
        <div className="blur-sm select-none pointer-events-none">
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


const InitialState: React.FC<{onAnalyze: () => void}> = ({ onAnalyze }) => (
    <div className="text-center flex flex-col items-center justify-center min-h-[250px]">
        <h3 className="text-lg font-semibold text-white">Get instant insights on your org chart</h3>
        <p className="text-gray-300 mt-2 max-w-md mx-auto">Have a custom-trained AI analyze your team's structure, costs, and profitability to find strengths, risks, and opportunities.</p>
        <motion.button 
            onClick={onAnalyze}
            className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            Run Analysis
        </motion.button>
    </div>
);

const LoadingState: React.FC = () => (
    <div className="text-center">
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 border-4 border-t-brand-accent border-gray-700 rounded-full mx-auto"
        />
        <p className="mt-4 text-gray-400">Analyzing your org chart...</p>
        <p className="text-sm text-gray-400">This may take a moment.</p>
    </div>
);

const ResultsDisplay: React.FC<{result: AIAnalysisResult; onRerun: () => void}> = ({ result, onRerun }) => (
    <div>
        <div className="grid md:grid-cols-3 gap-6">
            <AnalysisCard title="Strengths" icon={CheckCircleIcon} items={result.strengths} iconColor="text-white" />
            <AnalysisCard title="Risks & Opportunities" icon={ExclamationTriangleIcon} items={result.risks_opportunities} iconColor="text-white" />
            <AnalysisCard title="Key Observations" icon={LightBulbIcon} items={result.key_observations} iconColor="text-white" />
        </div>
         <div className="text-center mt-8">
            <motion.button 
                onClick={onRerun}
                className="text-brand-accent hover:text-white text-sm font-semibold transition-colors"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
            >
                Re-analyze Chart
            </motion.button>
        </div>
    </div>
);


interface AnalysisCardProps {
    title: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    items: string[];
    iconColor: string;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, icon: Icon, items, iconColor }) => (
    <motion.div 
        className="bg-gray-900/50 p-4 rounded-lg border border-brand-border h-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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