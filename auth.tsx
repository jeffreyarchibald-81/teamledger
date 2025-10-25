import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'teamledger-unlocked';

interface AuthContextType {
  isUnlocked: boolean;
  unlockApp: (email: string) => Promise<void>;
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

  const unlockApp = async (email: string) => {
    // This function now automatically handles the difference between your
    // local development environment and your live production website.
    // `process.env.NODE_ENV` is a standard variable that is 'development'
    // when you're testing locally and 'production' on a live site.

    /*
    // TODO: Uncomment this block to re-enable FormSpree for production.
    if (process.env.NODE_ENV === 'production') {
      // --- PRODUCTION LOGIC ---
      // This code will ONLY run on your live website.
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

        if (!response.ok) {
          throw new Error('Failed to submit email.');
        }
        
        console.log('Email submitted successfully to Formspree!');
        
      } catch (error) {
        console.error('There was an error submitting the email:', error);
        // We can still unlock the app locally even if the submission fails,
        // so the user experience isn't broken.
      }
    } else {
      // --- DEVELOPMENT LOGIC ---
      // This code will ONLY run on your local machine.
      console.log(`--- DEVELOPMENT MODE: SIMULATING EMAIL CAPTURE ---`);
      console.log(`Email: ${email}`);
      console.log(`In production, this would be sent to your Formspree endpoint.`);
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay
    }
    */
    
    // --- DEVELOPMENT/DEMO LOGIC ---
    // This code will run on both local machine and production.
    // To enable Formspree on production, comment this block out and uncomment the one above.
    console.log(`--- SIMULATING EMAIL CAPTURE ---`);
    console.log(`Email: ${email}`);
    console.log(`In a full production setup, this would be sent to a service like Formspree.`);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay


    // After the appropriate action is taken, unlock the app.
    setIsUnlocked(true);
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