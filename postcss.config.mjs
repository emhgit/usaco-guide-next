const config = {
  plugins: ["@tailwindcss/postcss"],
  ...(process.env.NODE_ENV === `production` ? [require(`cssnano`)] : []),
};

export default config;
