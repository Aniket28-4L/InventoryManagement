module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef3ff",
          100: "#dbe4ff",
          500: "#3775f6",
          600: "#1f5de0",
          700: "#1849b0",
          800: "#123a8a"
        },
        neutral: {
          25: "#f7f8fa",
          50: "#f4f4f5",
          100: "#e4e7ec",
          200: "#cfd4dc",
          500: "#687182",
          700: "#1d2939",
          900: "#101828"
        }
      },
      boxShadow: {
        soft: "0 6px 18px rgba(16,24,40,0.08)",
        medium: "0 10px 30px rgba(16,24,40,0.12)"
      }
    }
  },
  plugins: []
};


