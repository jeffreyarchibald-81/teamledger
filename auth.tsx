
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'teamledger-unlocked';

interface AuthContextType {
  isUnlocked: boolean;
  unlockApp: (email: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    // Check localStorage for the unlocked status when the app loads.
    // This provides persistence across browser sessions until cache is cleared.
    try {
      const storedValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return storedValue === 'true';
    } catch (error) {
      console.error("Could not access localStorage:", error);
      return false;
    }
  });

  useEffect(() => {
    // Persist the unlocked status to localStorage whenever it changes.
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, String(isUnlocked));
    } catch (error) {
      console.error("Could not write to localStorage:", error);
    }
  }, [isUnlocked]);

  const unlockApp = async (email: string): Promise<{ success: boolean; message?: string }> => {
    // This function now automatically handles the difference between your
    // local development environment and your live production website.
    // We check the hostname to determine if we are in production.
    const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      // --- PRODUCTION LOGIC ---
      // This code will ONLY run on your live website.
      // It now handles the server-side validation response from FormSpree.
      const FORM_ENDPOINT = "https://formspree.io/f/mdkpoank"; 
      
      try {
        const response = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          console.log('Email submitted successfully to Formspree!');
          setIsUnlocked(true);
          return { success: true };
        }
        
        // If response is not OK, parse the error message from FormSpree.
        const errorData = await response.json();
        const errorMessage = errorData.errors?.[0]?.message || 'An unexpected error occurred. Please try again.';
        console.error('Formspree submission error:', errorData);
        return { success: false, message: errorMessage };
        
      } catch (error) {
        console.error('There was an error submitting the email:', error);
        return { success: false, message: 'Could not connect to the server. Please check your internet connection and try again.' };
      }
    } else {
      // --- DEVELOPMENT LOGIC ---
      // This code will ONLY run on your local machine.
      console.log(`--- DEVELOPMENT MODE: SIMULATING EMAIL CAPTURE ---`);
      console.log(`Email: ${email}`);
      console.log(`In production, this would be sent to your Formspree endpoint.`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    
      // After the appropriate action is taken, unlock the app.
      setIsUnlocked(true);
      return { success: true };
    }
  };

  return (
    <AuthContext.Provider value={{ isUnlocked, unlockApp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
