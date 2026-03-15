module.exports = {
  ci: {
    collect: {
      startServerCommand: 'yarn start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard/',
        'http://localhost:3000/general/',
        'http://localhost:3000/silver/prefix-sums-2/',
      ],
    },
    assert: {},
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
