import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { SchoolYear } from "../utils/school-year";
import { getCurrentSchoolYear } from "../utils/school-year";

interface SchoolYearContextType {
  currentSchoolYear: SchoolYear;
  setSchoolYear: (year: SchoolYear) => Promise<void>;
  isLoading: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextType | undefined>(
  undefined,
);

export function SchoolYearProvider({ children }: { children: ReactNode }) {
  const [currentSchoolYear, setCurrentSchoolYear] = useState<SchoolYear>(
    getCurrentSchoolYear(),
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load school year from settings on mount
  useEffect(() => {
    const loadSchoolYear = async () => {
      try {
        if (window.settingsAPI) {
          const savedSchoolYear =
            await window.settingsAPI.getCurrentSchoolYear();
          if (savedSchoolYear) {
            setCurrentSchoolYear(savedSchoolYear);
          }
        }
      } catch (error) {
        console.error("Failed to load school year:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSchoolYear();
  }, []);

  const setSchoolYear = async (year: SchoolYear) => {
    try {
      if (window.settingsAPI) {
        await window.settingsAPI.setCurrentSchoolYear(year);
      }
      setCurrentSchoolYear(year);
    } catch (error) {
      console.error("Failed to save school year:", error);
      throw error;
    }
  };

  return (
    <SchoolYearContext.Provider
      value={{ currentSchoolYear, setSchoolYear, isLoading }}
    >
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (context === undefined) {
    throw new Error("useSchoolYear must be used within a SchoolYearProvider");
  }
  return context;
}
