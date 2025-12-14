import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3000,
        strictPort: true,
        host: true,
    },
    build: {
        // Enable minification with terser for smaller bundle
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true, // Remove console.log in production
                drop_debugger: true,
            },
        },
        // Code splitting configuration
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks for better caching
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['framer-motion', 'lucide-react', 'recharts'],
                    'vendor-supabase': ['@supabase/supabase-js'],
                    'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
                    'vendor-docx': ['docxtemplater', 'pizzip', 'file-saver'],
                },
            },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Enable source maps for debugging (disable in production if needed)
        sourcemap: false,
    },
    // Optimize dependencies
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-router-dom',
            '@supabase/supabase-js',
            'framer-motion',
            'lucide-react',
        ],
    },
})
