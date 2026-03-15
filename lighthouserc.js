module.exports = {
  ci: {
    collect: {
      startServerCommand: 'yarn start',
      url: [
        'http://localhost/',
        'http://localhost/dashboard/',
        'http://localhost/general/',
        'http://localhost/silver/prefix-sums-2/',
      ],
    },
    assert: {},
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
