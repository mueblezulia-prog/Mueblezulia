/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta de marca — tema oscuro elegante, estática (NUNCA se extrae de fotos)
        carbon: {
          DEFAULT: "#1E1E1E", // fondo principal
          light: "#2A2A2A",   // tarjetas / superficies
          border: "#3A3A3A",  // bordes sutiles
        },
        gold: {
          DEFAULT: "#F2B90C", // acento principal / botones primarios
          hover: "#D9A70A",
        },
        terracota: "#C1440E", // acento secundario (usado en el sitio actual)
        ink: {
          DEFAULT: "#FFFFFF", // texto principal
          muted: "#8C8C8C",   // texto secundario / descripciones
        },
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      fontSize: {
        // Escala pensada para 45+: nunca bajar de 16px en texto de lectura
        base: ["16px", "24px"],
        lg: ["18px", "26px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
        "3xl": ["30px", "38px"],
        price: ["28px", "34px"],
      },
      minHeight: {
        tap: "48px", // objetivo táctil mínimo cómodo para adultos 45+
      },
    },
  },
  plugins: [],
};
