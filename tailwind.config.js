import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.1', fontWeight: '700' }], // 48px
        h1: ['2.25rem', { lineHeight: '1.15', fontWeight: '700' }], // 36px
        h2: ['1.5rem', { lineHeight: '1.2', fontWeight: '700' }], // 24px
        h3: ['1.25rem', { lineHeight: '1.3', fontWeight: '700' }], // 20px
        base: ['0.9375rem', { lineHeight: '1.5', fontWeight: '400' }], // 15px
        sm: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }], // 14px
        tiny: "0.8125rem", // 13px
        small: "0.875rem", // 14px
        medium: "0.9375rem",    // 15px
        large: "1.0625rem",  // 17px
      },
      colors: {
        primary: {
          DEFAULT: '#6366F1', // Indigo-500
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        secondary: {
          DEFAULT: '#F59E42', // Orange-400
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#F59E42',
          500: '#EA580C',
          600: '#C2410C',
          700: '#9A3412',
          800: '#7C2D12',
          900: '#5A1E0E',
        },
        success: {
          DEFAULT: '#22C55E', // Green-500
        },
        error: {
          DEFAULT: '#EF4444', // Red-500
        },
        warning: {
          DEFAULT: '#F59E42', // Orange-400
        },
        info: {
          DEFAULT: '#3B82F6', // Blue-500
        },
      },
      spacing: {
        px: '1px',
        0: '0px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        14: '56px',
        16: '64px',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale': 'scale 0.2s ease-in-out',
      },
      transitionTimingFunction: {
        'in-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-expo': 'cubic-bezier(0.19, 1, 0.22, 1)',
      },
      boxShadow: {
        'soft-xl': '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
        'soft-md': '0 4px 7px -1px rgba(0, 0, 0, 0.11), 0 2px 4px -1px rgba(0, 0, 0, 0.07)',
        'soft-sm': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'elegant': '0 0 50px 0 rgba(0, 0, 0, 0.1)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-subtle': 'linear-gradient(to right, var(--tw-gradient-stops))',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scale: {
          '0%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      layout: {
        dividerWeight: "1px", 
        disabledOpacity: 0.4,
        fontSize: {
          tiny: "0.8125rem", // 13px
          small: "0.9375rem", // 15px
          medium: "1rem",    // 16px
          large: "1.125rem",  // 18px
        },
        lineHeight: {
          tiny: "1.25rem", 
          small: "1.5rem", 
          medium: "1.75rem", 
          large: "2rem", 
        },
        radius: {
          small: "0.375rem", // 6px
          medium: "0.5rem",  // 8px
          large: "0.75rem",  // 12px
        },
        borderWidth: {
          small: "1px", 
          medium: "1px", 
          large: "1.5px", 
        },
      },
      themes: {
        light: {
          colors: {
            background: {
              DEFAULT: "#FFFFFF",
              foreground: "#11181C"
            },
            foreground: {
              DEFAULT: "#11181C",
              50: "#F8F9FA",
              100: "#ECEEF0",
              200: "#DCE0E4",
              300: "#C6CCD2",
              400: "#96A0AB",
              500: "#6C7884",
              600: "#4C5864",
              700: "#364049",
              800: "#1F252C",
              900: "#11181C"
            },
            primary: {
              50: "#F0F7FF",
              100: "#E0EDFE",
              200: "#B9DAFD",
              300: "#7EB9FB",
              400: "#4B98F7",
              500: "#006FEE",
              600: "#0054D6",
              700: "#0040AB",
              800: "#003180",
              900: "#001F52",
              DEFAULT: "#006FEE",
              foreground: "#FFFFFF"
            },
            success: {
              50: "#F0FDF4",
              100: "#DCFCE7",
              200: "#BBF7D0",
              300: "#86EFAC",
              400: "#4ADE80",
              500: "#22C55E",
              600: "#16A34A",
              700: "#15803D",
              800: "#166534",
              900: "#14532D",
              DEFAULT: "#22C55E",
              foreground: "#FFFFFF"
            },
            warning: {
              50: "#FFFBEB",
              100: "#FEF3C7",
              200: "#FDE68A",
              300: "#FCD34D",
              400: "#FBBF24",
              500: "#F59E0B",
              600: "#D97706",
              700: "#B45309",
              800: "#92400E",
              900: "#78350F",
              DEFAULT: "#F59E0B",
              foreground: "#FFFFFF"
            },
            danger: {
              50: "#FEF2F2",
              100: "#FEE2E2",
              200: "#FECACA",
              300: "#FCA5A5",
              400: "#F87171",
              500: "#EF4444",
              600: "#DC2626",
              700: "#B91C1C",
              800: "#991B1B",
              900: "#7F1D1D",
              DEFAULT: "#EF4444",
              foreground: "#FFFFFF"
            },
            content1: {
              DEFAULT: "#FFFFFF",
              foreground: "#11181C"
            },
            content2: {
              DEFAULT: "#F8F9FA",
              foreground: "#11181C"
            },
            content3: {
              DEFAULT: "#ECEEF0",
              foreground: "#11181C"
            },
            content4: {
              DEFAULT: "#DCE0E4",
              foreground: "#11181C"
            },
            divider: {
              DEFAULT: "#ECEEF0"
            },
            focus: {
              DEFAULT: "#006FEE"
            }
          }
        },
        dark: {
          colors: {
            background: {
              DEFAULT: "#0A0A0A",
              foreground: "#ECEDEE"
            },
            content1: {
              DEFAULT: "#111111",
              foreground: "#ECEDEE"
            },
            content2: {
              DEFAULT: "#191919",
              foreground: "#ECEDEE"
            },
            content3: {
              DEFAULT: "#222222",
              foreground: "#ECEDEE"
            },
            content4: {
              DEFAULT: "#2C2C2C",
              foreground: "#ECEDEE"
            },
            primary: {
              50: "#001731",
              100: "#002e62",
              200: "#004493",
              300: "#005bc4",
              400: "#006FEE",
              500: "#338ef7",
              600: "#66aaf9",
              700: "#99c7fb",
              800: "#cce3fd",
              900: "#e6f1fe",
              DEFAULT: "#338ef7",
              foreground: "#FFFFFF"
            }
          }
        }
      }
    })
  ]
}