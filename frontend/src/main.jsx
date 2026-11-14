import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { MotionConfig } from 'framer-motion';
import { spring } from './utils/motion';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* reducedMotion="user": transforms/layout animations are skipped when the OS asks for less motion */}
    <MotionConfig reducedMotion="user" transition={spring}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
);
