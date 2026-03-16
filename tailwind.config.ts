import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class', // <--- Isto é o que faz o Dark Mode funcionar com o nosso botão
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;