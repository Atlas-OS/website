/** @type {import('@divriots/jampack').JampackConfig} */
const config = {
  css: {
    inline_critical_css: false,
  },
  image: {
    compress: false,
    embed_size: 0,
    srcset_min_width: 99999,
    src_include: /^$/,
    external: {
      process: 'off',
    },
    cdn: {
      process: 'off',
    },
  },
  misc: {
    prefetch_links: 'off',
  },
};

export default config;
