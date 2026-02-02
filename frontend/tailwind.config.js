/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MSAI Brand Colors
        msai: {
          primary: '#3b82f6',
          secondary: '#10b981',
          accent: '#8b5cf6',
          dark: '#111827',
          light: '#f9fafb',
        },
        // Robot Status Colors
        robot: {
          online: '#10b981',
          offline: '#6b7280',
          busy: '#f59e0b',
          error: '#ef4444',
          maintenance: '#3b82f6',
        },
        // Safety Colors
        safety: {
          critical: '#dc2626',
          warning: '#f59e0b',
          caution: '#eab308',
          normal: '#22c55e',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
