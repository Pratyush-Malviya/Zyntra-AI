import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
    cssVarPrefix: 'chakra',
  },
  colors: {
    brand: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
    accent: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#0f0f18',
    },
  },
  fonts: {
    heading: "'Inter', -apple-system, system-ui, sans-serif",
    body: "'Inter', -apple-system, system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSizes: {
    '2xs': '0.625rem',
    xs: '0.75rem',
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
    '2xl': '1.25rem',
    '3xl': '1.5rem',
    '4xl': '1.875rem',
    '5xl': '2.25rem',
  },
  space: {
    '0.5': '0.125rem',
    '1': '0.25rem',
    '1.5': '0.375rem',
    '2': '0.5rem',
    '2.5': '0.625rem',
    '3': '0.75rem',
    '3.5': '0.875rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '7': '1.75rem',
    '8': '2rem',
    '9': '2.25rem',
    '10': '2.5rem',
    '12': '3rem',
    '14': '3.5rem',
    '16': '4rem',
  },
  radii: {
    none: '0',
    sm: '6px',
    base: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,0.05)',
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
    lg: '0 10px 15px rgba(0,0,0,0.05), 0 4px 6px rgba(0,0,0,0.04)',
    xl: '0 20px 25px rgba(0,0,0,0.05), 0 10px 10px rgba(0,0,0,0.03)',
  },
  styles: {
    global: (props: { colorMode: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? '#07070d' : '#f5f5f7',
        color: props.colorMode === 'dark' ? '#f1f5f9' : '#111827',
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: '8px',
      },
      sizes: {
        sm: { px: 3, py: 1.5, fontSize: 'sm' },
        md: { px: 4, py: 2, fontSize: 'sm' },
        lg: { px: 5, py: 2.5, fontSize: 'md' },
      },
      defaultProps: {
        colorScheme: 'brand',
        size: 'sm',
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: '8px',
        },
      },
      defaultProps: {
        focusBorderColor: 'brand.400',
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderRadius: '8px',
        },
      },
      defaultProps: {
        focusBorderColor: 'brand.400',
      },
    },
    Textarea: {
      baseStyle: {
        borderRadius: '8px',
      },
      defaultProps: {
        focusBorderColor: 'brand.400',
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: '6px',
        fontWeight: '500',
        textTransform: 'none',
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '12px',
          borderWidth: '1px',
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '16px',
        },
      },
    },
    Menu: {
      baseStyle: {
        list: {
          borderRadius: '12px',
          borderWidth: '1px',
          boxShadow: 'lg',
          py: 1,
        },
        item: {
          borderRadius: '6px',
          mx: 1,
          fontWeight: '500',
        },
      },
    },
    Tabs: {
      baseStyle: {
        tab: {
          fontWeight: '500',
          borderRadius: '8px',
          _selected: {
            color: 'brand.400',
          },
        },
      },
    },
    Tooltip: {
      baseStyle: {
        borderRadius: '6px',
        fontWeight: '500',
        px: 2.5,
        py: 1.5,
      },
    },
  },
});

export default theme;
