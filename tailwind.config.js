/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Backgrounds
                'cyber-bg': '#060617',
                'cyber-panel': '#0E1033',
                'cyber-border': '#24265F',

                // Accents & Data
                'node-file': '#2D7DFF',
                'node-import': '#7C3AED',
                'node-stdlib': '#7F8AB8',
                'cyber-highlight': '#22D3EE',

                // Actions
                'cta-primary': '#00FF00',
                'cta-text': '#04110A',
                'cta-secondary': '#2D7DFF',
            },
            fontFamily: {
                'orbitron': ['Orbitron', 'sans-serif'],
                'rajdhani': ['Rajdhani', 'sans-serif'],
            },
            boxShadow: {
                'glow-blue': '0 0 20px rgba(45, 125, 255, 0.5)',
                'glow-purple': '0 0 20px rgba(124, 58, 237, 0.5)',
                'glow-cyan': '0 0 20px rgba(34, 211, 238, 0.5)',
                'glow-green': '0 0 20px rgba(0, 255, 0, 0.5)',
            },
            backdropBlur: {
                'glass': '12px',
            }
        },
    },
    plugins: [],
}
