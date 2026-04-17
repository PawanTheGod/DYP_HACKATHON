import { useAppContext } from '@context/AppContext';

export const useApp = () => {
  const context = useAppContext();
  return context;
};
