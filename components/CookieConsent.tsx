import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Key used to store the user's consent in local storage. */
const COOKIE_CONSENT_KEY = 'teamledger-cookie-consent';

/**
 * @interface CookieConsentProps
 * @description Defines the props for the CookieConsent component.
 */
interface CookieConsentProps {
    /** Callback function to open the privacy policy modal. */
    onPrivacyClick: () => void;
}

const CookieIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189-.866-.108-.215-.395-.634-.936-.634-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936.634.13.26.189.568.189.866 0 .298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm-1.82 1.906c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13.26.189.568.189.866 0 .298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Zm-2.49-1.906c-.54 0-.828.419-.936.634a1.96 1.96 0 0 0-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936.634.13.26.189.568.189.866 0 .298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634Z" clipRule="evenodd" />
  </svg>
);

/**
 * @description A component that displays a cookie consent banner to first-time visitors.
 * It starts as a small icon and expands into a full banner on click.
 * The user's consent is stored in local storage to prevent it from appearing again.
 */
const CookieConsent: React.FC<CookieConsentProps> = ({ onPrivacyClick }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    /** Effect to check if consent has already been given. */
    useEffect(() => {
        try {
            const consentGiven = window.localStorage.getItem(COOKIE_CONSENT_KEY);
            if (!consentGiven) {
                // Use a timeout to avoid layout shift and be less intrusive on initial load.
                const timer = setTimeout(() => setIsVisible(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch (error) {
            console.error("Could not access localStorage for cookie consent:", error);
        }
    }, []);

    /** Handles accepting the consent and hiding the banner permanently. */
    const handleAccept = () => {
        try {
            window.localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
            setIsVisible(false);
        } catch (error) {
            console.error("Could not write to localStorage for cookie consent:", error);
            // Still hide the banner for the current session even if storage fails.
            setIsVisible(false);
        }
    };

    /** Expands the banner from the small icon view. */
    const handleIconClick = () => {
        setIsExpanded(true);
    };

    return (
        <AnimatePresence>
            {/* Collapsed icon view */}
            {isVisible && !isExpanded && (
                 <motion.button
                    onClick={handleIconClick}
                    className="fixed bottom-4 left-4 bg-yellow-900/60 border border-yellow-700 rounded-full shadow-soft-glow-lg p-3 z-[98] backdrop-blur-sm"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    aria-label="Manage cookie consent"
                    whileHover={{ scale: 1.1, rotate: 15 }}
                 >
                    <CookieIcon className="w-6 h-6 text-yellow-200" />
                 </motion.button>
            )}
            {/* Expanded banner view */}
            {isVisible && isExpanded && (
                <motion.div
                    className="fixed bottom-4 left-4 bg-brand-surface/80 backdrop-blur-md border border-brand-border rounded-lg shadow-soft-glow-lg p-4 max-w-sm z-[99]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                    <p className="text-sm text-gray-300">
                        This site uses cookies and local storage to save your work and enhance your experience. By continuing, you agree to our use of these technologies. Learn more in our{' '}
                        <button onClick={onPrivacyClick} className="font-semibold underline hover:text-brand-accent transition-colors">
                            Privacy Policy
                        </button>.
                    </p>
                    <button
                        onClick={handleAccept}
                        className="mt-3 w-full bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                        Got it!
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CookieConsent;
