import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'; // <--- O IMPORT ESSENCIAL
import App from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}