import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050505",
            },
            fontFamily: {
                sans: ["Inter", "SF Pro", "sans-serif"],
            },
        },
    },
    plugins: [],
};
export default config;
